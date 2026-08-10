import { query } from '../database/db.js';
export async function ensureGuild(guildId) { await query('INSERT INTO guild_settings (guild_id) VALUES ($1) ON CONFLICT DO NOTHING', [guildId]); return (await query('SELECT * FROM guild_settings WHERE guild_id=$1', [guildId])).rows[0]; }
export async function setLogChannel(guildId, channelId) { await ensureGuild(guildId); await query('UPDATE guild_settings SET log_channel_id=$1,updated_at=NOW() WHERE guild_id=$2', [channelId,guildId]); }
export async function setAuditCategoryChannel(guildId, category, channelId) { await ensureGuild(guildId); await query(`UPDATE guild_settings SET audit_channels = jsonb_set(COALESCE(audit_channels,'{}'::jsonb), ARRAY[$1::text], to_jsonb($2::text), TRUE), updated_at=NOW() WHERE guild_id=$3`, [category, channelId, guildId]); }
export async function setVoiceChannel(guildId, channelId) { await ensureGuild(guildId); await query('UPDATE guild_settings SET voice_channel_id=$1,updated_at=NOW() WHERE guild_id=$2',[channelId,guildId]); }
export async function getVoiceChannels() { return (await query('SELECT guild_id,voice_channel_id FROM guild_settings WHERE voice_channel_id IS NOT NULL')).rows; }

export async function setFishChannel(guildId, channelId) { await ensureGuild(guildId); await query('UPDATE guild_settings SET fish_channel_id=$1,updated_at=NOW() WHERE guild_id=$2', [channelId,guildId]); }
export async function getFishChannel(guildId) { await ensureGuild(guildId); return (await query('SELECT fish_channel_id FROM guild_settings WHERE guild_id=$1', [guildId])).rows[0]?.fish_channel_id ?? null; }
