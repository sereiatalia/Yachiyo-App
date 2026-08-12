import { query } from '../database/db.js';

let ready = false;

async function ensureTables() {
  if (ready) return;
  await query(`CREATE TABLE IF NOT EXISTS temp_voice_settings (
    guild_id TEXT PRIMARY KEY, panel_channel_id TEXT NOT NULL, panel_message_id TEXT,
    category_id TEXT, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await query(`CREATE TABLE IF NOT EXISTS temp_voice_channels (
    channel_id TEXT PRIMARY KEY, guild_id TEXT NOT NULL, owner_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await query('CREATE INDEX IF NOT EXISTS temp_voice_channels_guild_idx ON temp_voice_channels(guild_id)');
  ready = true;
}

export async function saveTempVoiceSettings(guildId, panelChannelId, categoryId = null) {
  await ensureTables();
  await query(`INSERT INTO temp_voice_settings (guild_id,panel_channel_id,category_id) VALUES ($1,$2,$3)
    ON CONFLICT (guild_id) DO UPDATE SET panel_channel_id=EXCLUDED.panel_channel_id,category_id=EXCLUDED.category_id,panel_message_id=NULL,updated_at=NOW()`, [guildId, panelChannelId, categoryId]);
}
export async function getTempVoiceSettings(guildId) { await ensureTables(); return (await query('SELECT * FROM temp_voice_settings WHERE guild_id=$1', [guildId])).rows[0] ?? null; }
export async function saveTempVoicePanel(guildId, messageId) { await ensureTables(); await query('UPDATE temp_voice_settings SET panel_message_id=$2,updated_at=NOW() WHERE guild_id=$1', [guildId, messageId]); }
export async function createTempVoiceChannel(guildId, channelId, ownerId) { await ensureTables(); await query('INSERT INTO temp_voice_channels (channel_id,guild_id,owner_id) VALUES ($1,$2,$3) ON CONFLICT (channel_id) DO UPDATE SET owner_id=EXCLUDED.owner_id', [channelId, guildId, ownerId]); }
export async function getTempVoiceChannel(channelId) { await ensureTables(); return (await query('SELECT * FROM temp_voice_channels WHERE channel_id=$1', [channelId])).rows[0] ?? null; }
export async function getTempVoiceForOwner(guildId, ownerId) { await ensureTables(); return (await query('SELECT * FROM temp_voice_channels WHERE guild_id=$1 AND owner_id=$2 ORDER BY created_at DESC LIMIT 1', [guildId, ownerId])).rows[0] ?? null; }
export async function deleteTempVoiceChannel(channelId) { await ensureTables(); await query('DELETE FROM temp_voice_channels WHERE channel_id=$1', [channelId]); }
