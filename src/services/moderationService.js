import { query } from '../database/db.js';
import { recordAudit } from './auditService.js';
export async function createCase({guildId,targetId,moderatorId,action,reason,durationSeconds=null}) {
  const r=await query('INSERT INTO moderation_cases (guild_id,target_user_id,moderator_user_id,action,reason,duration_seconds) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',[guildId,targetId,moderatorId,action,reason||'No reason provided',durationSeconds]);
  await recordAudit({guildId,eventType:`moderation.${action}`,actorId:moderatorId,targetId,data:{caseId:r.rows[0].id,reason:reason||'No reason provided',durationSeconds}});
  return r.rows[0].id;
}
export async function warn(guildId,targetId,moderatorId,reason){ return createCase({guildId,targetId,moderatorId,action:'warn',reason}); }
export async function recentCases(guildId,targetId){ return (await query('SELECT * FROM moderation_cases WHERE guild_id=$1 AND target_user_id=$2 ORDER BY created_at DESC LIMIT 20',[guildId,targetId])).rows; }
