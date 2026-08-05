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
  // One page per rarity keeps Secret and Tsukuyomi completely separate.
  const grouped = RARITY_ORDER.map(rarity => ({
    rarity,
    rows: rows.filter(row => row.rarity === rarity)
  })).filter(group => group.rows.length > 0);

  const pages = Math.max(1, grouped.length);
  const currentPage = Math.min(Math.max(Number(page) || 0, 0), pages - 1);
  const current = grouped[currentPage] ?? { rarity: 'common', rows: [] };
  const rarityRows = current.rows;
  const discovered = rows.filter(row => Number(row.quantity) > 0).length;
  const totalFish = rows.length;
  const totalCaught = rows.reduce((sum, row) => sum + Number(row.quantity || 0), 0);
  const rarityFound = rarityRows.filter(row => Number(row.quantity) > 0).length;
  const percent = totalFish ? discovered / totalFish : 0;

  const lines = rarityRows.length
    ? rarityRows.map(row => {
        const owned = Number(row.quantity) > 0;
        const value = Number(row.value).toLocaleString();
        return (owned ? '♡' : '・') + ' **' + row.name + '**  ' +
          (owned ? '×' + row.quantity : '— undiscovered') + '  ·  ' + value + ' coins';
      }).join('\n')
    : '*The cosmic tide is waiting for your first discovery.*';

  const embed = new EmbedBuilder()
    .setColor(current.rarity === 'tsukuyomi' ? 0xc77dff : current.rarity === 'secret' ? 0xf08a24 : 0xf3a6c7)
    .setTitle('📖  ' + username + '’s Celestial Almanac')
    .setDescription(
      '╭─────────────── 𓆝 ───────────────╮\n' +
      '✦ **Collection progress**  ' + discovered + '/' + totalFish + '\n' +
      progressBar(percent) + '  **' + Math.round(percent * 100) + '%**\n' +
      '✦ **Total catches**  ' + totalCaught + '\n' +
      '╰─────────────── 𓆝 ───────────────╯\n\n' +
      '**' + (RARITY_LABELS[current.rarity] || current.rarity) + '**  ·  ' +
      rarityFound + '/' + rarityRows.length + ' discovered\n\n' +
      lines
    )
    .setFooter({
      text: 'Page ' + (currentPage + 1) + '/' + pages + '  •  ' +
        (current.rarity === 'tsukuyomi' ? 'Tsukuyomi: Yachiyo, Iroha, Kaguya.' : 'Each rarity has its own collection page.')
    });

  const controls = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('fish_almanac_prev:' + currentPage).setLabel('Previous').setEmoji('🌙').setStyle(ButtonStyle.Secondary).setDisabled(currentPage === 0),
    new ButtonBuilder().setCustomId('fish_almanac_next:' + currentPage).setLabel('Next').setEmoji('✨').setStyle(ButtonStyle.Primary).setDisabled(currentPage >= pages - 1)
  );

  return { embed, controls };
}
