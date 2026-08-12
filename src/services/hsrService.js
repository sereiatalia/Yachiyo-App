import { query } from '../database/db.js';

let ready = false;
async function ensureTables() {
  if (ready) return;
  await query(`CREATE TABLE IF NOT EXISTS hsr_profiles (
    guild_id TEXT NOT NULL, discord_user_id TEXT NOT NULL, player_uid TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY (guild_id,discord_user_id)
  )`);
  await query(`CREATE TABLE IF NOT EXISTS hsr_panel_settings (
    guild_id TEXT PRIMARY KEY, channel_id TEXT NOT NULL, panel_message_id TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  ready = true;
}

export function normalizeHsrUid(uid) {
  const value=String(uid ?? '').trim().replace(/\s/g,'');
  if (!/^\d{9}$/.test(value)) throw new Error('Enter a valid 9-digit Honkai: Star Rail UID.');
  return value;
}
export async function fetchHsrProfile(uid) {
  const normalized=normalizeHsrUid(uid);
  let response;
  try { response=await fetch('https://api.mihomo.me/sr_info_parsed/'+normalized+'?lang=en',{headers:{'User-Agent':'Yachiyo-App/1.0 (Discord bot)'}}); }
  catch { throw new Error('The HSR profile service could not be reached. Please try again shortly.'); }
  if (response.status===404) throw new Error('That UID was not found, or its HSR profile showcase is private.');
  if (!response.ok) throw new Error('The HSR profile service is busy. Please try again shortly.');
  const data=await response.json();
  if (!data?.player?.nickname) throw new Error('That UID has no public HSR profile data. Enable Character Showcase in-game, then try again.');
  return data;
}
export async function saveHsrProfile(guildId, discordUserId, uid) { await ensureTables(); await query(`INSERT INTO hsr_profiles (guild_id,discord_user_id,player_uid) VALUES ($1,$2,$3) ON CONFLICT (guild_id,discord_user_id) DO UPDATE SET player_uid=EXCLUDED.player_uid,updated_at=NOW()`,[guildId,discordUserId,normalizeHsrUid(uid)]); }
export async function getHsrProfile(guildId, discordUserId) { await ensureTables(); return (await query('SELECT * FROM hsr_profiles WHERE guild_id=$1 AND discord_user_id=$2',[guildId,discordUserId])).rows[0] ?? null; }
export async function saveHsrPanel(guildId, channelId) { await ensureTables(); await query(`INSERT INTO hsr_panel_settings (guild_id,channel_id) VALUES ($1,$2) ON CONFLICT (guild_id) DO UPDATE SET channel_id=EXCLUDED.channel_id,updated_at=NOW()`,[guildId,channelId]); }
export async function getHsrPanel(guildId) { await ensureTables(); return (await query('SELECT * FROM hsr_panel_settings WHERE guild_id=$1',[guildId])).rows[0] ?? null; }
export async function setHsrPanelMessage(guildId, messageId) { await ensureTables(); await query('UPDATE hsr_panel_settings SET panel_message_id=$2,updated_at=NOW() WHERE guild_id=$1',[guildId,messageId]); }
