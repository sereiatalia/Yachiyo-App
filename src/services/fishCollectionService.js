import { query } from '../database/db.js';
import { FISH_RARITIES } from '../config/fishRarities.js';

export async function getFishDetails(fishName) {
  for (const [rarity, fish] of Object.entries(FISH_RARITIES)) {
    const found = Array.isArray(fish) ? fish.find(item => item.name === fishName) : null;
    if (found) return { ...found, rarity };
  }
  return null;
}

export async function listFavorites(userId) {
  return (await query(
    'SELECT fish_name, created_at FROM fish_favorites WHERE user_id=$1 ORDER BY created_at DESC',
    [userId]
  )).rows;
}

export async function isFavorite(userId, fishName) {
  const result = await query(
    'SELECT 1 FROM fish_favorites WHERE user_id=$1 AND fish_name=$2',
    [userId, fishName]
  );
  return Boolean(result.rowCount);
}

export async function toggleFavorite(userId, fishName) {
  const existing = await isFavorite(userId, fishName);
  if (existing) {
    await query('DELETE FROM fish_favorites WHERE user_id=$1 AND fish_name=$2', [userId, fishName]);
    return { favorite: false };
  }
  await query(
    'INSERT INTO fish_favorites (user_id, fish_name) VALUES ($1,$2) ON CONFLICT DO NOTHING',
    [userId, fishName]
  );
  return { favorite: true };
}

export async function getCompletion(userId) {
  const rows = (await query(
    'SELECT rarity, COUNT(*)::int AS total, COUNT(*) FILTER (WHERE quantity > 0)::int AS discovered FROM fish_inventory WHERE user_id=$1 GROUP BY rarity',
    [userId]
  )).rows;
  return rows.map(row => ({
    ...row,
    percent: row.total ? Math.round((row.discovered / row.total) * 100) : 0
  }));
}
