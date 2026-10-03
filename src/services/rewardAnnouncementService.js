import { query } from '../database/db.js';

let tableReady = false;

async function ensureTable() {
  if (tableReady) return;
  await query(`CREATE TABLE IF NOT EXISTS reward_announcements (
    id BIGSERIAL PRIMARY KEY, guild_id TEXT NOT NULL, title TEXT NOT NULL,
    role_id TEXT NOT NULL, condition_key TEXT NOT NULL, channel_id TEXT NOT NULL,
    message_template TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await query(`CREATE INDEX IF NOT EXISTS reward_announcements_match_idx
    ON reward_announcements (guild_id, condition_key, role_id)`);
  tableReady = true;
}

export async function createRewardAnnouncement({ guildId, title, roleId, conditionKey, channelId, messageTemplate }) {
  await ensureTable();
  const result = await query(`INSERT INTO reward_announcements
    (guild_id,title,role_id,condition_key,channel_id,message_template)
    VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
  [guildId,title,roleId,conditionKey,channelId,messageTemplate]);
  return result.rows[0];
}

export async function listRewardAnnouncements(guildId) {
  await ensureTable();
  return (await query(`SELECT * FROM reward_announcements WHERE guild_id=$1 ORDER BY id`, [guildId])).rows;
}

export async function removeRewardAnnouncement(guildId, id) {
  await ensureTable();
  const result = await query('DELETE FROM reward_announcements WHERE guild_id=$1 AND id=$2 RETURNING id', [guildId,id]);
  return result.rowCount > 0;
}

export async function matchingRewardAnnouncements(guildId, conditionKey, roleId) {
  await ensureTable();
  return (await query(`SELECT * FROM reward_announcements
    WHERE guild_id=$1 AND condition_key=$2 AND role_id=$3 ORDER BY id`,
  [guildId,conditionKey,roleId])).rows;
}
