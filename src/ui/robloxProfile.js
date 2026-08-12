import { EmbedBuilder } from 'discord.js';

const count=value=>value===null||value===undefined?'Unavailable':Number(value).toLocaleString();
export function buildRobloxProfileEmbed(discordUser, profile, footer='Yachiyo • verified Roblox profile') {
  const description=profile.description?.trim() ? profile.description.trim().slice(0,700) : '*No public profile description.*';
  const created=Math.floor(new Date(profile.created).getTime()/1000);
  const embed=new EmbedBuilder().setColor(0xf3a6c7).setAuthor({name:discordUser.globalName||discordUser.username,iconURL:discordUser.displayAvatarURL()}).setTitle(profile.displayName).setURL('https://www.roblox.com/users/'+profile.id+'/profile').setDescription('**@'+profile.username+'**\nRoblox ID: `'+profile.id+'`\n\n'+description).addFields(
    {name:'Status',value:profile.status,inline:true},
    {name:'Created',value:`<t:${created}:D>`,inline:true},
    {name:'Badges',value:'Unavailable*',inline:true},
    {name:'Friends',value:count(profile.friends),inline:true},
    {name:'Followers',value:count(profile.followers),inline:true},
    {name:'Following',value:count(profile.following),inline:true},
  ).setFooter({text:footer+' • *Roblox restricts public badge totals'});
  if(profile.avatarUrl) embed.setThumbnail(profile.avatarUrl);
  return embed;
}
