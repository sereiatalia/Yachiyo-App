import { query } from './db.js';

export const DEFAULT_WELCOME_MESSAGE = 'Welcome, {user}, to {server}! 🌸';
export const DEFAULT_GOODBYE_MESSAGE = '{user} has left {server}. We wish you well. 🌙';
export const DEFAULT_INTRO_PANEL_TITLE = 'INTRODUCTION CHANNEL';
export const DEFAULT_INTRO_PANEL_BODY = 'Click the button below to get the introduction template.';
export const DEFAULT_INTRO_TEMPLATE = `╭ ୨୧ㆍ⏔ㆍ⏔ㆍ⏔ㆍ⏔ㆍ⏔ㆍ✧ˎ˗
ㆍ・ㆍName's Introduction ꒱꒱
                       ⏝ ︶ ꒦ ꒷
ㆍ✧ㆍName﹕
ㆍ✦ㆍAge﹕
ㆍ✧ㆍPronouns﹕
                       ⏝ ︶ ꒦ ꒷
ㆍ✧ㆍLikes﹕
ㆍ✦ㆍDislikes﹕
                       ⏝ ︶ ꒦ ꒷
ㆍ✧ㆍHobbies﹕
ㆍ✦ㆍExtra Info﹕
                       ⏝ ︶ ꒦ ꒷
: ¨· . ·¨ :
  ㆍ.ㆍThanks For Reading!
╰ ୨୧ㆍ⏔ㆍ⏔ㆍ⏔ㆍ⏔ㆍ⏔ㆍ✧ˎ˗`;

const defaults = {
  welcome_message: DEFAULT_WELCOME_MESSAGE,
  goodbye_message: DEFAULT_GOODBYE_MESSAGE,
  intro_panel_title: DEFAULT_INTRO_PANEL_TITLE,
  intro_panel_body: DEFAULT_INTRO_PANEL_BODY,
  intro_template: DEFAULT_INTRO_TEMPLATE,
  intro_message_limit: 3
};

export async function getCommunitySettings(guildId) {
  const { rows } = await query('SELECT * FROM guild_settings WHERE guild_id = $1', [guildId]);
  return { ...defaults, ...(rows[0] ?? {}), guild_id: guildId };
}

export async function saveWelcomeSettings(guildId, channelId, message) {
  await query(`INSERT INTO guild_settings (guild_id, welcome_channel_id, welcome_message)
    VALUES ($1, $2, $3)
    ON CONFLICT (guild_id) DO UPDATE SET welcome_channel_id = EXCLUDED.welcome_channel_id,
    welcome_message = EXCLUDED.welcome_message, updated_at = NOW()`, [guildId, channelId, message || defaults.welcome_message]);
  return getCommunitySettings(guildId);
}

export async function saveGoodbyeSettings(guildId, channelId, message) {
  await query(`INSERT INTO guild_settings (guild_id, goodbye_channel_id, goodbye_message)
    VALUES ($1, $2, $3)
    ON CONFLICT (guild_id) DO UPDATE SET goodbye_channel_id = EXCLUDED.goodbye_channel_id,
    goodbye_message = EXCLUDED.goodbye_message, updated_at = NOW()`, [guildId, channelId, message || defaults.goodbye_message]);
  return getCommunitySettings(guildId);
}

export async function saveIntroductionSettings(guildId, channelId, panelTitle, panelBody, template) {
  await query(`INSERT INTO guild_settings
    (guild_id, intro_channel_id, intro_panel_title, intro_panel_body, intro_template, intro_message_limit)
    VALUES ($1, $2, $3, $4, $5, 3)
    ON CONFLICT (guild_id) DO UPDATE SET intro_channel_id = EXCLUDED.intro_channel_id,
    intro_panel_title = EXCLUDED.intro_panel_title, intro_panel_body = EXCLUDED.intro_panel_body,
    intro_template = EXCLUDED.intro_template, intro_message_limit = 3, updated_at = NOW()`,
    [guildId, channelId, panelTitle || defaults.intro_panel_title, panelBody || defaults.intro_panel_body, template || defaults.intro_template]);
  return getCommunitySettings(guildId);
}

export async function setIntroductionPanelMessageId(guildId, messageId) {
  await query('UPDATE guild_settings SET intro_panel_message_id = $2, updated_at = NOW() WHERE guild_id = $1', [guildId, messageId]);
}

export async function incrementIntroductionUsage(guildId, userId) {
  const { rows } = await query(`INSERT INTO introduction_usage (guild_id, user_id, message_count)
    VALUES ($1, $2, 1)
    ON CONFLICT (guild_id, user_id) DO UPDATE SET message_count = introduction_usage.message_count + 1
    RETURNING message_count`, [guildId, userId]);
  return rows[0]?.message_count ?? 1;
}

export function formatCommunityMessage(template, member) {
  return String(template || '')
    .replaceAll('{user}', member.toString())
    .replaceAll('{username}', member.user.username)
    .replaceAll('{server}', member.guild.name);
}
