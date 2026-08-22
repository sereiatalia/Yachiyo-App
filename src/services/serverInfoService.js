import { query } from '../database/db.js';

export const DEFAULT_SERVER_INFO = {
  title: '⊹₊˚‧︵‿₊୨ SERVER INFO ୧₊‿︵‧˚₊⊹',
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

export async function updateServerInfoField(guildId, field, value) {
  const columns = { title: 'title', description: 'description', extra_info: 'extra_info' };
  const column = columns[field];
  if (!column) throw new Error('Unsupported server info field.');
  await query(`UPDATE server_info_settings SET ${column}=$2, updated_at=NOW() WHERE guild_id=$1`, [guildId, value]);
}

export async function updateServerInfoBanner(guildId, bannerUrl) {
  await query('UPDATE server_info_settings SET banner_url=$2, updated_at=NOW() WHERE guild_id=$1', [guildId, bannerUrl]);
}

export async function addServerInfoStaffRole(guildId, roleId) {
  await query(`INSERT INTO server_info_staff_roles (guild_id, role_id, sort_order)
    VALUES ($1,$2,COALESCE((SELECT MAX(sort_order)+1 FROM server_info_staff_roles WHERE guild_id=$1),1))
    ON CONFLICT (guild_id, role_id) DO UPDATE SET
      sort_order=(SELECT COALESCE(MAX(existing_roles.sort_order)+1,1) FROM server_info_staff_roles existing_roles WHERE existing_roles.guild_id=$1)`, [guildId, roleId]);
}

export async function removeServerInfoStaffRole(guildId, roleId) {
  await query('DELETE FROM server_info_staff_roles WHERE guild_id=$1 AND role_id=$2', [guildId, roleId]);
}

export async function getServerInfoStaffRoles(guildId) {
  return (await query('SELECT role_id FROM server_info_staff_roles WHERE guild_id=$1 ORDER BY sort_order ASC, role_id ASC', [guildId])).rows;
}

export async function recordProfileMessage(guildId, userId) {
  await query(`INSERT INTO member_profile_stats (guild_id,user_id,message_count,last_message_at) VALUES ($1,$2,1,NOW())
    ON CONFLICT (guild_id,user_id) DO UPDATE SET message_count=member_profile_stats.message_count+1,last_message_at=NOW()`, [guildId, userId]);
}

export async function getProfileStats(guildId, userId) {
  return (await query('SELECT message_count,last_message_at FROM member_profile_stats WHERE guild_id=$1 AND user_id=$2', [guildId,userId])).rows[0] ?? {message_count:0,last_message_at:null};
}

export async function replaceProfileMessageCounts(guildId, counts) {
  const userIds=[...counts.keys()];
  await query('DELETE FROM member_profile_stats WHERE guild_id=$1', [guildId]);
  if (!userIds.length) return;
  await query(`INSERT INTO member_profile_stats (guild_id,user_id,message_count,last_message_at)
    SELECT $1, item.user_id, item.message_count, NOW()
    FROM UNNEST($2::text[], $3::bigint[]) AS item(user_id,message_count)`,
    [guildId,userIds,userIds.map(userId=>String(counts.get(userId)))]);
}
