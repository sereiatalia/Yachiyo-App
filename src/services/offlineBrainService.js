const has = (text, ...terms) => terms.some(term => text.includes(term));

// This intentionally stays local and deterministic: no API key, web request, or usage charge.
export async function getOfflineBrainReply({ text, guild, user }) {
  const message = text.toLowerCase().trim();
  const tagalog = /\b(ano|kumusta|kamusta|sino|paano|salamat|pwede|help|tulong|ka|ikaw)\b/i.test(message);
  const owner = await guild.fetchOwner().catch(() => null);

  if (!message || has(message, 'hello', 'hi ', 'hii', 'kumusta', 'kamusta')) {
    return tagalog ? `₊˚⊹ᰔ Kumusta, ${user}! Nandito ako para tumulong sa **${guild.name}**. Ano ang kailangan mo?` : `₊˚⊹ᰔ Hello, ${user}! I am here to help with **${guild.name}**. What do you need?`;
  }
  if (has(message, 'who are you', 'sino ka', 'about you')) {
    return tagalog ? 'Ako si **Yachiyo**, ang maliit na server helper ninyo. Wala pa akong online AI brain, pero kaya kong tumulong sa server tools at basic questions. ♡' : 'I am **Yachiyo**, your little server helper. I do not use an online AI brain yet, but I can help with server tools and basic questions. ♡';
  }
  if (has(message, 'owner', 'may-ari', 'may ari')) {
    return owner ? `⭑.ᐟ The server owner is **${owner.user.tag}**.` : 'I could not find the server owner right now.';
  }
  if (has(message, 'server info', 'server information', 'info ng server')) {
    return '˚. ᵎᵎ Use `/server-info` to view the current server information panel.';
  }
  if (has(message, 'command', 'commands', 'tulong', 'help', 'paano')) {
    return tagalog ? '⊹ ࣪ ˖ Maaari mong gamitin ang `/help` para makita ang commands. Para sa server details, gamitin ang `/server-info`.' : '⊹ ࣪ ˖ Use `/help` to see my commands. For this server’s details, use `/server-info`.';
  }
  if (has(message, 'thank', 'salamat', 'thanks')) return tagalog ? 'Walang anuman! ♡' : 'You are very welcome! ♡';
  return tagalog
    ? '‎ꫂ᭪݁ Hindi pa ako full AI chat bot, pero maaari akong tumulong sa `/help`, `/server-info`, at mga server tools. Subukan mong itanong nang mas simple. ♡'
    : '‎ꫂ᭪݁ I am not a full AI chat bot yet, but I can help with `/help`, `/server-info`, and server tools. Try a simpler question. ♡';
}
