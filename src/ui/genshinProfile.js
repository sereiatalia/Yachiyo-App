import { EmbedBuilder } from 'discord.js';

export function buildGenshinProfileEmbed(discordUser, data, footer = 'Yachiyo • Genshin public profile') {
  const player = data.playerInfo;
  const abyss = player.towerFloorIndex > 0 ? `${player.towerFloorIndex}-${player.towerLevelIndex}` : 'Not recorded';
  const embed = new EmbedBuilder()
    .setColor(0x79c9b8)
    .setAuthor({ name: discordUser.globalName || discordUser.username, iconURL: discordUser.displayAvatarURL() })
    .setTitle(`✦ ${player.nickname} • GENSHIN IMPACT`)
    .setURL(`https://enka.network/u/${data.uid}`)
    .setDescription(
      `**Adventure Rank ${player.level}** • World Level ${player.worldLevel}\n**UID**\n\`\`\`\n${data.uid}\n\`\`\`\n` +
      (player.signature ? `> ${player.signature}\n` : '') +
      `\n✦ **Achievements:** ${Number(player.finishAchievementNum ?? 0).toLocaleString()}\n` +
      `✦ **Spiral Abyss:** ${abyss}\n` +
      `✦ **Region:** ${data.region ?? 'Unavailable'}`
    )
    .setFooter({ text: footer });
  return embed;
}
