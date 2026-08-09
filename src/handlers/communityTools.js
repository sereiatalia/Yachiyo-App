import { PermissionFlagsBits } from 'discord.js';
import {
  getIntroductionSettings,
  saveIntroductionSettings,
  setIntroductionPanelMessageId,
  incrementIntroductionUsage
} from '../services/communityToolsService.js';
import { buildIntroductionPanel, buildIntroductionTemplateReply } from '../ui/communityTools.js';

const panelTimers = new Map();

function isCommunityStaff(member) {
  return Boolean(member?.permissions?.has(PermissionFlagsBits.Administrator)
    || member?.permissions?.has(PermissionFlagsBits.ManageGuild)
    || member?.permissions?.has(PermissionFlagsBits.ManageMessages));
}

export async function ensureIntroductionPanel(guild) {
  const settings = await getIntroductionSettings(guild.id);
  if (!settings.intro_channel_id) return null;
  const channel = await guild.channels.fetch(settings.intro_channel_id).catch(() => null);
  if (!channel?.isTextBased()) return null;
  if (settings.intro_panel_message_id) {
    const previous = await channel.messages.fetch(settings.intro_panel_message_id).catch(() => null);
    if (previous?.author?.id === guild.client.user.id) await previous.delete().catch(() => {});
  }
  const panel = await channel.send(buildIntroductionPanel(settings));
  await setIntroductionPanelMessageId(guild.id, panel.id);
  return panel;
}

export function scheduleIntroductionPanelRefresh(guild) {
  const existing = panelTimers.get(guild.id);
  if (existing) clearTimeout(existing);
  const timer = setTimeout(() => {
    panelTimers.delete(guild.id);
    ensureIntroductionPanel(guild).catch(console.error);
  }, 3000);
  timer.unref?.();
  panelTimers.set(guild.id, timer);
}

export async function handleIntroductionMessage(message) {
  if (!message.guild || message.author.bot) return null;
  const settings = await getIntroductionSettings(message.guild.id);
  if (settings.intro_channel_id !== message.channel.id) return null;
  scheduleIntroductionPanelRefresh(message.guild);
  if (!isCommunityStaff(message.member)) {
    const count = await incrementIntroductionUsage(message.guild.id, message.author.id);
    if (count > settings.intro_message_limit) {
      const warning = await message.reply(
        '୨୧ You’ve reached the ' + settings.intro_message_limit + '-message introduction limit. Please edit your introduction instead of sending another message.'
      ).catch(() => null);
      if (warning) {
        const timeout = setTimeout(() => warning.delete().catch(() => {}), 8000);
        timeout.unref?.();
      }
    }
  }
  return { isIntroductionChannel: true };
}

export async function handleIntroductionButton(interaction) {
  if (!interaction.isButton() || interaction.customId !== 'intro_template') return false;
  const settings = await getIntroductionSettings(interaction.guildId);
  await interaction.reply(buildIntroductionTemplateReply(settings, interaction.user.username));
  return true;
}

export async function updateIntroductionPanel(guildId, updates) {
  return saveIntroductionSettings(guildId, updates);
}