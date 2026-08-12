import { query } from '../database/db.js';

let ready = false;
const cache = new Map();

async function ensureTable() {
  if (ready) return;
  await query(`CREATE TABLE IF NOT EXISTS auto_react_settings (
    guild_id TEXT NOT NULL, channel_id TEXT NOT NULL, emojis JSONB NOT NULL DEFAULT '[]',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY (guild_id, channel_id)
  )`);
  ready = true;
}

export function parseAutoReactEmojis(value) {
  const emojis = [...new Set((value.match(/<a?:[A-Za-z0-9_]+:\d+>|[^\s,]+/gu) ?? [])
    .map(emoji => emoji.trim())
    .filter(emoji => /^<a?:[A-Za-z0-9_]+:\d+>$/.test(emoji) || /\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(emoji)))];
  if (!emojis.length) throw new Error('Add at least one emoji, separated with commas or spaces.');
  if (emojis.length > 20) throw new Error('Discord allows a maximum of 20 reactions per message.');
  return emojis;
}

export async function saveAutoReacts(guildId, channelId, emojis) {
  await ensureTable();
  await query(`INSERT INTO auto_react_settings (guild_id,channel_id,emojis) VALUES ($1,$2,$3::jsonb)
    ON CONFLICT (guild_id,channel_id) DO UPDATE SET emojis=EXCLUDED.emojis,updated_at=NOW()`, [guildId, channelId, JSON.stringify(emojis)]);
  cache.set(`${guildId}:${channelId}`, emojis);
}

export async function getAutoReacts(guildId, channelId) {
  await ensureTable();
  const key = `${guildId}:${channelId}`;
  if (cache.has(key)) return cache.get(key);
  const row = (await query('SELECT emojis FROM auto_react_settings WHERE guild_id=$1 AND channel_id=$2', [guildId, channelId])).rows[0];
  const emojis = Array.isArray(row?.emojis) ? row.emojis : [];
  cache.set(key, emojis);
  return emojis;
}

export async function listAutoReacts(guildId) {
  await ensureTable();
  return (await query('SELECT channel_id,emojis FROM auto_react_settings WHERE guild_id=$1 ORDER BY updated_at DESC', [guildId])).rows;
}

export async function clearAutoReacts(guildId, channelId) {
  await ensureTable();
  await query('DELETE FROM auto_react_settings WHERE guild_id=$1 AND channel_id=$2', [guildId, channelId]);
  cache.delete(`${guildId}:${channelId}`);
}
