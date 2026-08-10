import { query } from '../database/db.js';

export async function recordBump(guildId, userId, hours = 6) {
  const next = new Date(Date.now() + hours * 60 * 60 * 1000);
  await query(`INSERT INTO bump_timers (guild_id,user_id,next_bump_at) VALUES ($1,$2,$3)
    ON CONFLICT (guild_id,user_id) DO UPDATE SET next_bump_at=EXCLUDED.next_bump_at,updated_at=NOW()`, [guildId,userId,next]);
  return next;
}
export async function getBumpTimer(guildId, userId) { const { rows } = await query('SELECT next_bump_at FROM bump_timers WHERE guild_id=$1 AND user_id=$2',[guildId,userId]); return rows[0]?.next_bump_at ?? null; }
