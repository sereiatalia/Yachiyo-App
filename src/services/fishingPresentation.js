import { EmbedBuilder } from 'discord.js';
import { PULL_CUTSCENES } from '../config/fishRarities.js';

const COLORS = { epic:0x9a7bd1, legendary:0xe88f9a, ancient:0xb88935, celestial:0xf2c66d, secret:0xf08a24, tsukuyomi:0x9d314e };

export async function runPullSequence(interaction, rarity) {
  const scenes = PULL_CUTSCENES[rarity] ?? ['The line tightens beneath the surface...', 'The current is resisting your pull...'];
  for (let i = 0; i < scenes.length; i++) {
    const filled = Math.min(18, 6 + i * 4);
    const progress = '█'.repeat(filled) + '░'.repeat(18 - filled);
    const title = i === scenes.length - 1 ? '✦ THE COSMIC TIDE ANSWERS ✦' : '🎣 THE LINE PULLS...';
    await interaction.editReply({ embeds: [new EmbedBuilder().setColor(COLORS[rarity] ?? 0x4db8e8).setTitle(title).setDescription('╭─────────────── 𓆝 ───────────────╮\n' + scenes[i] + '\n\n[' + progress + ']\n\n' + (i === scenes.length - 1 ? '**The catch is almost within reach...**' : '*Keep the line steady.*') + '\n╰─────────────── 𓆝 ───────────────╯')] });
    await new Promise(resolve => setTimeout(resolve, i === scenes.length - 1 ? 900 : 650));
  }
}
