import { query } from '../database/db.js';

const pausedGuilds = new Set();

export async function loadPausedGuilds() {
  await query(`CREATE TABLE IF NOT EXISTS yachiyo_pause_settings (
    guild_id TEXT PRIMARY KEY, paused BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  const result = await query('SELECT guild_id FROM yachiyo_pause_settings WHERE paused=TRUE');
  pausedGuilds.clear();
  for (const row of result.rows) pausedGuilds.add(row.guild_id);
}

export function isGuildPaused(guildId) {
  return Boolean(guildId && pausedGuilds.has(guildId));
}

export async function setGuildPaused(guildId, paused) {
  await query(`INSERT INTO yachiyo_pause_settings (guild_id,paused) VALUES ($1,$2)
    ON CONFLICT (guild_id) DO UPDATE SET paused=EXCLUDED.paused,updated_at=NOW()`, [guildId, paused]);
  if (paused) pausedGuilds.add(guildId);
  else pausedGuilds.delete(guildId);
}
