import { query } from '../database/db.js';

export const DEFAULT_SERVER_INFO = {
  title: 'SERVER INFO',
  description: '₊˚⊹ᰔ A little guide to our shared space.\n\nEverything here updates from Discord, so it always reflects the server you are in.',
  extra_info: '♡ Please be kind, respect one another, and make yourself at home.',
};

export async function setupServerInfo(guildId, channelId, bannerUrl = null) {
  await query(`INSERT INTO server_info_settings (guild_id, channel_id, banner_url, title, description, extra_info)
    VALUES ($1,$2,$3,$4,$5,$6)
    ON CONFLICT (guild_id) DO UPDATE SET channel_id=EXCLUDED.channel_id,
      banner_url=COALESCE(EXCLUDED.banner_url, server_info_settings.banner_url), updated_at=NOW()`,
    [guildId, channelId, bannerUrl, DEFAULT_SERVER_INFO.title, DEFAULT_SERVER_INFO.description, DEFAULT_SERVER_INFO.extra_info]);
  return getServerInfo(guildId);
}

export async function getServerInfo(guildId) {
  return (await query('SELECT * FROM server_info_settings WHERE guild_id=$1', [guildId])).rows[0] ?? null;
}

export async function saveServerInfoPanel(guildId, messageId) {
  await query('UPDATE server_info_settings SET panel_message_id=$2, updated_at=NOW() WHERE guild_id=$1', [guildId, messageId]);
}

export async function updateServerInfo(guildId, { title, description, extraInfo }) {
  await query(`UPDATE server_info_settings SET title=$2, description=$3, extra_info=$4, updated_at=NOW() WHERE guild_id=$1`,
    [guildId, title, description, extraInfo]);
}

export async function updateServerInfoBanner(guildId, bannerUrl) {
  await query('UPDATE server_info_settings SET banner_url=$2, updated_at=NOW() WHERE guild_id=$1', [guildId, bannerUrl]);
}
