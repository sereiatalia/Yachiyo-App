import { PermissionFlagsBits } from 'discord.js';
import { getCommunitySettings, formatCommunityMessage, incrementIntroductionUsage, setIntroductionPanelMessageId } from '../services/communityToolsService.js';
import { buildIntroductionPanel, buildWelcomeEmbed, buildGoodbyeEmbed } from '../ui/communityTools.js';

const refreshTimers = new Map();

export async function sendConfiguredWelcome(member) {
  const settings = await getCommunitySettings(member.guild.id);
  if (!settings.welcome_channel_id) return;
  const channel = await member.guild.channels.fetch(settings.welcome_channel_id).catch(() => null);
  if (channel?.isTextBased()) await channel.send({ embeds: [buildWelcomeEmbed(member, formatCommunityMessage(settings.welcome_message, member))] });
}

export async function sendConfiguredGoodbye(member) {
  const settings = await getCommunitySettings(member.guild.id);
  if (!settings.goodbye_channel_id) return;
  const channel = await member.guild.channels.fetch(settings.goodbye_channel_id).catch(() => null);
  if (channel?.isTextBased()) await channel.send({ embeds: [buildGoodbyeEmbed(member, formatCommunityMessage(settings.goodbye_message, member))] });
}

async function refreshPanel(channel, settings) {
  const oldId = settings.intro_panel_message_id;
  if (oldId) {
    const old = await channel.messages.fetch(oldId).catch(() => null);
    if (old?.author?.id === channel.client.user.id) await old.delete().catch(() => {});
  }
  const panel = await channel.send(buildIntroductionPanel(settings));
  await setIntroductionPanelMessageId(channel.guild.id, panel.id);
}

export async function ensureIntroductionPanel(guild) {
  const settings = await getCommunitySettings(guild.id);
  if (!settings.intro_channel_id) return;
  const channel = await guild.channels.fetch(settings.intro_channel_id).catch(() => null);
  if (channel?.isTextBased()) await refreshPanel(channel, settings);
}

export async function handleIntroductionMessage(message) {
  if (!message.guild || message.author.bot) return;
  const settings = await getCommunitySettings(message.guild.id);
  if (!settings.intro_channel_id || message.channel.id !== settings.intro_channel_id) return;
  if (message.member?.permissions.has(PermissionFlagsBits.Administrator)) return;
  const count = await incrementIntroductionUsage(message.guild.id, message.author.id);
  if (count > Number(settings.intro_message_limit || 3)) {
    await message.reply({ content: 'You have reached the 3-introduction limit for this channel.', allowedMentions: { repliedUser: false } }).catch(() => {});
    return;
  }
  clearTimeout(refreshTimers.get(message.guild.id));
  refreshTimers.set(message.guild.id, setTimeout(() => {
    ensureIntroductionPanel(message.guild).catch(console.error);
    refreshTimers.delete(message.guild.id);
  }, 3000));
}
