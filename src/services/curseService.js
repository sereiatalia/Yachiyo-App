import { query } from '../database/db.js';

function normalizeWord(value) {
  return String(value ?? '').trim().toLocaleLowerCase();
}

export function parseCurseWords(input) {
  return [...new Set(String(input ?? '')
    .split(/[\n,]+/)
    .map(normalizeWord)
    .filter(word => word.length >= 2 && word.length <= 64))];
}

export async function setCurseWords(guildId, words) {
  const normalized = [...new Set((words ?? []).map(normalizeWord).filter(Boolean))];
  const result = await query(
    `INSERT INTO curse_settings (guild_id, enabled, words, updated_at)
     VALUES ($1, FALSE, $2::text[], NOW())
     ON CONFLICT (guild_id) DO UPDATE SET words=EXCLUDED.words, updated_at=NOW()
     RETURNING guild_id, enabled, words`,
    [guildId, normalized],
  );
  return result.rows[0];
}

export async function addCurseWords(guildId, words) {
  const normalized = [...new Set((words ?? []).map(normalizeWord).filter(Boolean))];
  const result = await query(
    `INSERT INTO curse_settings (guild_id, enabled, words, updated_at)
     VALUES ($1, TRUE, $2::text[], NOW())
     ON CONFLICT (guild_id) DO UPDATE
       SET words = ARRAY(
         SELECT DISTINCT word
         FROM unnest(COALESCE(curse_settings.words, '{}') || EXCLUDED.words) AS word
         ORDER BY word
       ),
       updated_at=NOW()
     RETURNING guild_id, enabled, words`,
    [guildId, normalized],
  );
  return result.rows[0];
}

export async function setCurseEnabled(guildId, enabled) {
  const result = await query(
    `INSERT INTO curse_settings (guild_id, enabled, words, updated_at)
     VALUES ($1, $2, '{}', NOW())
     ON CONFLICT (guild_id) DO UPDATE SET enabled=EXCLUDED.enabled, updated_at=NOW()
     RETURNING guild_id, enabled, words`,
    [guildId, enabled],
  );
  return result.rows[0];
}

export async function getCurseSettings(guildId) {
  const result = await query('SELECT enabled, words FROM curse_settings WHERE guild_id=$1', [guildId]);
  return result.rows[0] ?? { enabled: false, words: [] };
}

async function ensureCurseExemptRolesTable() {
  await query(`CREATE TABLE IF NOT EXISTS curse_exempt_roles (
    guild_id TEXT NOT NULL, role_id TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (guild_id, role_id)
  )`);
}
export async function addCurseExemptRole(guildId, roleId) {
  await ensureCurseExemptRolesTable();
  await query('INSERT INTO curse_exempt_roles (guild_id,role_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',[guildId,roleId]);
}
export async function removeCurseExemptRole(guildId, roleId) { await ensureCurseExemptRolesTable(); await query('DELETE FROM curse_exempt_roles WHERE guild_id=$1 AND role_id=$2',[guildId,roleId]); }
export async function getCurseExemptRoles(guildId) { await ensureCurseExemptRolesTable(); return (await query('SELECT role_id FROM curse_exempt_roles WHERE guild_id=$1 ORDER BY created_at ASC',[guildId])).rows; }

export function findMatchedCurseWords(content, words) {
  const message = String(content ?? '');
  return [...new Set((words ?? [])
    .map(normalizeWord)
    .filter(word => {
      if (!word) return false;
      const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      try {
        // Keep curse words as standalone terms. The doubled slashes are
        // required here because this pattern is built from a JavaScript string.
        return new RegExp(`(?:^|[^\\p{L}\\p{N}_])${escaped}(?=$|[^\\p{L}\\p{N}_])`, 'iu').test(message);
      } catch {
        return false;
      }
    }))].sort((a, b) => b.length - a.length);
}

export async function recordCurseWarning({ guildId, userId, word }) {
  const result = await query(
    `INSERT INTO curse_warnings (guild_id, user_id, word, warning_count, last_warned_at)
     VALUES ($1, $2, $3, 1, NOW())
     ON CONFLICT (guild_id, user_id, word)
     DO UPDATE SET warning_count=curse_warnings.warning_count+1, last_warned_at=NOW()
     RETURNING warning_count`,
    [guildId, userId, normalizeWord(word)],
  );
  return result.rows[0]?.warning_count ?? 1;
}
