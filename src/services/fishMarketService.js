import { query } from '../database/db.js';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function priceFor(row) {
  return Math.max(1, Math.round(Number(row.base_value) * Number(row.demand_multiplier)));
}

export async function recordSupply(fish) {
  const result = await query(
    'INSERT INTO fish_market_supply (fish_name, rarity, caught_count, base_value, demand_multiplier, updated_at) VALUES ($1,$2,1,$3,1.00,NOW()) ON CONFLICT (fish_name) DO UPDATE SET caught_count=fish_market_supply.caught_count+1, updated_at=NOW() RETURNING fish_name, rarity, caught_count, base_value, demand_multiplier',
    [fish.name, fish.rarity, Number(fish.value || 20)]
  );
  const row = result.rows[0];
  const supply = Number(row.caught_count);
  // A busy fish becomes cheaper; scarce fish retain a premium, within safe limits.
  const multiplier = clamp(1.35 - Math.log10(supply + 1) * 0.22, 0.55, 1.35);
  const updated = await query(
    'UPDATE fish_market_supply SET demand_multiplier=$1, updated_at=NOW() WHERE fish_name=$2 RETURNING fish_name, rarity, caught_count, base_value, demand_multiplier, updated_at',
    [multiplier, fish.name]
  );
  const current = updated.rows[0];
  await query(
    'INSERT INTO fish_market_history (fish_name, rarity, price, demand_multiplier, caught_count) VALUES ($1,$2,$3,$4,$5)',
    [current.fish_name, current.rarity, priceFor(current), current.demand_multiplier, current.caught_count]
  );
  return { ...current, price: priceFor(current) };
}

export async function getMarketSnapshot() {
  const { rows } = await query(
    'SELECT fish_name, rarity, caught_count, base_value, demand_multiplier, updated_at FROM fish_market_supply ORDER BY demand_multiplier DESC, caught_count DESC, fish_name ASC'
  );
  return rows.map(row => ({ ...row, price: priceFor(row) }));
}

export async function getMarketFish(fishName) {
  const { rows } = await query(
    'SELECT fish_name, rarity, caught_count, base_value, demand_multiplier, updated_at FROM fish_market_supply WHERE LOWER(fish_name)=LOWER($1)',
    [fishName]
  );
  return rows[0] ? { ...rows[0], price: priceFor(rows[0]) } : null;
}

export async function getMarketHistory(fishName = null, limit = 10) {
  const params = fishName ? [fishName, limit] : [limit];
  const sql = fishName
    ? 'SELECT fish_name, rarity, price, demand_multiplier, caught_count, recorded_at FROM fish_market_history WHERE LOWER(fish_name)=LOWER($1) ORDER BY recorded_at DESC LIMIT $2'
    : 'SELECT fish_name, rarity, price, demand_multiplier, caught_count, recorded_at FROM fish_market_history ORDER BY recorded_at DESC LIMIT $1';
  return (await query(sql, params)).rows;
}

export function formatMarketLines(rows) {
  if (!rows.length) return '*The tide market is waiting for its first catch.*';
  return rows.slice(0, 12).map(row => {
    const trend = Number(row.demand_multiplier) >= 1 ? '📈' : '📉';
    const price = Number(row.price).toLocaleString();
    return trend + ' **' + row.fish_name + '** · ' + row.rarity + ' · **' + price + '** coins · ' + row.caught_count + ' caught';
  }).join('\n');
}
