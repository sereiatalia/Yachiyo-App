import { query } from '../database/db.js';
export async function recordAudit({ guildId, eventType, actorId = null, targetId = null, data = {} }) {
  await query('INSERT INTO audit_logs (guild_id,event_type,actor_user_id,target_id,data) VALUES ($1,$2,$3,$4,$5)', [guildId, eventType, actorId, targetId, JSON.stringify(data)]);
}
export async function sendAuditLog(client, guild, payload) {
  await recordAudit({ guildId: guild.id, ...payload });
  const channelId = payload.channelId ?? (await query('SELECT log_channel_id FROM guild_settings WHERE guild_id=$1', [guild.id])).rows[0]?.log_channel_id;
  if (!channelId) return;
  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (channel?.isTextBased()) await channel.send({ content: `**${payload.eventType}**${payload.targetId ? ` • <@${payload.targetId}>` : ''}${payload.data?.summary ? `\n${payload.data.summary}` : ''}` }).catch(() => null);
}
