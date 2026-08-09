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

const normalizeIntroductionLabel = value => String(value ?? '')
  .replace(/<a?:[A-Za-z0-9_]{2,32}:\d+>/g, '')
  .replace(/\s+/g, ' ')
  .trim()
  .toLocaleLowerCase();

const templateFields = template => template.split('\n')
  .map(line => line.replace(/<a?:[A-Za-z0-9_]{2,32}:\d+>/g, '').match(/^\s*(.*?)\s*:\s*$/))
  .filter(Boolean)
  .map(([, label]) => normalizeIntroductionLabel(label));

export function isIntroductionTemplateValid(content, template) {
  const fields = templateFields(template);
  if (!fields.length) return false;
  const lines = new Map(content.split('\n').map(line => {
    const match = line.replace(/<a?:[A-Za-z0-9_]{2,32}:\d+>/g, '').match(/^\s*(.*?)\s*:\s*(.*)$/);
    return match ? [normalizeIntroductionLabel(match[1]), match[2].trim()] : null;
  }).filter(Boolean));
  return fields.every(field => lines.has(field) && lines.get(field).length > 0);
}

export async function getIntroductionSettings(guildId) {
  const { rows } = await query('SELECT * FROM introduction_settings WHERE guild_id = $1', [guildId]);
  return rows[0] ?? null;
}

export async function saveIntroductionSettings({ guildId, channelId, template, panelTitle, panelMessage, rewardRoleId = null }) {
  const { rows } = await query(`
    INSERT INTO introduction_settings (guild_id, channel_id, template, panel_title, panel_message, reward_role_id)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (guild_id) DO UPDATE SET channel_id = EXCLUDED.channel_id,
      template = EXCLUDED.template, panel_title = EXCLUDED.panel_title,
      panel_message = EXCLUDED.panel_message, reward_role_id = EXCLUDED.reward_role_id, updated_at = NOW()
    RETURNING *`, [guildId, channelId, template, panelTitle, panelMessage, rewardRoleId]);
  return rows[0];
}

export async function getIntroductionCount(guildId, userId) {
  const { rows } = await query('SELECT count FROM introduction_counts WHERE guild_id = $1 AND user_id = $2', [guildId, userId]);
  return Number(rows[0]?.count ?? 0);
}

export async function setIntroductionPanelMessage(guildId, messageId) {
  await query('UPDATE introduction_settings SET panel_message_id = $2, updated_at = NOW() WHERE guild_id = $1', [guildId, messageId]);
}

export async function recordIntroduction(guildId, userId, messageId) {
  const { rows } = await query(`
    INSERT INTO introduction_counts (guild_id, user_id, count, introduction_message_id) VALUES ($1, $2, 1, $3)
    ON CONFLICT (guild_id, user_id) DO UPDATE SET count = introduction_counts.count + 1, introduction_message_id = EXCLUDED.introduction_message_id, updated_at = NOW()
    RETURNING count`, [guildId, userId, messageId]);
  return Number(rows[0].count);
}

export async function getIntroductionByMessageId(guildId, messageId) {
  const { rows } = await query('SELECT user_id FROM introduction_counts WHERE guild_id = $1 AND introduction_message_id = $2', [guildId, messageId]);
  return rows[0] ?? null;
}

export async function listIntroducedUsers(guildId) {
  const { rows } = await query('SELECT user_id FROM introduction_counts WHERE guild_id = $1 AND count > 0', [guildId]);
  return rows;
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

export async function setProtectedChannel(guildId, channelId, enabled = true) {
  if (enabled) await query(`INSERT INTO protected_channels (guild_id, channel_id) VALUES ($1, $2)
    ON CONFLICT (guild_id, channel_id) DO UPDATE SET enabled = TRUE`, [guildId, channelId]);
  else await query('DELETE FROM protected_channels WHERE guild_id = $1 AND channel_id = $2', [guildId, channelId]);
}

export async function isProtectedChannel(guildId, channelId) {
  const { rows } = await query('SELECT 1 FROM protected_channels WHERE guild_id = $1 AND channel_id = $2 AND enabled = TRUE', [guildId, channelId]);
  return rows.length > 0;
}

export async function listProtectedChannels(guildId) {
  const { rows } = await query('SELECT channel_id FROM protected_channels WHERE guild_id = $1 AND enabled = TRUE ORDER BY channel_id', [guildId]);
  return rows;
}
