import { query } from '../database/db.js';

/**
 * Panels whose feature has been removed from the bot.
 *
 * Deleting the code stops the buttons working, but the message stays in the server looking alive.
 * `/refresh-panels` reads this list, deletes the published message, and clears the stored row, so
 * removing a feature from the repository also removes it from Discord.
 *
 * To retire another panel: delete its code, then add its settings table here.
 */
export const RETIRED_PANELS = [
  { label: 'Roblox profile panel', table: 'roblox_panel_settings' },
  { label: 'Mobile Legends panel', table: 'mlbb_panel_settings' },
  { label: 'Honkai: Star Rail panel', table: 'hsr_panel_settings' },
  { label: 'Genshin profile panel', table: 'genshin_panel_settings' },
];

// Table names are interpolated into SQL, so only ever accept one this module declared.
function assertKnown(table) {
  if (!RETIRED_PANELS.some(panel => panel.table === table)) throw new Error(`Unknown retired panel table: ${table}`);
  return table;
}

export async function getRetiredPanel(table, guildId) {
  assertKnown(table);
  // The table may already be gone if the schema was trimmed; that is success, not an error.
  const exists = await query('SELECT to_regclass($1) AS table_name', [table]);
  if (!exists.rows[0]?.table_name) return null;
  const { rows } = await query(`SELECT * FROM ${table} WHERE guild_id=$1`, [guildId]);
  return rows[0] ?? null;
}

export async function clearRetiredPanel(table, guildId) {
  assertKnown(table);
  const exists = await query('SELECT to_regclass($1) AS table_name', [table]);
  if (!exists.rows[0]?.table_name) return;
  await query(`DELETE FROM ${table} WHERE guild_id=$1`, [guildId]);
}
