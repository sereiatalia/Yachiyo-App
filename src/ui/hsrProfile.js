import { EmbedBuilder } from 'discord.js';

function valueOf(character, field) { return character?.properties?.find(property=>property.field===field)?.display ?? '—'; }
function characterLine(character) {
  const cone=character?.light_cone ? ` • ${character.light_cone.name} S${character.light_cone.rank}` : '';
  return `**${character.name}** Lv.${character.level} • ${character.element?.name ?? 'Unknown'} ${character.path?.name ?? ''} • E${character.rank}${cone}`;
}
export function buildHsrProfileEmbed(discordUser, data, footer='Yachiyo • HSR public showcase') {
  const player=data.player, space=player.space_info ?? {}, characters=data.characters ?? [];
  const featured=characters.slice(0,4), lead=featured[0];
  const embed=new EmbedBuilder().setColor(0x9b78e6).setAuthor({name:discordUser.globalName||discordUser.username,iconURL:discordUser.displayAvatarURL()}).setTitle('✦ '+player.nickname+' • HONKAI: STAR RAIL').setURL('https://enka.network/hsr/'+player.uid).setDescription(
    `**Trailblaze Level ${player.level}** • Equilibrium ${player.world_level}\nUID: \`${player.uid}\`\n`+
    (player.signature ? `> ${player.signature}\n` : '')+
    `\n✦ **Achievements:** ${Number(space.achievement_count ?? 0).toLocaleString()}\n`+
    `✦ **Collection:** ${Number(space.avatar_count ?? 0).toLocaleString()} characters • ${Number(space.light_cone_count ?? 0).toLocaleString()} Light Cones • ${Number(space.relic_count ?? 0).toLocaleString()} relics`
  ).setFooter({text:footer});
  if(player.avatar?.icon) embed.setThumbnail('https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/'+player.avatar.icon);
  if(featured.length) embed.addFields({name:'✧ Displayed Characters',value:featured.map(characterLine).join('\n').slice(0,1024)});
  if(lead) embed.addFields({name:'✦ Featured Build • '+lead.name,value:`HP ${valueOf(lead,'hp')} • ATK ${valueOf(lead,'atk')} • SPD ${valueOf(lead,'spd')}\nCRIT Rate ${valueOf(lead,'crit_rate')} • CRIT DMG ${valueOf(lead,'crit_dmg')}`});
  return embed;
}
