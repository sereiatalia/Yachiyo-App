import { EmbedBuilder } from 'discord.js';

export function buildHsrProfileEmbed(discordUser, data, footer='Yachiyo • HSR public showcase') {
  const player=data.player, space=player.space_info ?? {};
  const embed=new EmbedBuilder().setColor(0x9b78e6).setAuthor({name:discordUser.globalName||discordUser.username,iconURL:discordUser.displayAvatarURL()}).setTitle('✦ '+player.nickname+' • HONKAI: STAR RAIL').setURL('https://enka.network/hsr/'+player.uid).setDescription(
    `**Trailblaze Level ${player.level}** • Equilibrium ${player.world_level}\n**UID**\n\`\`\`\n${player.uid}\n\`\`\`\n`+
    (player.signature ? `> ${player.signature}\n` : '')+
    `\n✦ **Achievements:** ${Number(space.achievement_count ?? 0).toLocaleString()}\n`+
    `✦ **Collection:** ${Number(space.avatar_count ?? 0).toLocaleString()} characters • ${Number(space.light_cone_count ?? 0).toLocaleString()} Light Cones • ${Number(space.relic_count ?? 0).toLocaleString()} relics`
  ).setFooter({text:footer});
  if(player.avatar?.icon) embed.setThumbnail('https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/'+player.avatar.icon);
  return embed;
}
