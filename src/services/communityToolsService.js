import { query } from '../database/db.js';

const DEFAULT_WELCOME = '🌸 Welcome, {user}, to {server}! Please enjoy your stay.';
const DEFAULT_GOODBYE = '🌙 {username} has left {server}. We wish you safe travels.';
const DEFAULT_INTRO_PANEL = '🌷 INTRODUCTION CHANNEL\n\nClick the button below to get the introduction template.';
const DEFAULT_INTRO_TEMPLATE = '╭ ୨୧ㆍ⏔ㆍ⏔ㆍ⏔ㆍ⏔ㆍ⏔ㆍ✧ˎ˗\n\nㆍ・ㆍ{username}\'s Introduction ꒱꒱\n\nㆍ✧ㆍName﹕\nㆍ✦ㆍAge﹕\nㆍ✧ㆍPronouns﹕\n\nㆍ✧ㆍLikes﹕\nㆍ✦ㆍDislikes﹕\n\nㆍ✧ㆍHobbies﹕\nㆍ✦ㆍExtra Info﹕\n\nㆍ.ㆍThanks For Reading!\n╰ ୨୧ㆍ⏔ㆍ⏔ㆍ⏔ㆍ⏔ㆍ⏔ㆍ✧ˎ˗';

export async function getCommunitySettings(guildId) {
  const { rows } = await query('SELECT * FROM guild_settings WHERE guild_id = $1', [guildId]);
  return rows[0] ?? {
    guild_id: guildId,
    welcome_message: DEFAULT_WELCOME,
    goodbye_message: DEFAULT_GOODBYE,
    intro_panel_title: '🌷 INTRODUCTION CHANNEL',
    intro_panel_body: 'Click the button below to get the introduction template.',
    intro_template: DEFAULT_INTRO_TEMPLATE,
    intro_message_limit: 3
  };
}

export async function saveWelcomeSettings(guildId, channelId, message) {
  await query(
    `INSERT INTO guild_settings (guild_id, welcome_channel_id, welcome_message)
     VALUES ($1, $2, COALESCE($3, $4))
     ON CONFLICT (guild_id) DO UPDATE SET welcome_channel_id = $2, welcome_message = COALESCE($3, guild_settings.welcome_message, $4), updated_at = NOW()`,
    [guildId, channelId, message || null, DEFAULT_WELCOME]
  );
  return getCommunitySettings(guildId);
}

export async function saveGoodbyeSettings(guildId, channelId, message) {
  await query(
    `INSERT INTO guild_settings (guild_id, goodbye_channel_id, goodbye_message)
     VALUES ($1, $2, COALESCE($3, $4))
     ON CONFLICT (guild_id) DO UPDATE SET goodbye_channel_id = $2, goodbye_message = COALESCE($3, guild_settings.goodbye_message, $4), updated_at = NOW()`,
    [guildId, channelId, message || null, DEFAULT_GOODBYE]
  );
  return getCommunitySettings(guildId);
}

export async function saveIntroductionSettings(guildId, channelId, panelMessageId, panelBody, template) {
  await query(
    `INSERT INTO guild_settings (guild_id, intro_channel_id, intro_panel_message_id, intro_panel_title, intro_panel_body, intro_template, intro_message_limit)
     VALUES ($1, $2, $3, $4, $5, COALESCE($6, $7), 3)
     ON CONFLICT (guild_id) DO UPDATE SET intro_channel_id = $2, intro_panel_message_id = $3, intro_panel_title = $4, intro_panel_body = $5, intro_template = COALESCE($6, guild_settings.intro_template, $7), intro_message_limit = 3, updated_at = NOW()`,
    [guildId, channelId, panelMessageId || null, '🌷 INTRODUCTION CHANNEL', panelBody || 'Click the button below to get the introduction template.', template || null, DEFAULT_INTRO_TEMPLATE]
  );
  return getCommunitySettings(guildId);
}

export async function setIntroductionPanelMessageId(guildId, messageId) {
  await query('UPDATE guild_settings SET intro_panel_message_id = $2, updated_at = NOW() WHERE guild_id = $1', [guildId, messageId]);
}

export async function incrementIntroductionUsage(guildId, userId) {
  const { rows } = await query(
    `INSERT INTO introduction_usage (guild_id, user_id, message_count)
     VALUES ($1, $2, 1)
     ON CONFLICT (guild_id, user_id) DO UPDATE SET message_count = introduction_usage.message_count + 1
     RETURNING message_count`,
    [guildId, userId]
  );
  return rows[0]?.message_count ?? 1;
}
