import { createCanvas, loadImage } from '@napi-rs/canvas';
import { AttachmentBuilder } from 'discord.js';

const WIDTH = 1000;
const HEIGHT = 500;

async function loadBackground(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Fish background unavailable');
  return loadImage(Buffer.from(await response.arrayBuffer()));
}

function safeText(value) {
  return String(value ?? '').replace(/[\\u0000-\\u001f]/g, '').replace(/[𐀀-􏿿]/gu, '');
}

function write(ctx, value, x, y, font, { stroke = true } = {}) {
  const text = safeText(value);
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  if (stroke) {
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#10131d';
    ctx.strokeText(text, x, y);
  }
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, x, y);
}

export async function createFishCard({ fish, rarity, reward, valueBonus = 0, luckBonus = 0 }) {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');

  try {
    const background = await loadBackground(rarity.background);
    ctx.drawImage(background, 0, 0, WIDTH, HEIGHT);
  } catch {
    ctx.fillStyle = '#263c62';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }

  const center = WIDTH / 2;
  const flavor = rarity.label === 'Common'
    ? 'Just a regular day at the river...'
    : rarity.label === 'Epic'
      ? 'A truly remarkable find, this will be remembered!'
      : 'The cosmic tide has granted you a remarkable discovery!';

  // Plain sans-serif declarations match the old working canvas implementation.
  write(ctx, 'You successfully catch a...', center, 80, 'italic 28px sans-serif');
  write(ctx, safeText(rarity.label).toUpperCase() + ' CATCH!', center, 130, 'bold 50px sans-serif');
  write(ctx, flavor, center, 165, 'italic 20px sans-serif');

  const name = safeText(fish.name).toUpperCase();
  const nameSize = Math.min(115, Math.max(48, Math.floor(900 / Math.max(name.length, 8) * 1.35)));
  write(ctx, name, center, 290, 'bold ' + nameSize + 'px sans-serif');

  write(ctx, 'Successfully saved to Almanac', center, 360, 'italic 32px sans-serif', { stroke: false });
  write(ctx, 'Est. Value: ' + Number(fish.value ?? 0).toLocaleString() + ' coins', center, 395, '24px sans-serif', { stroke: false });
  write(ctx, 'Fishing Reward: +' + Number(reward ?? 0).toLocaleString() + ' coins', center, 420, '22px sans-serif', { stroke: false });
  write(ctx, 'Value Bonus: +' + Math.round(valueBonus) + '% | Luck Bonus: +' + Math.round(luckBonus) + '%', center, 450, '22px sans-serif', { stroke: false });

  return new AttachmentBuilder(await canvas.encode('png'), { name: 'yachiyo-fish-catch.png' });
}
