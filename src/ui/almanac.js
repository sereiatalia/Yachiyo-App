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

const RARITY_ORDER = ['common','uncommon','rare','epic','legendary','mythic','ancient','celestial','secret','tsukuyomi'];

function progressBar(value, size = 12) {
  const filled = Math.round(value * size);
  return '▰'.repeat(filled) + '▱'.repeat(size - filled);
}

export function buildAlmanacView(rows = [], page = 0, username = 'Your') {
  const grouped = RARITY_ORDER.flatMap(rarity => rows.filter(row => row.rarity === rarity));
  const perPage = 8;
  const pages = Math.max(1, Math.ceil(grouped.length / perPage));
  const currentPage = Math.min(Math.max(Number(page) || 0, 0), pages - 1);
  const visible = grouped.slice(currentPage * perPage, currentPage * perPage + perPage);
  const discovered = grouped.filter(row => Number(row.quantity) > 0).length;
  const totalCaught = grouped.reduce((sum, row) => sum + Number(row.quantity || 0), 0);
  const percent = grouped.length ? discovered / grouped.length : 0;
  const currentRarity = visible[0]?.rarity;
  const rarityRows = currentRarity ? grouped.filter(row => row.rarity === currentRarity) : [];
  const rarityFound = rarityRows.filter(row => Number(row.quantity) > 0).length;
  const lines = visible.length
    ? visible.map(row => {
        const owned = Number(row.quantity) > 0;
        const value = Number(row.value).toLocaleString();
        return (owned ? '♡' : '・') + ' **' + row.name + '**  ' + (owned ? '×' + row.quantity : '— undiscovered') + '  ·  ' + value + ' coins';
      }).join('\n')
    : '*The cosmic tide is waiting for your first discovery.*';
  const embed = new EmbedBuilder()
    .setColor(currentRarity === 'tsukuyomi' ? 0xc77dff : 0xf3a6c7)
    .setTitle('📖  ' + username + '’s Celestial Almanac')
    .setDescription(
      '╭─────────────── 𓆝 ───────────────╮\n' +
      '✦ **Collection progress**  ' + discovered + '/' + grouped.length + '\n' +
      progressBar(percent) + '  **' + Math.round(percent * 100) + '%**\n' +
      '✦ **Total catches**  ' + totalCaught + '\n' +
      '╰─────────────── 𓆝 ───────────────╯\n\n' +
      (currentRarity ? '**' + RARITY_LABELS[currentRarity] + '**  ·  ' + rarityFound + '/' + rarityRows.length + ' discovered\n\n' : '') +
      lines
    )
    .setFooter({ text: 'Page ' + (currentPage + 1) + '/' + pages + '  •  Secret → Tsukuyomi is the final rarity path.' });
  const controls = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('fish_almanac_prev:' + currentPage).setLabel('Previous').setEmoji('🌙').setStyle(ButtonStyle.Secondary).setDisabled(currentPage === 0),
    new ButtonBuilder().setCustomId('fish_almanac_next:' + currentPage).setLabel('Next').setEmoji('✨').setStyle(ButtonStyle.Primary).setDisabled(currentPage >= pages - 1)
  );
  return { embed, controls };
}
