import { query } from '../database/db.js';

export const ROD_TIERS = [
  { level: 1, icon: '🪵', name: 'Wood Rod', cost: 0, luck: 5, value: 5, lore: 'A simple starter rod for gentle waters.' },
  { level: 2, icon: '🫧', name: 'Pearl Rod', cost: 2500, luck: 10, value: 10, lore: 'A quiet shimmer draws kinder tides.' },
  { level: 3, icon: '✨', name: 'Starlace Rod', cost: 10000, luck: 15, value: 18, lore: 'Woven from a thread of falling starlight.' },
  { level: 4, icon: '🪸', name: 'Coral Rod', cost: 25000, luck: 22, value: 28, lore: 'Its pulse follows the hidden reef.' },
  { level: 5, icon: '🎀', name: 'Celestial Rod', cost: 50000, luck: 30, value: 40, lore: 'A graceful reel for collectors with patience.' },
  { level: 6, icon: '🌌', name: 'Moonwake Rod', cost: 100000, luck: 40, value: 55, lore: 'Leaves a silver wake across the water.' },
  { level: 7, icon: '🔮', name: 'Aurora Rod', cost: 200000, luck: 52, value: 75, lore: 'Catches color before it becomes a fish.' },
  { level: 8, icon: '🌠', name: 'Starlight Rod', cost: 400000, luck: 68, value: 100, lore: 'Built for the boldest celestial pulls.' },
  { level: 9, icon: '☾', name: 'Tsukuyomi Rod', cost: 800000, luck: 90, value: 135, lore: 'A forbidden line that hums beneath moonlight.' },
  { level: 10, icon: '👑', name: 'Fateweaver Rod', cost: 1500000, luck: 115, value: 175, lore: 'The final reel: fate bends before the cast.' }
];

const UPGRADE_MAX = 5;
const upgradeCost = (tier, nextLevel) => Math.max(250, Math.round((tier.cost || 2500) * nextLevel / 10));

async function ensureRod(userId) {
  await query('INSERT INTO fish_rods (user_id) VALUES ($1) ON CONFLICT DO NOTHING', [userId]);
  return (await query('SELECT * FROM fish_rods WHERE user_id=$1', [userId])).rows[0];
}

export async function getRod(userId) {
  const row = await ensureRod(userId);
  const tier = ROD_TIERS.find(item => item.level === Number(row.level)) ?? ROD_TIERS[0];
  const upgradeLevel = Math.min(UPGRADE_MAX, Math.max(1, Number(row.upgrade_level ?? 1)));
  const progress = upgradeLevel / UPGRADE_MAX;
  return {
    ...row,
    level: Number(row.level),
    tier,
    upgradeLevel,
    upgradeMax: UPGRADE_MAX,
    luck: Math.round(tier.luck * progress),
    value: Math.round(tier.value * progress),
    nextUpgradeCost: upgradeLevel < UPGRADE_MAX ? upgradeCost(tier, upgradeLevel + 1) : null,
  };
}

export async function upgradeRod(userId, wallet) {
  const rod = await getRod(userId);
  if (rod.upgradeLevel >= rod.upgradeMax) throw new Error('Your rod is fully upgraded. Evolve it to continue.');
  const cost = rod.nextUpgradeCost;
  const charged = await query('UPDATE economy_users SET wallet=wallet-$1, updated_at=NOW() WHERE user_id=$2 AND wallet >= $1', [cost, userId]);
  if (!charged.rowCount) throw new Error('You need ' + cost.toLocaleString() + ' coins for this rod upgrade.');
  const nextLevel = rod.upgradeLevel + 1;
  await query('UPDATE fish_rods SET upgrade_level=$1, updated_at=NOW() WHERE user_id=$2 AND level=$3', [nextLevel, userId, rod.level]);
  await query('INSERT INTO economy_transactions (user_id,type,amount,metadata) VALUES ($1,$2,$3,$4)', [userId, 'fish_rod_upgrade', -cost, JSON.stringify({ rod: rod.tier.name, level: nextLevel })]);
  return getRod(userId);
}

export async function evolveRod(userId, wallet) {
  const rod = await getRod(userId);
  const next = ROD_TIERS.find(tier => tier.level === rod.level + 1);
  if (!next) throw new Error('Your rod has reached its celestial maximum.');
  if (rod.upgradeLevel < rod.upgradeMax) throw new Error('Upgrade your current rod to 5/5 before evolving it.');
  if (wallet < next.cost) throw new Error('You need ' + next.cost.toLocaleString() + ' coins to evolve into the next rod.');
  const charged = await query('UPDATE economy_users SET wallet=wallet-$1, updated_at=NOW() WHERE user_id=$2 AND wallet >= $1', [next.cost, userId]);
  if (!charged.rowCount) throw new Error('Your wallet changed before evolution completed. Please try again.');
  await query('UPDATE fish_rods SET level=$1, upgrade_level=1, updated_at=NOW() WHERE user_id=$2 AND level=$3', [next.level, userId, rod.level]);
  await query('INSERT INTO economy_transactions (user_id,type,amount,metadata) VALUES ($1,$2,$3,$4)', [userId, 'fish_rod_evolution', -next.cost, JSON.stringify({ from: rod.tier.name, to: next.name })]);
  return getRod(userId);
}

export async function buyItem(userId, itemId, cost) {
  const charged = await query('UPDATE economy_users SET wallet=wallet-$1, updated_at=NOW() WHERE user_id=$2 AND wallet >= $1', [cost, userId]);
  if (!charged.rowCount) throw new Error('You do not have enough global coins for that drink.');
  await query('INSERT INTO fish_items (user_id,item_id,quantity) VALUES ($1,$2,1) ON CONFLICT (user_id,item_id) DO UPDATE SET quantity=fish_items.quantity+1', [userId, itemId]);
  await query('INSERT INTO economy_transactions (user_id,type,amount,metadata) VALUES ($1,$2,$3,$4)', [userId, 'fish_item_purchase', -cost, JSON.stringify({ itemId })]);
  return { itemId, cost };
}

export async function drinkItem(userId, itemId) {
  const result = await query("UPDATE fish_items SET quantity=quantity-1, expires_at=NOW() + INTERVAL '5 minutes' WHERE user_id=$1 AND item_id=$2 AND quantity>0", [userId, itemId]);
  if (!result.rowCount) throw new Error('You do not have that drink in your cosmic pouch.');
  return getActiveEffects(userId);
}

export async function getActiveEffects(userId) {
  return (await query("SELECT item_id, quantity, EXTRACT(EPOCH FROM (expires_at-NOW()))::int AS seconds_left FROM fish_items WHERE user_id=$1 AND quantity>0 AND expires_at>NOW() ORDER BY expires_at", [userId])).rows;
}

export async function itemInventory(userId) {
  return (await query('SELECT item_id, quantity, EXTRACT(EPOCH FROM (expires_at - NOW()))::int AS seconds_left FROM fish_items WHERE user_id = $1 AND quantity > 0 ORDER BY item_id', [userId])).rows;
}

export async function getFishingBonuses(userId) {
  const rod = await getRod(userId);
  const effects = await getActiveEffects(userId);
  const ids = effects.map(effect => effect.item_id);
  return { rod, effects, luckBonus: rod.luck + (ids.includes('luck_drink') ? 15 : 0), valueBonus: rod.value + (ids.includes('value_drink') ? 25 : 0) };
}
