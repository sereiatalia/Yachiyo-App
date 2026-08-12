import { query } from '../database/db.js';

const TRUTH_OPENERS = [
  'What is one thing you appreciate about', 'What is a small win you had with', 'What is a happy memory connected to', 'What is something you want to learn about', 'What is a harmless opinion you have about',
  'What is one goal you have around', 'What is your favorite thing about', 'What is something that makes you smile when you think of', 'What is a kind lesson you learned from', 'What is a cozy recommendation related to',
  'What is a funny but safe story involving', 'What is something you are proud of related to', 'What is one question you have about', 'What is a skill you would like to improve with', 'What is a comforting thing connected to',
  'What is something that surprised you about', 'What is one positive change you would make around', 'What is a song, game, or movie you associate with', 'What is a cute nickname you would give', 'What is one thing you would thank someone for regarding',
  'What is your first thought when you hear about', 'What is a dream or hope you connect with', 'What is a helpful tip you know about', 'What is a wholesome secret talent you have related to', 'What is one thing you wish more people knew about'
];
const TRUTH_TOPICS = [
  'your favorite hobby', 'a game you enjoy', 'your favorite food', 'a song you love', 'a movie or series',
  'a childhood interest', 'a school or work habit', 'a creative project', 'a pet or animal', 'a favorite season',
  'a comfort show', 'a book or comic', 'a place you want to visit', 'a relaxing activity', 'a recent achievement',
  'a favorite color', 'a good friend', 'a daily routine', 'a dream job', 'a favorite character'
];
const DARE_ACTIONS = [
  'Share', 'Describe', 'Type', 'Recommend', 'Name', 'Post', 'Write', 'Give', 'Create', 'Tell us',
  'Use', 'Make up', 'Send', 'Pick', 'Imagine', 'List', 'Celebrate', 'Explain', 'Choose', 'Reply with',
  'Show off', 'Invent', 'Turn', 'Finish this sentence with', 'Offer'
];
const DARE_TASKS = [
  'three things that made you smile today', 'a wholesome emoji-only mood check', 'your current favorite song title', 'a one-sentence mini poem', 'a game, movie, or series recommendation',
  'a funny but kind nickname for yourself', 'your top three comfort foods', 'a fictional character you relate to and why', 'a tiny drawing made with text symbols', 'one kind message for the next person who speaks',
  'a made-up superpower with one silly weakness', 'a two-line story beginning with “One day…”', 'a color palette for your mood today', 'one thing you are looking forward to', 'a safe, funny fun fact about yourself',
  'a new server channel name idea', 'a short positive affirmation', 'your ideal cozy weekend in three words', 'a fictional pet name', 'a song lyric-free description of your favorite music genre'
];

export const SAFE_TRUTHS = Object.freeze(TRUTH_OPENERS.flatMap(opener => TRUTH_TOPICS.map(topic => `${opener} **${topic}**?`)));
export const SAFE_DARES = Object.freeze(DARE_ACTIONS.flatMap(action => DARE_TASKS.map(task => `${action} **${task}**.`)));
let settingsReady=false;
async function ensureSettingsTable() {
  if(settingsReady) return;
  await query(`CREATE TABLE IF NOT EXISTS truth_or_dare_settings (
    guild_id TEXT PRIMARY KEY, channel_id TEXT NOT NULL, panel_message_id TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  settingsReady=true;
}

export function randomTruthOrDare(type) {
  const list=type==='dare' ? SAFE_DARES : SAFE_TRUTHS;
  return list[Math.floor(Math.random()*list.length)];
}

export async function saveTruthOrDareSettings(guildId, channelId) {
  await ensureSettingsTable();
  await query(`INSERT INTO truth_or_dare_settings (guild_id,channel_id) VALUES ($1,$2)
    ON CONFLICT (guild_id) DO UPDATE SET channel_id=EXCLUDED.channel_id,updated_at=NOW()`,[guildId,channelId]);
}
export async function getTruthOrDareSettings(guildId) { await ensureSettingsTable(); return (await query('SELECT * FROM truth_or_dare_settings WHERE guild_id=$1',[guildId])).rows[0] ?? null; }
export async function saveTruthOrDarePanel(guildId,messageId) { await ensureSettingsTable(); await query('UPDATE truth_or_dare_settings SET panel_message_id=$2,updated_at=NOW() WHERE guild_id=$1',[guildId,messageId]); }
