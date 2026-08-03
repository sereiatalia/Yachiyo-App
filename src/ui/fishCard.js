import { createCanvas, loadImage } from '@napi-rs/canvas';
import { AttachmentBuilder } from 'discord.js';

const WIDTH = 1000;
const HEIGHT = 500;

async function getBackground(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Background unavailable');
  return loadImage(Buffer.from(await response.arrayBuffer()));
}

function centerText(ctx, text, font, y, shadow = true) {
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#ffffff';
  if (shadow) {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.80)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
  } else {
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }
  ctx.fillText(text, 500, y);
}

export async function createFishCard({ fish, rarity, valueBonus = 0, luckBonus = 0 }) {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');

  try {
    const image = await getBackground(rarity.background);
    ctx.drawImage(image, 0, 0, WIDTH, HEIGHT);
  } catch {
    ctx.fillStyle = '#56b8e6';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }

  const phrase = rarity.label === 'Common'
    ? 'Just a regular day at the river...'
    : rarity.label === 'Uncommon'
      ? 'Not bad, a little extra effort pays off!'
      : rarity.label === 'Epic'
        ? 'A truly remarkable find, this will be remembered!'
        : 'The cosmic tide has granted you a remarkable discovery!';

  centerText(ctx, 'You successfully catch a...', 'italic 28px sans-serif', 80);
  centerText(ctx, rarity.label.toUpperCase() + ' CATCH!', 'bold 50px sans-serif', 130);
  centerText(ctx, phrase, 'italic 20px sans-serif', 165);

  const fishName = String(fish.name).toUpperCase();
  const fishFontSize = Math.min(115, Math.max(52, Math.floor(900 / Math.max(fishName.length, 8) * 1.35)));
  centerText(ctx, fishName, 'bold ' + fishFontSize + 'px sans-serif', 290);

  centerText(ctx, 'Successfully saved to Almanac', 'italic 32px sans-serif', 360, false);
  centerText(ctx, 'Est. Value: ' + Number(fish.value ?? 0).toLocaleString() + ' coins', '24px sans-serif', 395, false);
  centerText(ctx, 'Value Bonus: +' + Math.round(valueBonus) + '% | Luck Bonus: +' + Math.round(luckBonus) + '%', '22px sans-serif', 430, false);

  return new AttachmentBuilder(await canvas.encode('png'), { name: 'fish-card-v3.png' });
}
