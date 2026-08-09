import { query } from '../database/db.js';

export async function createGiveaway(data) {
  const { rows } = await query(`INSERT INTO giveaways
    (guild_id, channel_id, host_user_id, prize, ends_at, winner_count, required_role_id)
    VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`, [data.guildId, data.channelId, data.hostUserId, data.prize, data.endsAt, data.winnerCount, data.requiredRoleId]);
  return rows[0];
}
export async function setGiveawayMessage(id, messageId) { await query('UPDATE giveaways SET message_id=$2 WHERE id=$1', [id, messageId]); }
export async function setGiveawayEmoji(id, emoji) { const { rows } = await query('UPDATE giveaways SET emoji=$2 WHERE id=$1 RETURNING *', [id, emoji]); return rows[0]; }
export async function getGiveaway(id) { const { rows } = await query('SELECT * FROM giveaways WHERE id=$1', [id]); return rows[0] ?? null; }
export async function getGiveawayByMessage(messageId) { const { rows } = await query("SELECT * FROM giveaways WHERE message_id=$1 AND status='active'", [messageId]); return rows[0] ?? null; }
export async function addGiveawayEntry(id, userId) { await query('INSERT INTO giveaway_entries (giveaway_id,user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [id, userId]); }
export async function getGiveawayEntries(id) { const { rows } = await query('SELECT user_id FROM giveaway_entries WHERE giveaway_id=$1', [id]); return rows.map(row => row.user_id); }
export async function finishGiveaway(id, winners) { await query("UPDATE giveaways SET status='ended', winner_user_ids=$2 WHERE id=$1", [id, winners]); }
