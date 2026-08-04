import { query } from './database/db.js';

export const ROD_TIERS = [
  { level: 1, name: 'Moonlit Twig', cost: 0, luck: 0, value: 0 },
  { level: 2, name: 'Pearl Rod', cost: 2500, luck: 5, value: 5 },
  { level: 3, name: 'Starlace Rod', cost: 10000, luck: 10, value: 12 },
  { level: 4, name: 'Celestial Ribbon', cost: 35000, luck: 18, value: 22 },
  { level: 5, name: 'Tsukuyomi Thread', cost: 100000, luck: 30, value: 40 }
];

async function ensureRod(userId) {
  await query('INSERT INTO fish_rods (user_id) VALUES ($1) ON CONFLICT DO NOTHING', [userId]);
  return (await query('SELECT * FROM fish_rods WHERE user_id=$1', [userId])).rows[0];
}

export async function getRod(userId) {
  const row = await ensureRod(userId);
  return { ...row, tier: ROD_TIERS.find(tier => tier.level === row.level) ?? ROD_TIERS[0] };
}

export async function upgradeRod(userId, wallet) {
  const rod = await getRod(userId);
  const next = ROD_TIERS.find(tier => tier.level === rod.level + 1);
  if (!next) throw new Error('Your rod has reached its celestial maximum.');
  if (wallet < next.cost) throw new Error(`You need ${next.cost.toLocaleString()} coins for the next rod tier.`);
  await query('UPDATE fish_rods SET level=$1, updated_at=NOW() WHERE user_id=$2', [next.level, userId]);
  return next;
}

export async function buyItem(userId, itemId, cost) {
  await query('INSERT INTO fish_items (user_id,item_id,quantity) VALUES ($1,$2,1) ON CONFLICT (user_id,item_id) DO UPDATE SET quantity=fish_items.quantity+1', [userId, itemId]);
  return { itemId, cost };
}

export async function drinkItem(userId, itemId) {
  const result = await query('UPDATE fish_items SET quantity=quantity-1, expires_at=NOW() + INTERVAL '1 minute' WHERE user_id=$1 AND item_id=$2 AND quantity>0', [userId, itemId]);
  if (!result.rowCount) throw new Error('You do not have that drink in your cosmic pouch.');
  return getActiveEffects(userId);
}

export async function getActiveEffects(userId) {
  return (await query("SELECT item_id, quantity, EXTRACT(EPOCH FROM (expires_at-NOW()))::int AS seconds_left FROM fish_items WHERE user_id=$1 AND quantity>0 AND expires_at>NOW() ORDER BY expires_at", [userId])).rows;
}
