import { query } from '../database/db.js';

let ready = false;
async function ensure() {
  if (ready) return;
  await query(`CREATE TABLE IF NOT EXISTS server_shop_items (
    guild_id TEXT NOT NULL, role_id TEXT NOT NULL, name TEXT NOT NULL,
    price BIGINT NOT NULL CHECK (price > 0), required_level INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY (guild_id, role_id)
  )`);
  ready = true;
}
export async function addShopItem(guildId, roleId, name, price, requiredLevel) { await ensure(); await query(`INSERT INTO server_shop_items (guild_id,role_id,name,price,required_level) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (guild_id,role_id) DO UPDATE SET name=EXCLUDED.name,price=EXCLUDED.price,required_level=EXCLUDED.required_level`,[guildId,roleId,name,price,requiredLevel]); }
export async function removeShopItem(guildId, roleId) { await ensure(); await query('DELETE FROM server_shop_items WHERE guild_id=$1 AND role_id=$2',[guildId,roleId]); }
export async function listShopItems(guildId) { await ensure(); return (await query('SELECT * FROM server_shop_items WHERE guild_id=$1 ORDER BY required_level,price,name',[guildId])).rows; }
export async function getShopItem(guildId, roleId) { await ensure(); return (await query('SELECT * FROM server_shop_items WHERE guild_id=$1 AND role_id=$2',[guildId,roleId])).rows[0] ?? null; }
