import { query } from '../database/db.js';

export async function recordBump(guildId, userId, hours = 6) {
  const next = new Date(Date.now() + hours * 60 * 60 * 1000);
  await query(`INSERT INTO bump_timers (guild_id,user_id,next_bump_at) VALUES ($1,$2,$3)
    ON CONFLICT (guild_id,user_id) DO UPDATE SET next_bump_at=EXCLUDED.next_bump_at,updated_at=NOW()`, [guildId,userId,next]);
  return next;
}
export async function getBumpTimer(guildId, userId) { const { rows } = await query('SELECT next_bump_at FROM bump_timers WHERE guild_id=$1 AND user_id=$2',[guildId,userId]); return rows[0]?.next_bump_at ?? null; }
export async function saveBumpPanel(guildId, channelId) { const { rows }=await query(`INSERT INTO bump_panel_settings (guild_id,channel_id) VALUES ($1,$2) ON CONFLICT (guild_id) DO UPDATE SET channel_id=EXCLUDED.channel_id,updated_at=NOW() RETURNING *`,[guildId,channelId]); return rows[0]; }
export async function getBumpPanel(guildId) { const { rows }=await query('SELECT * FROM bump_panel_settings WHERE guild_id=$1',[guildId]); return rows[0]??null; }
export async function setBumpPanelMessage(guildId,messageId) { await query('UPDATE bump_panel_settings SET panel_message_id=$2 WHERE guild_id=$1',[guildId,messageId]); }
export async function saveBumpReminder(guildId,userId,remindAt) { await query(`INSERT INTO bump_reminders (guild_id,user_id,remind_at,notified) VALUES ($1,$2,$3,FALSE) ON CONFLICT (guild_id,user_id) DO UPDATE SET remind_at=EXCLUDED.remind_at,notified=FALSE`,[guildId,userId,remindAt]); }
export async function markBumpReminderNotified(guildId,userId) { await query('UPDATE bump_reminders SET notified=TRUE WHERE guild_id=$1 AND user_id=$2',[guildId,userId]); }
export async function pendingBumpReminders() { return (await query('SELECT * FROM bump_reminders WHERE notified=FALSE')).rows; }
