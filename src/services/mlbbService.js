import { query } from '../database/db.js';

let ready = false;
async function ensureTables() {
  if (ready) return;
  await query(`CREATE TABLE IF NOT EXISTS mlbb_profiles (
    guild_id TEXT NOT NULL, discord_user_id TEXT NOT NULL, player_uid TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY (guild_id,discord_user_id)
  )`);
  await query(`CREATE TABLE IF NOT EXISTS mlbb_panel_settings (
    guild_id TEXT PRIMARY KEY, channel_id TEXT NOT NULL, panel_message_id TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  ready = true;
}
export function normalizeMlbbUid(uid) {
  const value=String(uid ?? '').trim().replace(/[\s,]/g,'');
  if (!/^\d{5,20}$/.test(value)) throw new Error('Enter your numeric MLBB UID only.');
  return value;
}
export async function saveMlbbProfile(guildId, discordUserId, uid) { await ensureTables(); await query(`INSERT INTO mlbb_profiles (guild_id,discord_user_id,player_uid) VALUES ($1,$2,$3) ON CONFLICT (guild_id,discord_user_id) DO UPDATE SET player_uid=EXCLUDED.player_uid,updated_at=NOW()`,[guildId,discordUserId,normalizeMlbbUid(uid)]); }
export async function getMlbbProfile(guildId, discordUserId) { await ensureTables(); return (await query('SELECT * FROM mlbb_profiles WHERE guild_id=$1 AND discord_user_id=$2',[guildId,discordUserId])).rows[0] ?? null; }
export async function saveMlbbPanel(guildId, channelId) { await ensureTables(); await query(`INSERT INTO mlbb_panel_settings (guild_id,channel_id) VALUES ($1,$2) ON CONFLICT (guild_id) DO UPDATE SET channel_id=EXCLUDED.channel_id,updated_at=NOW()`,[guildId,channelId]); }
export async function getMlbbPanel(guildId) { await ensureTables(); return (await query('SELECT * FROM mlbb_panel_settings WHERE guild_id=$1',[guildId])).rows[0] ?? null; }
export async function setMlbbPanelMessage(guildId, messageId) { await ensureTables(); await query('UPDATE mlbb_panel_settings SET panel_message_id=$2,updated_at=NOW() WHERE guild_id=$1',[guildId,messageId]); }
