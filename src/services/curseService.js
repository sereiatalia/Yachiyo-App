import { query } from '../database/db.js';
import { ensureGuild } from './guildService.js';
import { sendAuditLog } from './auditService.js';

const cleanWords = words => [...new Set(words
  .split(/[\n,]+/)
  .map(word => word.trim().toLocaleLowerCase())
  .filter(Boolean))].slice(0, 500);

function matches(message, word) {
  // Unicode-aware boundaries support English and non-Latin languages without
  // censoring harmless words that merely contain the same letters.
  try { return new RegExp(`(?:^|[^\\p{L}\\p{N}_])${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=$|[^\\p{L}\\p{N}_])`, 'iu').test(message); }
  catch { return message.toLocaleLowerCase().includes(word); }
}

export async function configureCurseFilter(guildId, { enabled, words }) {
  await ensureGuild(guildId);
  const current = (await query('SELECT curse_words FROM guild_settings WHERE guild_id=$1', [guildId])).rows[0]?.curse_words || [];
  const nextWords = words === undefined ? current : cleanWords(words);
  const nextEnabled = enabled === undefined ? true : enabled;
  await query('UPDATE guild_settings SET curse_filter_enabled=$1, curse_words=$2, updated_at=NOW() WHERE guild_id=$3', [nextEnabled, JSON.stringify(nextWords), guildId]);
  return { enabled: nextEnabled, words: nextWords };
}

export async function getCurseFilter(guildId) {
  await ensureGuild(guildId);
  const row = (await query('SELECT curse_filter_enabled, curse_words FROM guild_settings WHERE guild_id=$1', [guildId])).rows[0];
  return { enabled: row?.curse_filter_enabled === true, words: row?.curse_words || [] };
}

export async function checkCurseMessage(client, message) {
  if (!message.guild || message.author?.bot || !message.content) return false;
  const filter = await getCurseFilter(message.guild.id);
  if (!filter.enabled || !filter.words.length) return false;
  const word = filter.words.find(candidate => matches(message.content, candidate));
  if (!word) return false;

  await message.delete().catch(() => null);
  const count = (await query('SELECT COUNT(*)::int AS count FROM curse_warnings WHERE guild_id=$1 AND user_id=$2 AND word=$3', [message.guild.id, message.author.id, word])).rows[0].count + 1;
  await query('INSERT INTO curse_warnings (guild_id,user_id,word,message_id,channel_id) VALUES ($1,$2,$3,$4,$5)', [message.guild.id, message.author.id, word, message.id, message.channelId]);

  const timedOut = count >= 3;
  if (timedOut) {
    const member = await message.guild.members.fetch(message.author.id).catch(() => null);
    if (member?.moderatable) await member.timeout(60_000, `Curse filter: 3 warnings for “${word}”`); 
  }

  await sendAuditLog(client, message.guild, {
    eventType: timedOut ? 'moderation.curse-timeout' : 'moderation.curse-warning',
    actorId: message.author.id,
    targetId: message.author.id,
    data: { summary: `${timedOut ? 'Timed out for 1 minute after 3 warnings' : 'Curse warning'}: ${message.author.tag} used “${word}” in <#${message.channelId}>. Warning ${Math.min(count, 3)}/3.`, word, warningNumber: count, channelId: message.channelId }
  });

  await message.channel.send({ content: `⚠️ <@${message.author.id}>, your message was removed because it contained **${word}**. Warning **${Math.min(count, 3)}/3** for this word.${timedOut ? '\n⏱️ Three warnings for this word caused a **1-minute timeout**.' : ''}` }).catch(() => null);
  return true;
}
