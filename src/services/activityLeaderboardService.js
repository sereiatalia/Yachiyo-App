import { query } from '../database/db.js';

let ready = false;
async function ensureActivityTable() {
  if (ready) return;
  await query(`CREATE TABLE IF NOT EXISTS guild_member_activity (
    guild_id TEXT NOT NULL, user_id TEXT NOT NULL, chat_xp BIGINT NOT NULL DEFAULT 0,
    voice_seconds BIGINT NOT NULL DEFAULT 0, voice_started_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY (guild_id,user_id)
  )`);
  ready = true;
}

export async function addChatXp(guildId, userId) {
  await ensureActivityTable();
  await query(`INSERT INTO guild_member_activity (guild_id,user_id,chat_xp) VALUES ($1,$2,1)
    ON CONFLICT (guild_id,user_id) DO UPDATE SET chat_xp=guild_member_activity.chat_xp+1,updated_at=NOW()`, [guildId,userId]);
}
export async function addChatXpAmount(guildId, userId, amount) {
  await ensureActivityTable();
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error('XP amount must be a positive integer.');
  await query(`INSERT INTO guild_member_activity (guild_id,user_id,chat_xp) VALUES ($1,$2,$3)
    ON CONFLICT (guild_id,user_id) DO UPDATE SET chat_xp=guild_member_activity.chat_xp+$3,updated_at=NOW()`, [guildId,userId,amount]);
  return getChatXp(guildId,userId);
}

export function chatLevelFromXp(xp) {
  const points = Number(xp) || 0;
  if (points < 100) return 1;
  if (points < 500) return 2;
  return 3 + Math.floor((points - 500) / 500);
}
export function chatXpForNextLevel(level) { return level <= 1 ? 100 : level === 2 ? 500 : 500 + ((level - 2) * 500); }
export async function getChatXp(guildId, userId) { await ensureActivityTable(); return Number((await query('SELECT chat_xp FROM guild_member_activity WHERE guild_id=$1 AND user_id=$2',[guildId,userId])).rows[0]?.chat_xp ?? 0); }

export async function startVoiceActivity(guildId, userId) {
  await ensureActivityTable();
  await query(`INSERT INTO guild_member_activity (guild_id,user_id,voice_started_at) VALUES ($1,$2,NOW())
    ON CONFLICT (guild_id,user_id) DO UPDATE SET voice_started_at=COALESCE(guild_member_activity.voice_started_at,NOW()),updated_at=NOW()`, [guildId,userId]);
}

export async function stopVoiceActivity(guildId, userId) {
  await ensureActivityTable();
  await query(`UPDATE guild_member_activity
    SET voice_seconds=voice_seconds+GREATEST(0,EXTRACT(EPOCH FROM (NOW()-voice_started_at))::BIGINT),
      voice_started_at=NULL,updated_at=NOW()
    WHERE guild_id=$1 AND user_id=$2 AND voice_started_at IS NOT NULL`, [guildId,userId]);
}

export async function chatXpLeaderboard(guildId, limit=10) {
  await ensureActivityTable();
  return (await query('SELECT user_id,chat_xp FROM guild_member_activity WHERE guild_id=$1 AND chat_xp>0 ORDER BY chat_xp DESC,user_id ASC LIMIT $2',[guildId,limit])).rows.map(row=>({...row,level:chatLevelFromXp(row.chat_xp)}));
}

export async function voiceLeaderboard(guildId, limit=10) {
  await ensureActivityTable();
  return (await query(`SELECT user_id,voice_seconds+CASE WHEN voice_started_at IS NULL THEN 0 ELSE GREATEST(0,EXTRACT(EPOCH FROM (NOW()-voice_started_at))::BIGINT) END AS total_seconds
    FROM guild_member_activity WHERE guild_id=$1 AND (voice_seconds>0 OR voice_started_at IS NOT NULL)
    ORDER BY total_seconds DESC,user_id ASC LIMIT $2`,[guildId,limit])).rows;
}
