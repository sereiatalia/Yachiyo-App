import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';

export function buildIntroductionPanel(settings) {
  return {
    embeds: [
      new EmbedBuilder()
        .setColor(0xffb6d9)
        .setTitle(settings.intro_panel_title)
        .setDescription(settings.intro_panel_body)
        .setFooter({ text: 'Yachiyo • cozy introductions' })
    ],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('intro_template').setLabel('୨୧ Get template').setStyle(ButtonStyle.Primary)
      )
    ]
  };
}

export function buildIntroductionTemplateReply(settings, username) {
  const safeTemplate = settings.intro_template.replaceAll('```', '` ` `');
  return {
    content: '୨୧ ' + username + "'s introduction template\n\n```\n" + safeTemplate + "\n```",
    ephemeral: true
  };
}

export function buildIntroductionSetupConfirmation(channel, settings) {
  return new EmbedBuilder()
    .setColor(0xffb6d9)
    .setTitle('🌷 Introduction setup saved')
    .setDescription([
      'Panel channel: ' + channel,
      '',
      'The panel will return to the bottom after new messages.',
      'Members may send up to ' + settings.intro_message_limit + ' messages; staff are exempt.',
      'The bot never deletes members’ introduction messages.'
    ].join('\n'))
    .setFooter({ text: 'Yachiyo • community tools' });
}