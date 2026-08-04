import { EmbedBuilder } from 'discord.js';
import { PULL_CUTSCENES } from '../config/fishRarities.js';
import { YACHIYO_THEME } from '../ui/yachiyoTheme.js';

const COLORS = { epic:0x9a7bd1, legendary:0xe88f9a, ancient:0xb88935, celestial:0xf2c66d, secret:0xf08a24, tsukuyomi:0x9d314e };

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export async function runPullSequence(interaction, rarity) {
  const scenes = PULL_CUTSCENES[rarity];
  if (!scenes) return;

  for (let i = 0; i < scenes.length; i += 1) {
    const filled = Math.min(18, 6 + i * 4);
    const progress = '█'.repeat(filled) + '░'.repeat(18 - filled);
    const finalScene = i === scenes.length - 1;
    const title = finalScene ? '✦ THE COSMIC TIDE ANSWERS ✦' : '🎣 THE LINE PULLS...';
    const hint = finalScene ? '**The catch is almost within reach...**' : '*Keep the line steady.*';

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(COLORS[rarity] ?? 0x4db8e8)
          .setTitle(title)
          .setDescription([
            YACHIYO_THEME.separators,
            scenes[i],
            '',
            `[${progress}]`,
            '',
            hint,
            YACHIYO_THEME.separators
          ].join('\n'))
          .setFooter({ text: 'Yachiyo’s celestial reel • stay calm, stay cute' })
      ]
    });

    await wait(finalScene ? 900 : 650);
  }
}
