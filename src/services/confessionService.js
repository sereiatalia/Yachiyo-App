import { query } from '../database/db.js';

export async function createConfession({ guildId, authorId, content }) {
  const result = await query(
    'INSERT INTO confessions (guild_id, author_user_id, content) VALUES ($1,$2,$3) RETURNING id, created_at',
    [guildId, authorId, content]
  );
  return result.rows[0];
}

export async function recentConfessions(guildId, limit = 25) {
  const result = await query(
    'SELECT id, author_user_id, content, created_at FROM confessions WHERE guild_id=$1 ORDER BY id DESC LIMIT $2',
    [guildId, limit]
  );
  return result.rows;
}

export async function setConfessionChannel(guildId, channelId) {
  await query(
    'INSERT INTO guild_settings (guild_id, confession_channel_id) VALUES ($1,$2) ON CONFLICT (guild_id) DO UPDATE SET confession_channel_id=$2, updated_at=NOW()',
    [guildId, channelId]
  );
}

export async function getConfessionChannel(guildId) {
  const result = await query('SELECT confession_channel_id FROM guild_settings WHERE guild_id=$1', [guildId]);
  return result.rows[0]?.confession_channel_id ?? null;
}
