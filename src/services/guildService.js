import { query } from '../database/db.js';
export async function ensureGuild(guildId) { await query('INSERT INTO guild_settings (guild_id) VALUES ($1) ON CONFLICT DO NOTHING', [guildId]); return (await query('SELECT * FROM guild_settings WHERE guild_id=$1', [guildId])).rows[0]; }
export async function setLogChannel(guildId, channelId) { await ensureGuild(guildId); await query('UPDATE guild_settings SET log_channel_id=$1,updated_at=NOW() WHERE guild_id=$2', [channelId,guildId]); }

export async function setFishChannel(guildId, channelId) { await ensureGuild(guildId); await query('UPDATE guild_settings SET fish_channel_id=$1,updated_at=NOW() WHERE guild_id=$2', [channelId,guildId]); }
export async function getFishChannel(guildId) { await ensureGuild(guildId); return (await query('SELECT fish_channel_id FROM guild_settings WHERE guild_id=$1', [guildId])).rows[0]?.fish_channel_id ?? null; }
