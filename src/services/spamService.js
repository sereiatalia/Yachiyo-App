import { query } from '../database/db.js';

let ready = false;
async function ensureTables() {
  if (ready) return;
  await query(`CREATE TABLE IF NOT EXISTS spam_settings (
    guild_id TEXT PRIMARY KEY, enabled BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await query(`CREATE TABLE IF NOT EXISTS spam_warnings (
    guild_id TEXT NOT NULL, user_id TEXT NOT NULL, warning_count INTEGER NOT NULL DEFAULT 0,
    last_warned_at TIMESTAMPTZ, PRIMARY KEY (guild_id,user_id)
  )`);
  ready = true;
}

export async function getSpamSettings(guildId) {
  await ensureTables();
  return (await query('SELECT enabled FROM spam_settings WHERE guild_id=$1', [guildId])).rows[0] ?? {enabled:false};
}
export async function setSpamEnabled(guildId, enabled) {
  await ensureTables();
  return (await query(`INSERT INTO spam_settings (guild_id,enabled) VALUES ($1,$2)
    ON CONFLICT (guild_id) DO UPDATE SET enabled=EXCLUDED.enabled,updated_at=NOW() RETURNING enabled`, [guildId,enabled])).rows[0];
}
export async function recordSpamWarning(guildId, userId) {
  await ensureTables();
  return (await query(`INSERT INTO spam_warnings (guild_id,user_id,warning_count,last_warned_at) VALUES ($1,$2,1,NOW())
    ON CONFLICT (guild_id,user_id) DO UPDATE SET warning_count=spam_warnings.warning_count+1,last_warned_at=NOW()
    RETURNING warning_count`, [guildId,userId])).rows[0].warning_count;
}
export async function resetSpamWarnings(guildId, userId) {
  await ensureTables();
  await query(`INSERT INTO spam_warnings (guild_id,user_id,warning_count,last_warned_at) VALUES ($1,$2,0,NOW())
    ON CONFLICT (guild_id,user_id) DO UPDATE SET warning_count=0,last_warned_at=NOW()`, [guildId,userId]);
}
export async function getSpamWarnings(guildId, userId) {
  await ensureTables();
  return Number((await query('SELECT warning_count FROM spam_warnings WHERE guild_id=$1 AND user_id=$2', [guildId,userId])).rows[0]?.warning_count ?? 0);
}
