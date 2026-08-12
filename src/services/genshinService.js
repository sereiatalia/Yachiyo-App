import { query } from '../database/db.js';

let ready = false;
const profileCache = new Map();
const PROFILE_CACHE_MS = 2 * 60 * 1000;

const pause = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function ensureTables() {
  if (ready) return;
  await query(`CREATE TABLE IF NOT EXISTS genshin_profiles (
    guild_id TEXT NOT NULL, discord_user_id TEXT NOT NULL, player_uid TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY (guild_id, discord_user_id)
  )`);
  await query(`CREATE TABLE IF NOT EXISTS genshin_panel_settings (
    guild_id TEXT PRIMARY KEY, channel_id TEXT NOT NULL, panel_message_id TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  ready = true;
}

export function normalizeGenshinUid(uid) {
  const value = String(uid ?? '').trim().replace(/\s/g, '');
  if (!/^\d{9}$/.test(value)) throw new Error('Enter a valid 9-digit Genshin Impact UID.');
  return value;
}

export async function fetchGenshinProfile(uid) {
  const normalized = normalizeGenshinUid(uid);
  const cached = profileCache.get(normalized);
  if (cached && Date.now() - cached.savedAt < PROFILE_CACHE_MS) return cached.data;

  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      // `?info` deliberately requests player info only: no character showcase is fetched or displayed.
      const response = await fetch(`https://enka.network/api/uid/${normalized}/?info`, {
        headers: { Accept: 'application/json', 'User-Agent': 'Yachiyo-App/1.0 (+https://github.com/sereiatalia/Yachiyo-App)' },
        signal: AbortSignal.timeout(12_000),
      });
      if (response.status === 404) throw new Error('That UID was not found, or its Genshin profile is private.');
      if (!response.ok) throw new Error(`Genshin profile service returned HTTP ${response.status}.`);
      const data = await response.json();
      if (!data?.playerInfo?.nickname) throw new Error('That UID has no public Genshin profile data. Make your in-game profile public, then try again.');
      profileCache.set(normalized, { data, savedAt: Date.now() });
      return data;
    } catch (error) {
      if (error.message.startsWith('That UID was not found') || error.message.startsWith('That UID has no public')) throw error;
      lastError = error;
      console.warn(`[GENSHIN] profile lookup failed for ${normalized} (attempt ${attempt}/3): ${error.message}`);
      if (attempt < 3) await pause(attempt * 900);
    }
  }
  console.error(`[GENSHIN] profile lookup unavailable for ${normalized}: ${lastError?.message ?? 'unknown error'}`);
  throw new Error('The Genshin profile service is temporarily busy. Yachiyo tried three times—please try again in a minute.');
}

export async function saveGenshinProfile(guildId, discordUserId, uid) {
  await ensureTables();
  await query(`INSERT INTO genshin_profiles (guild_id, discord_user_id, player_uid) VALUES ($1, $2, $3)
    ON CONFLICT (guild_id, discord_user_id) DO UPDATE SET player_uid=EXCLUDED.player_uid, updated_at=NOW()`, [guildId, discordUserId, normalizeGenshinUid(uid)]);
}
export async function getGenshinProfile(guildId, discordUserId) { await ensureTables(); return (await query('SELECT * FROM genshin_profiles WHERE guild_id=$1 AND discord_user_id=$2', [guildId, discordUserId])).rows[0] ?? null; }
export async function saveGenshinPanel(guildId, channelId) { await ensureTables(); await query(`INSERT INTO genshin_panel_settings (guild_id, channel_id) VALUES ($1, $2) ON CONFLICT (guild_id) DO UPDATE SET channel_id=EXCLUDED.channel_id, updated_at=NOW()`, [guildId, channelId]); }
export async function getGenshinPanel(guildId) { await ensureTables(); return (await query('SELECT * FROM genshin_panel_settings WHERE guild_id=$1', [guildId])).rows[0] ?? null; }
export async function setGenshinPanelMessage(guildId, messageId) { await ensureTables(); await query('UPDATE genshin_panel_settings SET panel_message_id=$2, updated_at=NOW() WHERE guild_id=$1', [guildId, messageId]); }
