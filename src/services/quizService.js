import { query } from '../database/db.js';

const QUESTIONS = [
  ['mathematics','easy','What is 12 multiplied by 8?','96'],
  ['mathematics','normal','What is the square root of 144?','12'],
  ['science','easy','What planet is known as the Red Planet?','mars'],
  ['biology','easy','What organ pumps blood around the human body?','heart'],
  ['chemistry','normal','What is the chemical symbol for oxygen?','o'],
  ['physics','normal','What force pulls objects toward Earth?','gravity'],
  ['earth science','easy','What is molten rock beneath Earth’s surface called?','magma'],
  ['english','easy','What is the opposite of “ancient”?','modern'],
  ['literature','normal','Who wrote Romeo and Juliet?','william shakespeare'],
  ['history','easy','Which ancient civilization built the pyramids of Giza?','egyptians'],
  ['geography','easy','What is the largest ocean on Earth?','pacific ocean'],
  ['computer studies','easy','What does CPU stand for?','central processing unit'],
  ['arts','easy','What are the three primary colors in traditional paint?','red yellow blue'],
  ['music','easy','How many lines are on a standard musical staff?','five'],
  ['health','easy','What vitamin is commonly produced by sunlight exposure?','vitamin d'],
  ['general','normal','What is the capital city of the Philippines?','manila'],
];

export async function seedQuizQuestions() {
  for (const [topic,difficulty,question,answer] of QUESTIONS) await query(`INSERT INTO quiz_questions (topic,difficulty,question,answer,accepted_answers) SELECT $1,$2,$3,$4,$5::jsonb WHERE NOT EXISTS (SELECT 1 FROM quiz_questions WHERE question=$3)`, [topic,difficulty,question,answer,JSON.stringify([answer])]);
}
export async function createQuiz(data) { return (await query(`INSERT INTO quiz_sessions (guild_id,channel_id,host_id,rounds,difficulty,topic) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`, [data.guildId,data.channelId,data.hostId,data.rounds,data.difficulty,data.topic])).rows[0]; }
export async function getActiveQuiz(guildId, channelId) { return (await query(`SELECT * FROM quiz_sessions WHERE guild_id=$1 AND channel_id=$2 AND status IN ('lobby','active') ORDER BY id DESC LIMIT 1`, [guildId,channelId])).rows[0] ?? null; }
export async function joinQuiz(sessionId,userId) { return (await query(`INSERT INTO quiz_players (session_id,user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING RETURNING *`, [sessionId,userId])).rows[0] ?? null; }
export async function getPlayers(sessionId) { return (await query(`SELECT * FROM quiz_players WHERE session_id=$1 ORDER BY score DESC,joined_at ASC`, [sessionId])).rows; }
export async function nextQuestion(session) { const result=await query(`SELECT * FROM quiz_questions WHERE ($1='random' OR topic=$1) AND ($2='mixed' OR difficulty=$2) ORDER BY random() LIMIT 1`, [session.topic,session.difficulty]); return result.rows[0] ?? (await query('SELECT * FROM quiz_questions ORDER BY random() LIMIT 1')).rows[0]; }
export async function startRound(sessionId,round,question) { return (await query(`INSERT INTO quiz_rounds (session_id,round_number,question_id,question,answer) VALUES ($1,$2,$3,$4,$5) RETURNING *`, [sessionId,round,question.id,question.question,question.answer])).rows[0]; }
export async function activateQuiz(sessionId,round,panelMessageId,questionMessageId) { return (await query(`UPDATE quiz_sessions SET status='active',current_round=$2,panel_message_id=$3,question_message_id=$4 WHERE id=$1 RETURNING *`, [sessionId,round,panelMessageId,questionMessageId])).rows[0]; }
export async function answerQuiz(sessionId,round,userId) { const r=await query(`UPDATE quiz_rounds SET winner_id=$3,answered_at=NOW() WHERE session_id=$1 AND round_number=$2 AND winner_id IS NULL RETURNING *`, [sessionId,round,userId]); if(!r.rows[0]) return null; await query(`UPDATE quiz_players SET score=score+$3,correct_answers=correct_answers+1 WHERE session_id=$1 AND user_id=$2`, [sessionId,userId,1]); return r.rows[0]; }
export async function finishQuiz(sessionId) { await query(`UPDATE quiz_sessions SET status='finished',ended_at=NOW() WHERE id=$1`, [sessionId]); return getPlayers(sessionId); }
