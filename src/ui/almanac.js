import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

const RARITY_LABELS = {
  common: '🌊 Common',
  uncommon: '🫧 Uncommon',
  rare: '💠 Rare',
  epic: '💜 Epic',
  legendary: '🌟 Legendary',
  mythic: '🔥 Mythic',
  ancient: '🏺 Ancient',
  celestial: '✨ Celestial',
  secret: '🌙 Secret',
  tsukuyomi: '☾ Tsukuyomi'
};

export function buildAlmanacView(rows = [], page = 0, username = 'Your') {
  const perPage = 10;
  const pages = Math.max(1, Math.ceil(rows.length / perPage));
  const currentPage = Math.min(Math.max(Number(page) || 0, 0), pages - 1);
  const visible = rows.slice(currentPage * perPage, currentPage * perPage + perPage);
  const discovered = rows.filter(row => Number(row.quantity) > 0).length;
  const totalCaught = rows.reduce((sum, row) => sum + Number(row.quantity || 0), 0);
  const percent = rows.length ? Math.round((discovered / rows.length) * 100) : 0;
  const lines = visible.length
    ? visible.map(row => (Number(row.quantity) > 0 ? '✅' : '▫️') + ' **' + row.name + '** • ' + (Number(row.quantity) > 0 ? '×' + row.quantity : 'Undiscovered') + ' • ' + Number(row.value).toLocaleString() + ' coins').join('\n')
    : '*The cosmic tide is waiting for your first discovery.*';
  const rarity = visible[0]?.rarity;
  const embed = new EmbedBuilder()
    .setColor(0x8e7dff)
    .setTitle('📖 ' + username + '’s Celestial Almanac')
    .setDescription('**Collection:** ' + discovered + '/' + rows.length + ' discovered (' + percent + '%)\n**Total catches:** ' + totalCaught + '\n\n' + (rarity ? '**' + (RARITY_LABELS[rarity] || rarity) + '**\n' : '') + lines)
    .setFooter({ text: 'Page ' + (currentPage + 1) + '/' + pages + ' • Every discovery is recorded in Yachiyo’s archive.' });
  const controls = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('fish_almanac_prev:' + currentPage).setLabel('Previous').setEmoji('◀️').setStyle(ButtonStyle.Secondary).setDisabled(currentPage === 0),
    new ButtonBuilder().setCustomId('fish_almanac_next:' + currentPage).setLabel('Next').setEmoji('▶️').setStyle(ButtonStyle.Primary).setDisabled(currentPage >= pages - 1)
  );
  return { embed, controls };
}
