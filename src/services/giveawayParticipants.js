export async function getEligibleGiveawayEntrants(client, giveaway) {
  const channel = await client.channels.fetch(giveaway.channel_id);
  if (!channel?.messages) throw new Error(`Giveaway channel ${giveaway.channel_id} is unavailable or not readable.`);
  const message = await channel.messages.fetch(giveaway.message_id);
  const reaction = message.reactions.cache.find(item => item.emoji.toString() === giveaway.emoji);
  if (!reaction) return [];

  const users = new Map();
  let after;
  while (true) {
    const page = await reaction.users.fetch({limit:100,...(after ? {after} : {})});
    for (const user of page.values()) if (!user.bot) users.set(user.id,user);
    if (page.size < 100) break;
    after = page.last().id;
  }

  if (!giveaway.required_role_id) return [...users.keys()];
  const guild = await client.guilds.fetch(giveaway.guild_id);
  const eligible = [];
  for (const user of users.values()) {
    const member = guild.members.cache.get(user.id) ?? await guild.members.fetch(user.id).catch(() => null);
    const canBypassRoleRequirement = user.id === guild.ownerId || member?.permissions.has('Administrator') || member?.permissions.has('ManageGuild');
    if (member && (member.roles.cache.has(giveaway.required_role_id) || canBypassRoleRequirement)) eligible.push(user.id);
  }
  return eligible;
}
