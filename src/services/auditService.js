import { EmbedBuilder } from 'discord.js';
import { query } from '../database/db.js';

const MAX_CONTENT = 1024;
function clip(value, max = MAX_CONTENT) { const text = String(value ?? ''); return text.length > max ? text.slice(0, max - 3) + '...' : text; }

function formatEvent(payload) {
  const data = payload.data ?? {};
  const definitions = {
    'message.delete': { title: '🗑️ Message deleted', color: 0xe74c3c },
    'message.edit': { title: '✏️ Message edited', color: 0xf1c40f },
    'member.join': { title: '📥 Member joined', color: 0x2ecc71 },
    'member.leave': { title: '📤 Member left', color: 0xe67e22 },
    'role.create': { title: '🟢 Role created', color: 0x2ecc71 },
    'role.delete': { title: '🔴 Role deleted', color: 0xe74c3c },
    'channel.create': { title: '📁 Channel created', color: 0x3498db },
    'channel.delete': { title: '🗑️ Channel deleted', color: 0xe74c3c },
    'confession.create': { title: '💌 Confession submitted', color: 0xe74c3c },
    'confession.reply': { title: '💬 Anonymous confession reply', color: 0xf3a6c7 },
    'moderation.action': { title: '🛡️ Moderation action', color: 0xffc857 },
    'moderation.curse_warning': { title: '🧼 Curse filter warning', color: 0xff6b9d }
  };
  const definition = definitions[payload.eventType] ?? { title: '🛡️ ' + payload.eventType, color: 0x8e7dff };
  const embed = new EmbedBuilder().setTitle(definition.title).setColor(definition.color).setTimestamp();
  if (data.channelName || payload.targetId) embed.addFields({ name: 'Channel', value: data.channelName ? data.channelName + ' <#' + payload.targetId + '>' : '<#' + payload.targetId + '>', inline: false });
  if (data.actorLabel || payload.actorId) embed.addFields({ name: data.actorLabel ?? 'Sender', value: data.actorLabel ? clip(data.actorLabel) : '<@' + payload.actorId + '>', inline: false });
  if (data.messageId) embed.addFields({ name: 'Message ID', value: '`' + data.messageId + '`', inline: false });
  if (data.authorId) embed.addFields({ name: 'Message author', value: '<@' + data.authorId + '>', inline: false });
  if (data.createdTimestamp) embed.addFields({ name: 'Message created', value: '<t:' + Math.floor(data.createdTimestamp / 1000) + ':R>', inline: false });
  if (data.serverName || data.confessionId) embed.addFields({ name: 'Confession context', value: (data.serverName ? '**' + clip(data.serverName) + '**' : '') + (data.confessionId ? ' • Confession #' + data.confessionId : ''), inline: false });
  if (data.summary) embed.setDescription(data.summary);
  if (data.reason) embed.addFields({ name: 'Reason', value: clip(data.reason), inline: false });
  if (data.matchedWords?.length) embed.addFields({ name: 'Matched word(s)', value: clip(data.matchedWords.join(', ')), inline: false });
  if (data.warningCounts?.length) embed.addFields({ name: 'Warnings', value: clip(data.warningCounts.map(item => item.word + ': ' + item.count + '/3').join(' • ')), inline: false });
  if (data.timeoutApplied) embed.addFields({ name: 'Action', value: '1-minute timeout applied', inline: true });
  if (data.confession) embed.addFields({ name: 'Confession', value: clip(data.confession), inline: false });
  if (data.content !== undefined) embed.addFields({ name: 'Message', value: clip(data.content) || '*(empty message)*', inline: false });
  if (data.before !== undefined || data.after !== undefined) embed.addFields({ name: 'Before', value: clip(data.before) || '*(empty message)*', inline: true }, { name: 'After', value: clip(data.after) || '*(empty message)*', inline: true });
  if (data.attachments) embed.addFields({ name: 'Attachments', value: String(data.attachments), inline: true });
  if (data.attachmentDetails?.length) embed.addFields({ name: 'Deleted attachments', value: data.attachmentDetails.map(file => {
    const link = '[' + clip(file.name || 'attachment', 80) + '](' + file.url + ')';
    return /^(image|video)\//i.test(file.contentType || '') ? '||' + link + '|| *(spoiler)*' : link;
  }).join('\n').slice(0, 1024), inline: false });
  if (data.attachmentUrls?.length) {
    embed.addFields({ name: 'Saved attachment links', value: data.attachmentUrls.map((url, index) => '[' + (index + 1) + '](' + url + ')').join('\\n').slice(0, 1024), inline: false });
    if (!data.attachmentDetails?.length) {
      const image = data.attachmentUrls.find(url => /\\.(png|jpe?g|gif|webp)(\\?|$)/i.test(url));
      if (image) embed.setImage(image);
    }
  }
  if (data.previousAttachmentUrls?.length) embed.addFields({ name: 'Previous attachment links', value: data.previousAttachmentUrls.map((url, index) => '[' + (index + 1) + '](' + url + ')').join('\\n').slice(0, 1024), inline: false });
  return embed;
}

export async function recordAudit({ guildId, eventType, actorId = null, targetId = null, data = {} }) {
  await query('INSERT INTO audit_logs (guild_id,event_type,actor_user_id,target_id,data) VALUES ($1,$2,$3,$4,$5)', [guildId, eventType, actorId, targetId, JSON.stringify(data)]);
}
export async function sendAuditLog(client, guild, payload) {
  if (payload.actorId && payload.actorId === client.user?.id) return;
  if (payload.data?.isBotEvent) return;
  await recordAudit({ guildId: guild.id, ...payload });
  const settings = (await query('SELECT log_channel_id, audit_channels FROM guild_settings WHERE guild_id=$1', [guild.id])).rows[0] ?? {};
  const category = payload.eventType === 'moderation.curse_warning' ? 'curse' : payload.eventType.startsWith('message.') ? 'messages' : payload.eventType.startsWith('member.') ? 'members' : payload.eventType.startsWith('moderation.') ? 'moderation' : payload.eventType.startsWith('confession.') ? 'confessions' : ['role.create','role.delete','channel.create','channel.delete'].includes(payload.eventType) ? 'server' : null;
  const channelId = payload.channelId ?? settings.audit_channels?.[category] ?? settings.log_channel_id;
  if (!channelId) return;
  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (channel?.isTextBased()) await channel.send({ embeds: [formatEvent(payload)] }).catch(() => null);
}
