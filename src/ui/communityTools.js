import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { DEFAULT_INTRO_PANEL_BODY, DEFAULT_INTRO_PANEL_TITLE } from '../services/communityToolsService.js';

export function buildIntroductionPanel(settings) {
  return {
    embeds: [new EmbedBuilder().setColor(0xffb6d9).setTitle(`🌸 ${settings.intro_panel_title || DEFAULT_INTRO_PANEL_TITLE}`).setDescription(settings.intro_panel_body || DEFAULT_INTRO_PANEL_BODY).setFooter({ text: 'Yachiyo • introductions' })],
    components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('intro_template').setLabel('Get introduction template').setEmoji('📝').setStyle(ButtonStyle.Primary))]
  };
}

export function buildTemplateReply(settings) {
  return `Copy and fill this template, then send it in this channel:\n\n\\`\\`\\`text\n${settings.intro_template}\n\\`\\`\\``;
}

export function buildWelcomeEmbed(member, message) {
  return new EmbedBuilder().setColor(0xffb6d9).setTitle('🌸 Welcome').setDescription(message).setThumbnail(member.user.displayAvatarURL()).setFooter({ text: `${member.guild.name} • Yachiyo` });
}

export function buildGoodbyeEmbed(member, message) {
  return new EmbedBuilder().setColor(0xc9a7d9).setTitle('🌙 Goodbye').setDescription(message).setThumbnail(member.user.displayAvatarURL()).setFooter({ text: `${member.guild.name} • Yachiyo` });
}
