import { query } from '../database/db.js';

export const DEFAULT_RULES = [
  ['Respect & Community Conduct', 'Treat everyone with respect and help keep the community safe, welcoming, and comfortable. Harassment, discrimination, racism, targeted insults, creepy behavior, impersonation, hostility, and intentional discomfort are not tolerated. Respect boundaries and avoid unnecessary conflict.'],
  ['Communication & Chat Behavior', 'Communicate responsibly. Spamming, disruptive behavior, excessive pinging, mention abuse, advertising, and unsolicited promotion are prohibited. Keep conversations respectful and avoid derailing discussions or creating unnecessary chaos.'],
  ['NSFW, Sensitive & Harmful Content', 'NSFW, sexual, graphic, violent, or disturbing content is prohibited unless explicitly allowed by staff in a designated space. Handle sensitive topics maturely. Threats, self-harm encouragement, coercion, intimidation, and psychological pressure are zero-tolerance violations.'],
  ['Privacy & Security', 'Respect everyone’s privacy. Doxxing, leaking private information, scamming, phishing, impersonation, and malicious activity are forbidden. Handle conflicts privately or through staff; do not create public callouts or server-wide drama.'],
  ['Voice Channel Rules', 'Keep voice channels comfortable. Mic spamming, screaming, disruptive soundboards, interruptions, and speaking over others are prohibited. Do not record, stream, or share voice conversations without everyone’s consent.'],
  ['Staff, Enforcement & Punishments', 'Respect moderation decisions and do not exploit loopholes, evade punishments, or use alternate accounts to bypass action. Staff may escalate warnings, mutes, kicks, or bans based on severity, repetition, and intent.'],
];

export async function setupRules(guildId, channelId, bannerUrl = null) {
  await query(`INSERT INTO rules_settings (guild_id, channel_id, banner_url) VALUES ($1,$2,$3)
    ON CONFLICT (guild_id) DO UPDATE SET channel_id=EXCLUDED.channel_id, banner_url=COALESCE(EXCLUDED.banner_url, rules_settings.banner_url), updated_at=NOW()`, [guildId, channelId, bannerUrl]);
  for (let i=0;i<DEFAULT_RULES.length;i++) await query(`INSERT INTO rules_sections (guild_id,section_number,title,content) VALUES ($1,$2,$3,$4) ON CONFLICT (guild_id,section_number) DO NOTHING`, [guildId,i+1,DEFAULT_RULES[i][0],DEFAULT_RULES[i][1]]);
  return getRules(guildId);
}
export async function getRules(guildId) { const settings=(await query('SELECT * FROM rules_settings WHERE guild_id=$1',[guildId])).rows[0]??null; const sections=(await query('SELECT * FROM rules_sections WHERE guild_id=$1 ORDER BY section_number',[guildId])).rows; return settings ? {...settings,sections} : null; }
export async function saveRulesPanel(guildId,messageId) { await query('UPDATE rules_settings SET panel_message_id=$2 WHERE guild_id=$1',[guildId,messageId]); }
export async function updateRule(guildId,number,title,content) { await query('UPDATE rules_sections SET title=$3, content=$4 WHERE guild_id=$1 AND section_number=$2',[guildId,number,title,content]); }
export async function updateRulesBanner(guildId,url) { await query('UPDATE rules_settings SET banner_url=$2, updated_at=NOW() WHERE guild_id=$1',[guildId,url]); }
