import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { chatXpLeaderboard, voiceLeaderboard, getActivityLeaderboardSettings } from '../services/activityLeaderboardService.js';

const medals = ['🥇', '🥈', '🥉'];

function formatVoiceTime(value) {
  const seconds = Math.max(0, Number(value) || 0);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours ? `${hours.toLocaleString()}h ${minutes}m` : `${minutes}m`;
}

export async function buildActivityLeaderboardEmbed(guildId, type = 'chat') {
  const settings = await getActivityLeaderboardSettings(guildId);
  if (type === 'voice') {
    const rows = await voiceLeaderboard(guildId, 10);
    const lines = rows.map((row, index) => `${medals[index] ?? `**${index + 1}.**`} <@${row.user_id}>  ·  **${formatVoiceTime(row.total_seconds)}**`);
    const reward = settings?.voice_reward_role_id ? `<@&${settings.voice_reward_role_id}>` : 'the voice reward role';
    return new EmbedBuilder().setColor(0xb9a2e8)
      .setTitle('🎙️  Voice Lounge Leaderboard')
      .setDescription(`୨୧ The comfiest corners of our voice chats ୨୧\nTime in **any server voice channel** adds up automatically.\n\n${lines.join('\n') || 'No voice time yet—come hang out! ♡'}\n\n✧ **100 hours** earns ${reward}`)
      .setFooter({ text: '♡ Live server-wide voice time • current sessions are included' });
  }
  const rows = await chatXpLeaderboard(guildId, 10);
  const lines = rows.map((row, index) => `${medals[index] ?? `**${index + 1}.**`} <@${row.user_id}>  ·  **${Number(row.chat_xp).toLocaleString()} XP**`);
  const reward = settings?.chat_reward_role_id ? `<@&${settings.chat_reward_role_id}>` : 'the chat reward role';
  return new EmbedBuilder().setColor(0xf3a6c7)
    .setTitle('🍓  Chat Garden Leaderboard')
    .setDescription(`୨୧ Every eligible message grows your score by 1 XP ୨୧\nMessages in **any server chat channel** count automatically.\n\n${lines.join('\n') || 'No chat XP yet—say your first hello! ♡'}\n\n✧ **10,000 XP** earns ${reward}`)
    .setFooter({ text: '♡ Server-wide Chat Garden • one XP per non-bot message' });
}

export function activityLeaderboardButtons(active = 'chat') {
  return [new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('activity_leaderboard:chat').setLabel('🍓 Chat Garden').setStyle(active === 'chat' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('activity_leaderboard:voice').setLabel('🎙️ Voice Lounge').setStyle(active === 'voice' ? ButtonStyle.Primary : ButtonStyle.Secondary),
  )];
}
