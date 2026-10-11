import { AttachmentBuilder, EmbedBuilder } from 'discord.js';
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
  // Deleted channels no longer resolve to a Discord mention, and message-delete
  // entries already contain the useful author information below.
  if (!['message.delete','message.edit','channel.delete','member.leave'].includes(payload.eventType) && (data.channelName || payload.targetId)) embed.addFields({ name: 'Channel', value: data.channelName ? '#' + data.channelName : '<#' + payload.targetId + '>', inline: false });
  if (payload.eventType === 'channel.delete' && data.channelName) embed.addFields({ name: 'Deleted channel', value: '#' + clip(data.channelName), inline: false });
  if (payload.eventType === 'channel.delete' && data.deletedBy) embed.addFields({ name: 'Deleted by', value: data.deletedBy, inline: false });
  if (payload.eventType === 'channel.create' && data.createdBy) embed.addFields({ name: 'Created by', value: data.createdBy, inline: false });
  if (payload.eventType === 'message.delete') {
    embed.addFields(
      { name: 'Message Sender', value: data.authorId ? '<@' + data.authorId + '>' : 'Unknown', inline: false },
      { name: 'Message ID', value: data.messageId ? '`' + data.messageId + '`' : 'Unknown', inline: false },
      { name: 'Message Created', value: data.createdTimestamp ? '<t:' + Math.floor(data.createdTimestamp / 1000) + ':R>' : 'Unknown', inline: false },
      { name: 'Channel Where it Deleted', value: data.channelName ? '#' + clip(data.channelName) : 'Unknown', inline: false }
    );
  } else if (payload.eventType === 'message.edit') {
    embed.addFields(
      { name: 'Message Before', value: clip(data.before) || '*(empty message)*', inline: false },
      { name: 'Message After', value: clip(data.after) || '*(empty message)*', inline: false },
      { name: 'Message Sender', value: data.authorId ? '<@' + data.authorId + '>' : 'Unknown', inline: false },
      { name: 'Message Created', value: data.createdTimestamp ? '<t:' + Math.floor(data.createdTimestamp / 1000) + ':R>' : 'Unknown', inline: false }
    );
  } else if (payload.eventType === 'member.leave') {
    embed.addFields(
      { name: 'Member Who Leave', value: data.displayName || 'Unknown member', inline: false },
      { name: 'Username', value: data.username || 'Unknown username', inline: false },
      { name: 'When', value: data.leftAt ? new Date(data.leftAt).toLocaleDateString() : 'Unknown date', inline: false },
      { name: 'Time', value: data.leftAt ? new Date(data.leftAt).toLocaleTimeString() : 'Unknown time', inline: false }
    );
  } else if (payload.eventType === 'moderation.kick' || (payload.eventType === 'moderation.action' && /completed a kick action/i.test(data.summary || ''))) {
    embed.addFields(
      { name: 'Username Kicked', value: data.targetUsername || (payload.targetId ? '<@' + payload.targetId + '>' : 'Unknown username'), inline: false },
      { name: 'Responsible Moderator', value: payload.actorId ? '<@' + payload.actorId + '>' : 'Unknown moderator', inline: false },
      { name: 'Date', value: data.kickedAt ? new Date(data.kickedAt).toLocaleDateString() : new Date().toLocaleDateString(), inline: false },
      { name: 'Time', value: data.kickedAt ? new Date(data.kickedAt).toLocaleTimeString() : new Date().toLocaleTimeString(), inline: false }
    );
  } else if (data.actorLabel || payload.actorId) embed.addFields({ name: data.actorLabel ?? 'Sender', value: data.actorLabel ? clip(data.actorLabel) : '<@' + payload.actorId + '>', inline: false });
  if (data.messageId && !['message.delete','message.edit'].includes(payload.eventType)) embed.addFields({ name: 'Message ID', value: '`' + data.messageId + '`', inline: false });
  if (data.authorId && !['message.delete','message.edit'].includes(payload.eventType)) embed.addFields({ name: 'Message author', value: '<@' + data.authorId + '>', inline: false });
  if (data.createdTimestamp && !['message.delete','message.edit'].includes(payload.eventType)) embed.addFields({ name: 'Message created', value: '<t:' + Math.floor(data.createdTimestamp / 1000) + ':R>', inline: false });
  if (data.serverName || data.confessionId) embed.addFields({ name: 'Confession context', value: (data.serverName ? '**' + clip(data.serverName) + '**' : '') + (data.confessionId ? ' • Confession #' + data.confessionId : ''), inline: false });
  if (data.summary) embed.setDescription(data.summary);
  if (data.reason) embed.addFields({ name: 'Reason', value: clip(data.reason), inline: false });
  if (data.matchedWords?.length) embed.addFields({ name: 'Matched word(s)', value: clip(data.matchedWords.join(', ')), inline: false });
  if (data.warningCounts?.length) embed.addFields({ name: 'Warnings', value: clip(data.warningCounts.map(item => item.word + ': ' + item.count + '/3').join(' • ')), inline: false });
  if (data.timeoutApplied) embed.addFields({ name: 'Action', value: '1-minute timeout applied', inline: true });
  if (data.confession) embed.addFields({ name: 'Confession', value: clip(data.confession), inline: false });
  if (data.content !== undefined) embed.addFields({ name: 'Message', value: clip(data.content) || '*(empty message)*', inline: false });
  if ((data.before !== undefined || data.after !== undefined) && payload.eventType !== 'message.edit') embed.addFields({ name: 'Before', value: clip(data.before) || '*(empty message)*', inline: true }, { name: 'After', value: clip(data.after) || '*(empty message)*', inline: true });
  if (data.attachments) embed.addFields({ name: 'Attachments', value: String(data.attachments), inline: true });
  const attachmentDetails = data.attachmentDetails ?? [];
  const mediaFiles = attachmentDetails.filter(file => /^(image|video)\//i.test(file.contentType || '') || /\.(png|jpe?g|gif|webp|mp4|webm|mov|m4v)(\?|$)/i.test(file.url || ''));
  const nonMediaFiles = attachmentDetails.filter(file => !mediaFiles.includes(file));
  if (nonMediaFiles.length) embed.addFields({ name: 'Deleted files', value: nonMediaFiles.map(file => clip(file.name || 'attachment', 80)).join('\n').slice(0, 1024), inline: false });
  const mediaUrls = mediaFiles.map(file => file.url).filter(Boolean);
  const image = mediaFiles.find(file => /^(image)\//i.test(file.contentType || '') || /\.(png|jpe?g|gif|webp)(\?|$)/i.test(file.url || ''));
  if (image?.url) embed.setImage(image.url);
  if (data.attachmentUrls?.length) {
    const knownMediaUrls = new Set(mediaUrls);
    const remainingUrls = data.attachmentUrls.filter(url => !knownMediaUrls.has(url));
    if (!attachmentDetails.length) {
      const fallbackImage = remainingUrls.find(url => /\.(png|jpe?g|gif|webp)(\?|$)/i.test(url));
      if (fallbackImage) embed.setImage(fallbackImage);
    }
    if (remainingUrls.length) embed.addFields({ name: 'Deleted file links (could not re-upload)', value: remainingUrls.map((url, index) => '[' + (index + 1) + '](' + url + ')').join('\n').slice(0, 1024), inline: false });
  }
  if (data.previousAttachmentUrls?.length) embed.addFields({ name: 'Previous attachment links', value: data.previousAttachmentUrls.map((url, index) => '[' + (index + 1) + '](' + url + ')').join('\\n').slice(0, 1024), inline: false });
  return embed;
}

export async function recordAudit({ guildId, eventType, actorId = null, targetId = null, data = {} }) {
  await query('INSERT INTO audit_logs (guild_id,event_type,actor_user_id,target_id,data) VALUES ($1,$2,$3,$4,$5)', [guildId, eventType, actorId, targetId, JSON.stringify(data)]);
}

async function reuploadDeletedAttachments(details = []) {
  const files = [];
  const failedUrls = [];
  let totalBytes = 0;
  for (const [index, detail] of details.slice(0, 10).entries()) {
    let url;
    try {
      url = new URL(detail.url);
      if (url.protocol !== 'https:' || !/(^|\.)(discordapp\.com|discordapp\.net)$/.test(url.hostname)) throw new Error('Attachment URL is not a Discord CDN URL');
      if (Number(detail.size) > 24 * 1024 * 1024 || totalBytes + Number(detail.size || 0) > 24 * 1024 * 1024) throw new Error('Attachment exceeds the log-upload size allowance');
      const response = await fetch(url, { signal: AbortSignal.timeout(12_000) });
      if (!response.ok) throw new Error('Discord CDN returned HTTP ' + response.status);
      const declaredSize = Number(response.headers.get('content-length') || 0);
      if (declaredSize > 24 * 1024 * 1024 || totalBytes + declaredSize > 24 * 1024 * 1024) throw new Error('Attachment exceeds the log-upload size allowance');
      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.length > 24 * 1024 * 1024 || totalBytes + buffer.length > 24 * 1024 * 1024) throw new Error('Attachment exceeds the log-upload size allowance');
      totalBytes += buffer.length;
      const rawName = String(detail.name || `deleted-attachment-${index + 1}`).split(/[\\/]/).pop();
      const safeName = rawName.replace(/[^\w. ()-]/g, '_').slice(0, 100) || `deleted-attachment-${index + 1}`;
      files.push({ attachment: new AttachmentBuilder(buffer, { name: safeName }), name: safeName, contentType: detail.contentType || response.headers.get('content-type') || '', previewUrl: `attachment://${safeName}` });
    } catch (error) {
      console.warn('[AUDIT_ATTACHMENT_REUPLOAD]', detail.name || detail.url, error.message);
      if (detail.url) failedUrls.push(detail.url);
    }
  }
  for (const detail of details.slice(10)) if (detail.url) failedUrls.push(detail.url);
  return { files, failedUrls };
}

export async function sendAuditLog(client, guild, payload) {
  if (payload.actorId && payload.actorId === client.user?.id) return;
  if (payload.data?.isBotEvent) return;
  if (payload.eventType === 'moderation.action' && /completed a kick action/i.test(payload.data?.summary || '') && payload.targetId) {
    const kickedUser = await client.users.fetch(payload.targetId).catch(() => null);
    if (kickedUser) payload.data = { ...payload.data, targetUsername: kickedUser.tag, kickedAt: new Date().toISOString() };
  }
  await recordAudit({ guildId: guild.id, ...payload });
  const settings = (await query('SELECT log_channel_id, audit_channels FROM guild_settings WHERE guild_id=$1', [guild.id])).rows[0] ?? {};
  const category = payload.eventType === 'moderation.curse_warning' ? 'curse' : payload.eventType === 'message.delete' ? 'message-deleted' : payload.eventType === 'message.edit' ? 'message-edited' : payload.eventType === 'member.leave' ? 'member-leave' : payload.eventType === 'moderation.kick' || (payload.eventType === 'moderation.action' && /completed a kick action/i.test(payload.data?.summary || '')) ? 'kick' : payload.eventType.startsWith('message.') ? 'messages' : payload.eventType.startsWith('member.') ? 'members' : payload.eventType.startsWith('moderation.') ? 'moderation' : payload.eventType.startsWith('confession.') ? 'confessions' : ['role.create','role.delete','channel.create','channel.delete'].includes(payload.eventType) ? 'server' : null;
  const channelId = payload.channelId ?? settings.audit_channels?.[category] ?? settings.log_channel_id;
  if (!channelId) return;
  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (channel?.isTextBased()) {
    const uploaded = payload.eventType === 'message.delete' ? await reuploadDeletedAttachments(payload.data?.attachmentDetails) : { files: [], failedUrls: [] };
    const uploadedDetails = uploaded.files.map(file => ({ name: file.name, contentType: file.contentType, url: file.previewUrl }));
    const message = { embeds: [formatEvent({ ...payload, data: { ...payload.data, attachmentDetails: uploadedDetails, attachmentUrls: uploaded.failedUrls } })] };
    if (uploaded.files.length) message.files = uploaded.files.map(file => file.attachment);
    // Re-uploading turns deleted media into native Discord attachments: images
    // preview and videos/files render as normal attachments in the audit channel.
    await channel.send(message).catch(() => null);
  }
}

