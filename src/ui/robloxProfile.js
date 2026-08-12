import { EmbedBuilder } from 'discord.js';

const count=value=>value===null||value===undefined?'Unavailable':Number(value).toLocaleString();
export function buildRobloxProfileEmbed(discordUser, profile, footer='Yachiyo • verified Roblox profile') {
  const description=profile.description?.trim() ? profile.description.trim().slice(0,700) : '*No public profile description.*';
  const created=Math.floor(new Date(profile.created).getTime()/1000);
  const embed=new EmbedBuilder().setColor(0xf3a6c7).setAuthor({name:discordUser.globalName||discordUser.username,iconURL:discordUser.displayAvatarURL()}).setTitle(profile.displayName).setURL('https://www.roblox.com/users/'+profile.id+'/profile').setDescription('**Roblox Username**\n```\n'+profile.username+'\n```\nRoblox ID: `'+profile.id+'`\nFriends: **'+count(profile.friends)+'** • Followers: **'+count(profile.followers)+'** • Following: **'+count(profile.following)+'**\n\n**Description:**\n'+description).addFields(
    {name:'Status',value:profile.status,inline:true},
    {name:'Created',value:`<t:${created}:D>`,inline:true},
  ).setFooter({text:footer});
  if(profile.avatarUrl) embed.setThumbnail(profile.avatarUrl);
  return embed;
}
