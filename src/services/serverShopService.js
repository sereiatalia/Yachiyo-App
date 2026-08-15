import { query } from '../database/db.js';

let ready = false;
async function ensure() {
  if (ready) return;
  await query(`CREATE TABLE IF NOT EXISTS server_shop_items (
    guild_id TEXT NOT NULL, role_id TEXT NOT NULL, name TEXT NOT NULL,
    price BIGINT NOT NULL CHECK (price > 0), required_level INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY (guild_id, role_id)
  )`);
  await query('ALTER TABLE server_shop_items ADD COLUMN IF NOT EXISTS premium BOOLEAN NOT NULL DEFAULT FALSE');
  await query(`CREATE TABLE IF NOT EXISTS server_shop_settings (
    guild_id TEXT PRIMARY KEY, guide TEXT NOT NULL DEFAULT 'Buy roles with server coins after reaching the required chat level. Premium roles are special and may be limited to one equipped role.', one_premium_only BOOLEAN NOT NULL DEFAULT FALSE
  )`);
  await query(`CREATE TABLE IF NOT EXISTS server_shop_purchases (
    guild_id TEXT NOT NULL, user_id TEXT NOT NULL, role_id TEXT NOT NULL, purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY (guild_id,user_id,role_id)
  )`);
  ready = true;
}
export async function addShopItem(guildId, roleId, name, price, requiredLevel, premium=false) { await ensure(); await query(`INSERT INTO server_shop_items (guild_id,role_id,name,price,required_level,premium) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (guild_id,role_id) DO UPDATE SET name=EXCLUDED.name,price=EXCLUDED.price,required_level=EXCLUDED.required_level,premium=EXCLUDED.premium`,[guildId,roleId,name,price,requiredLevel,premium]); }
export async function removeShopItem(guildId, roleId) { await ensure(); await query('DELETE FROM server_shop_items WHERE guild_id=$1 AND role_id=$2',[guildId,roleId]); }
export async function listShopItems(guildId) { await ensure(); return (await query('SELECT * FROM server_shop_items WHERE guild_id=$1 ORDER BY required_level,price,name',[guildId])).rows; }
export async function getShopItem(guildId, roleId) { await ensure(); return (await query('SELECT * FROM server_shop_items WHERE guild_id=$1 AND role_id=$2',[guildId,roleId])).rows[0] ?? null; }
export async function getShopSettings(guildId) { await ensure(); await query('INSERT INTO server_shop_settings (guild_id) VALUES ($1) ON CONFLICT DO NOTHING',[guildId]); return (await query('SELECT * FROM server_shop_settings WHERE guild_id=$1',[guildId])).rows[0]; }
export async function updateShopSettings(guildId, guide, onePremiumOnly) { await ensure(); await query('INSERT INTO server_shop_settings (guild_id,guide,one_premium_only) VALUES ($1,$2,$3) ON CONFLICT (guild_id) DO UPDATE SET guide=EXCLUDED.guide,one_premium_only=EXCLUDED.one_premium_only',[guildId,guide,onePremiumOnly]); }
export async function addPurchase(guildId,userId,roleId) { await ensure(); await query('INSERT INTO server_shop_purchases (guild_id,user_id,role_id) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING',[guildId,userId,roleId]); }
export async function listPurchases(guildId,userId) { await ensure(); return (await query('SELECT p.role_id,i.name,i.price,i.required_level,i.premium FROM server_shop_purchases p JOIN server_shop_items i ON i.guild_id=p.guild_id AND i.role_id=p.role_id WHERE p.guild_id=$1 AND p.user_id=$2 ORDER BY i.required_level,i.name',[guildId,userId])).rows; }
export async function removePurchase(guildId,userId,roleId) { await ensure(); await query('DELETE FROM server_shop_purchases WHERE guild_id=$1 AND user_id=$2 AND role_id=$3',[guildId,userId,roleId]); }
