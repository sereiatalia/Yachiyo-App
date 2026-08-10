import { query } from '../database/db.js';

export async function getTicketSettings(guildId) { const { rows } = await query('SELECT * FROM ticket_settings WHERE guild_id=$1',[guildId]); return rows[0] ?? null; }
export async function saveTicketSettings(guildId, channelId) { const { rows } = await query(`INSERT INTO ticket_settings (guild_id,channel_id) VALUES ($1,$2) ON CONFLICT (guild_id) DO UPDATE SET channel_id=EXCLUDED.channel_id,updated_at=NOW() RETURNING *`,[guildId,channelId]); return rows[0]; }
export async function setTicketPanel(guildId,messageId) { await query('UPDATE ticket_settings SET panel_message_id=$2 WHERE guild_id=$1',[guildId,messageId]); }
export async function createTicket(data) { const { rows } = await query('INSERT INTO tickets (guild_id,channel_id,user_id,category,subject) VALUES ($1,$2,$3,$4,$5) RETURNING *',[data.guildId,data.channelId,data.userId,data.category,data.subject]); return rows[0]; }
export async function getTicketByChannel(channelId) { const { rows } = await query('SELECT * FROM tickets WHERE channel_id=$1',[channelId]); return rows[0] ?? null; }
export async function deleteTicket(channelId) { await query('DELETE FROM tickets WHERE channel_id=$1',[channelId]); }
