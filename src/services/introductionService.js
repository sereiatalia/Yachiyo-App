import { query } from '../database/db.js';

export const DEFAULT_INTRODUCTION_TEMPLATE = [
  '୨୧ ─────────────── ୨୧',
  'Name: ',
  'Pronouns: ',
  'Age: ',
  'About me: ',
  '୨୧ ─────────────── ୨୧',
].join('\n');

// Discord only renders custom emojis when they are sent as <:name:id> or
// <a:name:id>; typing :name: in a message remains plain text.
export function renderServerEmojis(content, guild) {
  return String(content ?? '').replace(/:([A-Za-z0-9_]{2,32}):/g, (match, name) => {
    const emoji = guild?.emojis?.cache?.find(item => item.name?.toLowerCase() === name.toLowerCase());
    return emoji ? emoji.toString() : match;
  });
}

const templateFields = template => template.split('\n')
  .map(line => line.match(/^\s*([^:\n]+):\s*(.*)$/))
  .filter(Boolean)
  .map(([, label]) => label.trim().toLowerCase());

export function isIntroductionTemplateValid(content, template) {
  const fields = templateFields(template);
  if (!fields.length) return false;
  const lines = new Map(content.split('\n').map(line => {
    const match = line.match(/^\s*([^:\n]+):\s*(.*)$/);
    return match ? [match[1].trim().toLowerCase(), match[2].trim()] : null;
  }).filter(Boolean));
  return fields.every(field => lines.has(field) && lines.get(field).length > 0);
}

export async function getIntroductionSettings(guildId) {
  const { rows } = await query('SELECT * FROM introduction_settings WHERE guild_id = $1', [guildId]);
  return rows[0] ?? null;
}

export async function saveIntroductionSettings({ guildId, channelId, template, panelTitle, panelMessage }) {
  const { rows } = await query(`
    INSERT INTO introduction_settings (guild_id, channel_id, template, panel_title, panel_message)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (guild_id) DO UPDATE SET channel_id = EXCLUDED.channel_id,
      template = EXCLUDED.template, panel_title = EXCLUDED.panel_title,
      panel_message = EXCLUDED.panel_message, updated_at = NOW()
    RETURNING *`, [guildId, channelId, template, panelTitle, panelMessage]);
  return rows[0];
}

export async function getIntroductionCount(guildId, userId) {
  const { rows } = await query('SELECT count FROM introduction_counts WHERE guild_id = $1 AND user_id = $2', [guildId, userId]);
  return Number(rows[0]?.count ?? 0);
}

export async function setIntroductionPanelMessage(guildId, messageId) {
  await query('UPDATE introduction_settings SET panel_message_id = $2, updated_at = NOW() WHERE guild_id = $1', [guildId, messageId]);
}

export async function recordIntroduction(guildId, userId) {
  const { rows } = await query(`
    INSERT INTO introduction_counts (guild_id, user_id, count) VALUES ($1, $2, 1)
    ON CONFLICT (guild_id, user_id) DO UPDATE SET count = introduction_counts.count + 1, updated_at = NOW()
    RETURNING count`, [guildId, userId]);
  return Number(rows[0].count);
}

export async function resetIntroduction(guildId, userId) {
  await query('DELETE FROM introduction_counts WHERE guild_id = $1 AND user_id = $2', [guildId, userId]);
}

export async function getIntroductionStatus(guildId) {
  const { rows } = await query(`SELECT s.*, COALESCE(SUM(c.count), 0)::int AS accepted_count
    FROM introduction_settings s LEFT JOIN introduction_counts c ON c.guild_id = s.guild_id
    WHERE s.guild_id = $1 GROUP BY s.guild_id`, [guildId]);
  return rows[0] ?? null;
}
