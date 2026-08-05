import { query } from '../database/db.js';

export async function recordSupply(fish) {
  await query(
    'INSERT INTO fish_market_supply (fish_name, rarity, caught_count, updated_at) VALUES ($1,$2,1,$3,NOW()) ON CONFLICT (fish_name) DO UPDATE SET caught_count=fish_market_supply.caught_count+1, updated_at=NOW()',
    [fish.name, fish.rarity, Number(fish.value || 20)]
  );
}

export async function getMarketSnapshot() {
  const { rows } = await query('SELECT fish_name, rarity, caught_count, base_value, demand_multiplier, updated_at FROM fish_market_supply ORDER BY caught_count DESC, fish_name ASC');
  return rows.map(row => ({ ...row, price: Math.max(1, Math.round(Number(row.base_value) * Number(row.demand_multiplier))) }));
}

export async function getMarketFish(fishName) {
  const { rows } = await query('SELECT fish_name, rarity, caught_count, base_value, demand_multiplier, updated_at FROM fish_market_supply WHERE LOWER(fish_name)=LOWER($1)', [fishName]);
  return rows[0] ? { ...rows[0], price: Math.max(1, Math.round(Number(rows[0].base_value) * Number(rows[0].demand_multiplier))) } : null;
}

export function formatMarketLines(rows) {
  if (!rows.length) return '*The tide market is waiting for its first catch.*';
  return rows.slice(0, 12).map(row => {
    const trend = Number(row.demand_multiplier) >= 1 ? '📈' : '📉';
    return trend + ' **' + row.fish_name + '** · ' + row.rarity + ' · **' + row.price.toLocaleString() + '** coins · ' + row.caught_count + ' caught';
  }).join('\n');
}
