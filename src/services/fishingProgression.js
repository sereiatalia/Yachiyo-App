import { query } from '../database/db.js';

export const ROD_TIERS = [
  { level: 1, icon: '🌙', name: 'Moonlit Twig', cost: 0, luck: 0, value: 0, lore: 'A small branch that remembers the moon.' },
  { level: 2, icon: '🫧', name: 'Pearl Rod', cost: 2500, luck: 5, value: 5, lore: 'A quiet shimmer draws kinder tides.' },
  { level: 3, icon: '✨', name: 'Starlace Rod', cost: 10000, luck: 10, value: 12, lore: 'Woven from a thread of falling starlight.' },
  { level: 4, icon: '🪸', name: 'Coralheart Rod', cost: 25000, luck: 15, value: 18, lore: 'Its pulse follows the hidden reef.' },
  { level: 5, icon: '🎀', name: 'Celestial Ribbon', cost: 50000, luck: 22, value: 28, lore: 'A graceful reel for collectors with patience.' },
  { level: 6, icon: '🌌', name: 'Moonwake Rod', cost: 100000, luck: 30, value: 40, lore: 'Leaves a silver wake across the water.' },
  { level: 7, icon: '🔮', name: 'Aurora Glass Rod', cost: 200000, luck: 40, value: 55, lore: 'Catches color before it becomes a fish.' },
  { level: 8, icon: '🌠', name: 'Starlight Harpoon', cost: 400000, luck: 52, value: 75, lore: 'Built for the boldest celestial pulls.' },
  { level: 9, icon: '☾', name: 'Tsukuyomi Thread', cost: 800000, luck: 68, value: 100, lore: 'A forbidden line that hums beneath moonlight.' },
  { level: 10, icon: '👑', name: 'Yachiyo’s Fateweaver', cost: 1500000, luck: 90, value: 135, lore: 'The final reel: fate bends before the cast.' }
  ,{ level: 11, icon: '🌙', name: 'Lunar Prism Rod', cost: 3000000, luck: 115, value: 175, lore: 'Its crystal line catches reflections from impossible tides.' }
  ,{ level: 12, icon: '💫', name: 'Eternal Celestial Loom', cost: 6000000, luck: 145, value: 225, lore: 'The legendary final weave, reserved for those who follow every star.' }
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
  const charged=await query('UPDATE economy_users SET wallet=wallet-$1, updated_at=NOW() WHERE user_id=$2 AND wallet>=$1', [next.cost, userId]); if (!charged.rowCount) throw new Error('Your wallet changed before the upgrade completed. Please try again.'); await query('INSERT INTO economy_transactions (user_id,type,amount,metadata) VALUES ($1,$2,$3,$4)', [userId,'fish_rod_upgrade',-next.cost,JSON.stringify({rod:next.name})]);
  return next;
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
  return (await query(
    'SELECT item_id, quantity, EXTRACT(EPOCH FROM (expires_at - NOW()))::int AS seconds_left FROM fish_items WHERE user_id = $1 AND quantity > 0 ORDER BY item_id',
    [userId],
  )).rows;
}

export async function getFishingBonuses(userId) {
  const rod = await getRod(userId);
  const effects = await getActiveEffects(userId);
  const ids = effects.map(effect => effect.item_id);
  return {
    rod,
    effects,
    luckBonus: rod.tier.luck + (ids.includes('luck_drink') ? 15 : 0),
    valueBonus: rod.tier.value + (ids.includes('value_drink') ? 25 : 0)
  };
}
