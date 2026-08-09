import { query } from '../database/db.js';

export const DEFAULT_INTRO_PANEL_TITLE = '🌷 INTRODUCTION CHANNEL';
export const DEFAULT_INTRO_PANEL_BODY = 'Click the button below to get your introduction template.';

export const DEFAULT_INTRO_TEMPLATE = [
  '╭ ୨୧ㆍ⏔ㆍ⏔ㆍ⏔ㆍ⏔ㆍ✧ˎ˗',
  '',
  "ㆍ・ㆍName's Introduction ꒱꒱",
  '                       ⏝ ︶ ꒦ ꒷',
  '',
  'ㆍ✧ㆍName﹕',
  'ㆍ✦ㆍAge﹕',
  'ㆍ✧ㆍPronouns﹕',
  '                       ⏝ ︶ ꒦ ꒷',
  '',
  'ㆍ✧ㆍLikes﹕',
  'ㆍ✦ㆍDislikes﹕',
  '                       ⏝ ︶ ꒦ ꒷',
  '',
  'ㆍ✧ㆍHobbies﹕',
  'ㆍ✦ㆍExtra Info﹕',
  '                       ⏝ ︶ ꒦ ꒷',
  '',
  ': ¨· . ·¨ :',
  '  ㆍ.ㆍThanks For Reading!',
  '╰ ୨୧ㆍ⏔ㆍ⏔ㆍ⏔ㆍ✧ˎ˗'
].join('\n');

export function withIntroductionDefaults(settings = {}) {
  return {
    ...settings,
    intro_panel_title: settings.intro_panel_title || DEFAULT_INTRO_PANEL_TITLE,
    intro_panel_body: settings.intro_panel_body || DEFAULT_INTRO_PANEL_BODY,
    intro_template: settings.intro_template || DEFAULT_INTRO_TEMPLATE,
    intro_message_limit: Number(settings.intro_message_limit || 3)
  };
}

export async function getIntroductionSettings(guildId) {
  const result = await query(
    'SELECT guild_id, intro_channel_id, intro_panel_message_id, intro_panel_title, intro_panel_body, intro_template, intro_message_limit FROM guild_settings WHERE guild_id = $1',
    [guildId]
  );
  return withIntroductionDefaults(result.rows[0] || { guild_id: guildId });
}

export async function saveIntroductionSettings(guildId, updates = {}) {
  const current = await getIntroductionSettings(guildId);
  const next = {
    channelId: updates.channelId ?? current.intro_channel_id ?? null,
    panelMessageId: updates.panelMessageId ?? current.intro_panel_message_id ?? null,
    panelTitle: updates.panelTitle ?? current.intro_panel_title,
    panelBody: updates.panelBody ?? current.intro_panel_body,
    template: updates.template ?? current.intro_template,
    messageLimit: updates.messageLimit ?? current.intro_message_limit ?? 3
  };
  const result = await query(
    `INSERT INTO guild_settings
       (guild_id, intro_channel_id, intro_panel_message_id, intro_panel_title, intro_panel_body, intro_template, intro_message_limit)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (guild_id) DO UPDATE SET
       intro_channel_id = EXCLUDED.intro_channel_id,
       intro_panel_message_id = EXCLUDED.intro_panel_message_id,
       intro_panel_title = EXCLUDED.intro_panel_title,
       intro_panel_body = EXCLUDED.intro_panel_body,
       intro_template = EXCLUDED.intro_template,
       intro_message_limit = EXCLUDED.intro_message_limit
     RETURNING guild_id, intro_channel_id, intro_panel_message_id, intro_panel_title, intro_panel_body, intro_template, intro_message_limit`,
    [guildId, next.channelId, next.panelMessageId, next.panelTitle, next.panelBody, next.template, next.messageLimit]
  );
  return withIntroductionDefaults(result.rows[0]);
}

export async function setIntroductionPanelMessageId(guildId, messageId) {
  return saveIntroductionSettings(guildId, { panelMessageId: messageId });
}

export async function incrementIntroductionUsage(guildId, userId) {
  const result = await query(
    `INSERT INTO introduction_usage (guild_id, user_id, message_count)
     VALUES ($1, $2, 1)
     ON CONFLICT (guild_id, user_id) DO UPDATE
       SET message_count = introduction_usage.message_count + 1,
           updated_at = NOW()
     RETURNING message_count`,
    [guildId, userId]
  );
  return Number(result.rows[0]?.message_count || 0);
}
