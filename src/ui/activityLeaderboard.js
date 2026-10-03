import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { chatXpLeaderboard, voiceLeaderboard, chatXpMemberRank, voiceMemberRank, getActivityLeaderboardSettings } from '../services/activityLeaderboardService.js';

const medals = ['🥇', '🥈', '🥉'];

function formatVoiceTime(value) {
  const seconds = Math.max(0, Number(value) || 0);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours ? `${hours.toLocaleString()}h ${minutes}m` : `${minutes}m`;
}

export async function buildActivityLeaderboardEmbed(guildId, type = 'chat', viewerId = null) {
  const settings = await getActivityLeaderboardSettings(guildId);
  if (type === 'voice') {
    const rows = await voiceLeaderboard(guildId, 10);
    const lines = rows.map((row, index) => `${medals[index] ?? `**${index + 1}.**`} <@${row.user_id}>  ·  **${formatVoiceTime(row.total_seconds)}**`);
    const viewerRank = viewerId && !rows.some(row => row.user_id === viewerId) ? await voiceMemberRank(guildId,viewerId) : null;
    const personalLine = viewerId && !rows.some(row => row.user_id === viewerId)
      ? `\n\n♡ **Your spot**\n${viewerRank ? `#${Number(viewerRank.rank).toLocaleString()}  <@${viewerId}>  ·  **${formatVoiceTime(viewerRank.total_seconds)}**` : `<@${viewerId}>  ·  *Not ranked yet—join a voice channel to start!*`}`
      : '';
    const rewardLine = settings?.voice_reward_role_id ? `\n\n✧ **100 hours** earns <@&${settings.voice_reward_role_id}>` : '';
    return new EmbedBuilder().setColor(0xb9a2e8)
      .setTitle('🎙️  Voice Lounge Leaderboard')
      .setDescription(`୨୧ The comfiest corners of our voice chats ୨୧\nTime in **any server voice channel** adds up automatically.\n\n${lines.join('\n') || 'No voice time yet—come hang out! ♡'}${personalLine}${rewardLine}`)
      .setFooter({ text: '♡ Live server-wide voice time • current sessions are included' });
  }
  const rows = await chatXpLeaderboard(guildId, 10);
  const lines = rows.map((row, index) => `${medals[index] ?? `**${index + 1}.**`} <@${row.user_id}>  ·  **${Number(row.chat_xp).toLocaleString()} XP**`);
  const viewerRank = viewerId && !rows.some(row => row.user_id === viewerId) ? await chatXpMemberRank(guildId,viewerId) : null;
  const personalLine = viewerId && !rows.some(row => row.user_id === viewerId)
    ? `\n\n♡ **Your spot**\n${viewerRank ? `#${Number(viewerRank.rank).toLocaleString()}  <@${viewerId}>  ·  **${Number(viewerRank.chat_xp).toLocaleString()} XP**` : `<@${viewerId}>  ·  *Not ranked yet—send a message to start!*`}`
    : '';
  const rewardLine = settings?.chat_reward_role_id ? `\n\n✧ **10,000 XP** earns <@&${settings.chat_reward_role_id}>` : '';
  return new EmbedBuilder().setColor(0xf3a6c7)
    .setTitle('🍓  Chat Garden Leaderboard')
    .setDescription(`୨୧ Every eligible message grows your score by 1 XP ୨୧\nMessages in **any server chat channel** count automatically.\n\n${lines.join('\n') || 'No chat XP yet—say your first hello! ♡'}${personalLine}${rewardLine}`)
    .setFooter({ text: '♡ Server-wide Chat Garden • one XP per non-bot message' });
}

export function activityLeaderboardButtons(active = 'chat') {
  return [new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('activity_leaderboard:chat').setLabel('🍓 Chat Garden').setStyle(active === 'chat' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('activity_leaderboard:voice').setLabel('🎙️ Voice Lounge').setStyle(active === 'voice' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`activity_leaderboard:refresh:${active}`).setLabel('↻ Refresh').setStyle(ButtonStyle.Secondary),
  )];
}
