import { PermissionFlagsBits } from 'discord.js';
import { query } from '../database/db.js';
import { ensureGuild } from './guildService.js';
import { setupRules, getRules, saveRulesPanel, updateRulesBanner } from './rulesService.js';
import { saveTicketSettings, setTicketPanel } from './ticketService.js';
import { setupServerInfo, saveServerInfoPanel, updateServerInfoField, updateServerInfoBanner } from './serverInfoService.js';
import { saveIntroductionSettings, setIntroductionPanelMessage, DEFAULT_INTRODUCTION_TEMPLATE } from './introductionService.js';
import { saveTruthOrDareSettings, saveTruthOrDarePanel } from './truthOrDareService.js';
import { saveTempVoiceSettings, saveTempVoicePanel } from './tempVoiceService.js';
import { saveBumpPanel, setBumpPanelMessage } from './bumpService.js';
import { createReactionRolePanel, addReactionRoleOption, setReactionRolePanelMessage, getReactionRolePanels, deleteReactionRolePanel } from './reactionRoleService.js';
import { setConfessionChannel } from './confessionService.js';

// How far back to read in each channel before giving up. Panels usually sit near the top of a
// quiet channel, but a busy one can bury them, so this is generous and overridable.
const DEFAULT_MESSAGE_LIMIT = 2000;

// Every panel Yachiyo publishes carries stable component custom IDs. When the database is empty
// those IDs are the only thing that still identifies a message as ours, so they are the fingerprints
// the scanner matches on. `restore` writes the row back and returns a short human-readable note.
const PANEL_KINDS = [
  {
    key: 'rules',
    label: 'Rule Book',
    matches: ids => ids.includes('rules_section_select'),
    async restore({ guildId, channelId, message }) {
      await setupRules(guildId, channelId);
      await saveRulesPanel(guildId, message.id);
      // The select menu lists every section as "007 · Some title", so numbers and titles come back.
      // The bodies were only ever rendered on click, so seeded defaults stand in until an admin edits them.
      const existing = new Map((await getRules(guildId))?.sections?.map(row => [row.section_number, row.content]) ?? []);
      let titles = 0;
      for (const option of readSelectOptions(message, 'rules_section_select')) {
        const match = /^(\d+)\s*·\s*(.+)$/.exec(option.label ?? '');
        if (!match) continue;
        const number = Number(match[1]);
        const content = existing.get(number) ?? 'This section’s text was lost when the database was reset. Use /rules-edit to restore it.';
        await query(
          `INSERT INTO rules_sections (guild_id, section_number, title, content) VALUES ($1,$2,$3,$4)
           ON CONFLICT (guild_id, section_number) DO UPDATE SET title=EXCLUDED.title`,
          [guildId, number, match[2], content],
        );
        titles++;
      }
      const banner = message.embeds?.[0]?.image?.url ?? null;
      if (banner) await updateRulesBanner(guildId, banner);
      return `${titles} section title(s)${banner ? ' + banner' : ''} — section bodies need re-entering`;
    },
  },
  {
    key: 'ticket',
    label: 'Ticket panel',
    matches: ids => ids.includes('ticket_category_select'),
    async restore({ guildId, channelId, message, channel }) {
      // Ticket channels are created inside the panel channel's category when one exists.
      await saveTicketSettings(guildId, channelId, channel.parentId ?? null);
      await setTicketPanel(guildId, message.id);
      return channel.parentId ? 'panel + ticket category' : 'panel (category not detected)';
    },
  },
  {
    key: 'server_info',
    label: 'Server Info hub',
    matches: ids => ids.includes('server_info_profile') || ids.includes('server_info_bot') || ids.includes('server_info_staffs'),
    async restore({ guildId, channelId, message }) {
      await setupServerInfo(guildId, channelId);
      await saveServerInfoPanel(guildId, message.id);
      const embed = message.embeds?.[0];
      const recovered = [];
      if (embed?.title) { await updateServerInfoField(guildId, 'title', embed.title); recovered.push('title'); }
      if (embed?.description) { await updateServerInfoField(guildId, 'description', embed.description); recovered.push('description'); }
      if (embed?.image?.url) { await updateServerInfoBanner(guildId, embed.image.url); recovered.push('banner'); }
      return recovered.length ? recovered.join(' + ') : 'panel only';
    },
  },
  {
    key: 'introduction',
    label: 'Introduction panel',
    matches: ids => ids.includes('introduction_submit'),
    async restore({ guildId, channelId, message }) {
      const embed = message.embeds?.[0];
      await saveIntroductionSettings({
        guildId,
        channelId,
        template: DEFAULT_INTRODUCTION_TEMPLATE,
        panelTitle: embed?.title ?? 'Introductions',
        panelMessage: embed?.description ?? '',
        rewardRoleId: null,
      });
      await setIntroductionPanelMessage(guildId, message.id);
      return 'panel + title/message (template reset to default, reward role not recoverable)';
    },
  },
  {
    key: 'truth_or_dare',
    label: 'Truth or Dare panel',
    matches: ids => ids.includes('tod_truth') || ids.includes('tod_dare') || ids.includes('tod_random'),
    async restore({ guildId, channelId, message }) {
      await saveTruthOrDareSettings(guildId, channelId);
      await saveTruthOrDarePanel(guildId, message.id);
      return 'panel';
    },
  },
  {
    key: 'temp_voice',
    label: 'Temp voice panel',
    matches: ids => ids.includes('temp_vc_create'),
    async restore({ guildId, channelId, message, channel }) {
      await saveTempVoiceSettings(guildId, channelId, channel.parentId ?? null);
      await saveTempVoicePanel(guildId, message.id);
      return channel.parentId ? 'panel + category' : 'panel (category not detected)';
    },
  },
  {
    key: 'bump',
    label: 'Bump panel',
    matches: ids => ids.includes('bump_my_status') || ids.includes('bump_remind'),
    async restore({ guildId, channelId, message }) {
      await saveBumpPanel(guildId, channelId);
      await setBumpPanelMessage(guildId, message.id);
      return 'panel';
    },
  },
  {
    key: 'confession',
    label: 'Confession panel',
    matches: ids => ids.includes('confession_submit'),
    async restore({ guildId, channelId }) {
      await setConfessionChannel(guildId, channelId);
      return 'confession channel';
    },
  },
  {
    key: 'reaction_role',
    // Reaction-role panels are the one case where several can exist per guild, so they are matched
    // and restored individually rather than collapsed to a single newest message.
    label: 'Reaction role panel',
    multiple: true,
    matches: ids => ids.some(id => id.startsWith('rr_role:')),
    async restore({ guildId, channelId, message }) {
      const embed = message.embeds?.[0];
      // Unlike the single-instance panels, these INSERT rather than upsert, so a second run would
      // pile up duplicates. Drop any panel already pointing at this message and rebuild it cleanly.
      for (const existing of await getReactionRolePanels(guildId)) {
        if (existing.message_id === message.id) await deleteReactionRolePanel(existing.id, guildId);
      }
      const panel = await createReactionRolePanel(
        guildId,
        channelId,
        embed?.title ?? 'Reaction Roles',
        embed?.description ?? '',
        embed?.color ?? 15902919,
      );
      let options = 0;
      for (const component of walkComponents(message)) {
        if (!component.customId?.startsWith('rr_role:')) continue;
        const roleId = component.customId.split(':')[2];
        if (!roleId) continue;
        await addReactionRoleOption(panel.id, roleId, formatEmoji(component.emoji));
        options++;
      }
      await setReactionRolePanelMessage(panel.id, message.id);
      return `${options} role option(s)`;
    },
  },
];

function* walkComponents(message) {
  const stack = [...(message.components ?? [])];
  while (stack.length) {
    const component = stack.pop();
    if (!component) continue;
    if (Array.isArray(component.components)) stack.push(...component.components);
    if (component.customId) yield component;
  }
}

function componentIds(message) {
  return [...walkComponents(message)].map(component => component.customId);
}

function readSelectOptions(message, customId) {
  for (const component of walkComponents(message)) {
    if (component.customId === customId && Array.isArray(component.options)) return component.options;
  }
  return [];
}

function formatEmoji(emoji) {
  if (!emoji) return '❔';
  if (emoji.id) return `<${emoji.animated ? 'a' : ''}:${emoji.name ?? 'emoji'}:${emoji.id}>`;
  return emoji.name ?? '❔';
}

/**
 * Read every channel Yachiyo can see and find the panels she published before the database was lost.
 * Nothing is written here — the result is a preview you can show before committing to a restore.
 */
export async function scanGuildForRecovery(guild, { messageLimit = DEFAULT_MESSAGE_LIMIT, onProgress } = {}) {
  const me = guild.members.me ?? await guild.members.fetchMe().catch(() => null);
  const readable = [...guild.channels.cache.values()].filter(channel =>
    channel.isTextBased?.() &&
    channel.messages?.fetch &&
    me && channel.permissionsFor(me)?.has(PermissionFlagsBits.ViewChannel) &&
    channel.permissionsFor(me)?.has(PermissionFlagsBits.ReadMessageHistory));

  const found = new Map();
  let messagesScanned = 0;
  let channelsScanned = 0;

  for (const channel of readable) {
    channelsScanned++;
    onProgress?.({ channel: channel.name, channelsScanned, total: readable.length });
    let before;
    let seenInChannel = 0;
    while (seenInChannel < messageLimit) {
      const batch = await channel.messages.fetch({ limit: 100, before }).catch(() => null);
      if (!batch?.size) break;
      for (const message of batch.values()) {
        seenInChannel++;
        messagesScanned++;
        if (message.author?.id !== guild.client.user?.id) continue;
        if (!message.components?.length) continue;
        const ids = componentIds(message);
        if (!ids.length) continue;
        for (const kind of PANEL_KINDS) {
          if (!kind.matches(ids)) continue;
          const entry = { kind, channel, channelId: channel.id, message, messageId: message.id, createdAt: message.createdAt };
          if (kind.multiple) {
            found.set(`${kind.key}:${message.id}`, entry);
          } else {
            // Keep only the newest panel of each kind — older ones are abandoned copies.
            const existing = found.get(kind.key);
            if (!existing || BigInt(message.id) > BigInt(existing.messageId)) found.set(kind.key, entry);
          }
        }
      }
      if (batch.size < 100) break;
      before = batch.last().id;
    }
  }

  return {
    channelsScanned,
    messagesScanned,
    findings: [...found.values()].sort((a, b) => a.kind.label.localeCompare(b.kind.label)),
  };
}

/** Write the scanned panels back into the database. Safe to run more than once. */
export async function applyRecovery(guild, scan) {
  await ensureGuild(guild.id);
  const restored = [];
  const failed = [];
  for (const finding of scan.findings) {
    try {
      const note = await finding.kind.restore({
        guildId: guild.id,
        channelId: finding.channelId,
        channel: finding.channel,
        message: finding.message,
      });
      restored.push({ label: finding.kind.label, channelId: finding.channelId, messageId: finding.messageId, note });
    } catch (error) {
      failed.push({ label: finding.kind.label, reason: error?.message ?? String(error) });
    }
  }
  return { restored, failed };
}

/** Convenience wrapper: scan, then immediately restore. */
export async function recoverGuild(guild, options = {}) {
  const scan = await scanGuildForRecovery(guild, options);
  const result = await applyRecovery(guild, scan);
  return { ...scan, ...result };
}

/**
 * Things that only ever existed in the database. Discord never stored them in a form we can read
 * back, so a scan cannot return them — surfaced so the report is honest about the gap.
 */
export const UNRECOVERABLE = [
  'Economy balances, bank capacity, and transaction history',
  'Fishing inventories, rods, items, catches, and market supply',
  'Chat XP, levels, and voice activity time',
  'Curse and spam warning counts',
  'Quiz sessions, questions, and scores',
  'Confession authorship (the posts survive, but who wrote them does not)',
  'Moderation case history, unless your audit-log channel still holds the entries',
  'Ticket subjects and access roles, and shop items and purchases',
];
