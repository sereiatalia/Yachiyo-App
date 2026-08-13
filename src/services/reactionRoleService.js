import { query } from '../database/db.js';

let ready = false;
async function ensureTables() {
  if (ready) return;
  await query(`CREATE TABLE IF NOT EXISTS reaction_role_panels (
    id BIGSERIAL PRIMARY KEY, guild_id TEXT NOT NULL, channel_id TEXT NOT NULL,
    message_id TEXT, title TEXT NOT NULL, description TEXT NOT NULL,
    color INTEGER NOT NULL DEFAULT 15902919, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await query(`CREATE TABLE IF NOT EXISTS reaction_role_options (
    panel_id BIGINT NOT NULL REFERENCES reaction_role_panels(id) ON DELETE CASCADE,
    role_id TEXT NOT NULL, emoji TEXT NOT NULL, position INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (panel_id, role_id)
  )`);
  ready = true;
}
export async function createReactionRolePanel(guildId, channelId, title, description, color = 15902919) { await ensureTables(); return (await query('INSERT INTO reaction_role_panels (guild_id,channel_id,title,description,color) VALUES ($1,$2,$3,$4,$5) RETURNING *',[guildId,channelId,title,description,color])).rows[0]; }
export async function getReactionRolePanels(guildId) { await ensureTables(); return (await query('SELECT * FROM reaction_role_panels WHERE guild_id=$1 ORDER BY id',[guildId])).rows; }
export async function getReactionRolePanel(id, guildId) { await ensureTables(); const panel=(await query('SELECT * FROM reaction_role_panels WHERE id=$1 AND guild_id=$2',[id,guildId])).rows[0]; if(!panel) return null; panel.options=(await query('SELECT * FROM reaction_role_options WHERE panel_id=$1 ORDER BY position,role_id',[id])).rows; return panel; }
export async function addReactionRoleOption(panelId, roleId, emoji) { await ensureTables(); const next=(await query('SELECT COALESCE(MAX(position),-1)+1 AS next FROM reaction_role_options WHERE panel_id=$1',[panelId])).rows[0].next; await query(`INSERT INTO reaction_role_options (panel_id,role_id,emoji,position) VALUES ($1,$2,$3,$4) ON CONFLICT (panel_id,role_id) DO UPDATE SET emoji=EXCLUDED.emoji`,[panelId,roleId,emoji,next]); }
export async function removeReactionRoleOption(panelId, roleId) { await ensureTables(); await query('DELETE FROM reaction_role_options WHERE panel_id=$1 AND role_id=$2',[panelId,roleId]); }
export async function setReactionRolePanelMessage(panelId, messageId) { await ensureTables(); await query('UPDATE reaction_role_panels SET message_id=$2,updated_at=NOW() WHERE id=$1',[panelId,messageId]); }
export async function deleteReactionRolePanel(panelId, guildId) { await ensureTables(); await query('DELETE FROM reaction_role_panels WHERE id=$1 AND guild_id=$2',[panelId,guildId]); }
