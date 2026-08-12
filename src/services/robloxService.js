import { query } from '../database/db.js';

let ready = false;
async function ensureTables() {
  if (ready) return;
  await query(`CREATE TABLE IF NOT EXISTS roblox_profiles (
    guild_id TEXT NOT NULL, discord_user_id TEXT NOT NULL, roblox_user_id TEXT NOT NULL,
    username TEXT NOT NULL, display_name TEXT NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (guild_id,discord_user_id)
  )`);
  await query(`CREATE TABLE IF NOT EXISTS roblox_panel_settings (
    guild_id TEXT PRIMARY KEY, channel_id TEXT NOT NULL, panel_message_id TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  ready = true;
}

async function robloxFetch(url, options) {
  const response = await fetch(url, {headers:{'Content-Type':'application/json'},...options});
  if (!response.ok) throw new Error('Roblox could not verify that username right now.');
  return response.json();
}
async function optionalRobloxFetch(url, options) { try { return await robloxFetch(url, options); } catch { return null; } }
export async function resolveRobloxUser(username) {
  const cleaned = String(username ?? '').trim();
  if (!/^[A-Za-z0-9_]{3,20}$/.test(cleaned)) throw new Error('Enter a valid Roblox username (3–20 letters, numbers, or underscores).');
  const lookup = await robloxFetch('https://users.roblox.com/v1/usernames/users', {method:'POST',body:JSON.stringify({usernames:[cleaned],excludeBannedUsers:false})});
  const matched = lookup.data?.[0]; if (!matched) throw new Error('That Roblox username was not found.');
  const user = await robloxFetch('https://users.roblox.com/v1/users/'+matched.id);
  const [thumbnails,friends,followers,following,presence] = await Promise.all([
    optionalRobloxFetch('https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds='+user.id+'&size=420x420&format=Png&isCircular=false'),
    optionalRobloxFetch('https://friends.roblox.com/v1/users/'+user.id+'/friends/count'),
    optionalRobloxFetch('https://friends.roblox.com/v1/users/'+user.id+'/followers/count'),
    optionalRobloxFetch('https://friends.roblox.com/v1/users/'+user.id+'/followings/count'),
    optionalRobloxFetch('https://presence.roblox.com/v1/presence/users',{method:'POST',body:JSON.stringify({userIds:[user.id]})}),
  ]);
  const presenceType=presence?.userPresences?.[0]?.userPresenceType;
  const statuses={0:'Offline',1:'Online',2:'In game',3:'In Studio'};
  return {id:String(user.id),username:user.name,displayName:user.displayName,description:user.description ?? '',created:user.created,avatarUrl:thumbnails?.data?.[0]?.imageUrl ?? null,friends:friends?.count ?? null,followers:followers?.count ?? null,following:following?.count ?? null,status:statuses[presenceType] ?? 'Unavailable',totalBadges:null};
}
export async function saveRobloxProfile(guildId, discordUserId, profile) {
  await ensureTables();
  await query(`INSERT INTO roblox_profiles (guild_id,discord_user_id,roblox_user_id,username,display_name) VALUES ($1,$2,$3,$4,$5)
    ON CONFLICT (guild_id,discord_user_id) DO UPDATE SET roblox_user_id=EXCLUDED.roblox_user_id,username=EXCLUDED.username,display_name=EXCLUDED.display_name,updated_at=NOW()`,[guildId,discordUserId,profile.id,profile.username,profile.displayName]);
}
export async function getRobloxProfile(guildId, discordUserId) { await ensureTables(); return (await query('SELECT * FROM roblox_profiles WHERE guild_id=$1 AND discord_user_id=$2',[guildId,discordUserId])).rows[0] ?? null; }
export async function saveRobloxPanel(guildId, channelId) { await ensureTables(); await query(`INSERT INTO roblox_panel_settings (guild_id,channel_id) VALUES ($1,$2) ON CONFLICT (guild_id) DO UPDATE SET channel_id=EXCLUDED.channel_id,updated_at=NOW()`,[guildId,channelId]); }
export async function getRobloxPanel(guildId) { await ensureTables(); return (await query('SELECT * FROM roblox_panel_settings WHERE guild_id=$1',[guildId])).rows[0] ?? null; }
export async function setRobloxPanelMessage(guildId, messageId) { await ensureTables(); await query('UPDATE roblox_panel_settings SET panel_message_id=$2,updated_at=NOW() WHERE guild_id=$1',[guildId,messageId]); }
