import { createCanvas, loadImage } from '@napi-rs/canvas';
import { AttachmentBuilder } from 'discord.js';
import { RARITY_PHRASES } from '../config/fishRarities.js';
import { rarityAccent } from './yachiyoTheme.js';

const WIDTH = 1000;
const HEIGHT = 500;

async function getBackground(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Background unavailable');
  return loadImage(Buffer.from(await response.arrayBuffer()));
}

function text(ctx, value, font, y, color = '#ffffff', shadow = true) {
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = color;
  ctx.shadowColor = shadow ? 'rgba(38, 29, 43, 0.82)' : 'transparent';
  ctx.shadowBlur = shadow ? 9 : 0;
  ctx.shadowOffsetX = shadow ? 2 : 0;
  ctx.shadowOffsetY = shadow ? 2 : 0;
  ctx.fillText(value, WIDTH / 2, y);
}

function panel(ctx) {
  const gradient = ctx.createLinearGradient(0, 205, 0, 470);
  gradient.addColorStop(0, 'rgba(35, 28, 42, 0.04)');
  gradient.addColorStop(0.48, 'rgba(35, 28, 42, 0.22)');
  gradient.addColorStop(1, 'rgba(35, 28, 42, 0.48)');
  ctx.fillStyle = gradient;
  ctx.fillRect(45, 35, WIDTH - 90, HEIGHT - 70);
}

function frame(ctx, accent) {
  ctx.strokeStyle = accent;
  ctx.lineWidth = 5;
  ctx.globalAlpha = 0.85;
  ctx.strokeRect(22, 22, WIDTH - 44, HEIGHT - 44);
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.6;
  ctx.strokeRect(35, 35, WIDTH - 70, HEIGHT - 70);
  ctx.globalAlpha = 1;
  text(ctx, '୨୧', 'bold 26px sans-serif', 57, accent, false);
  text(ctx, '୨୧', 'bold 26px sans-serif', 57, accent, false);
}

export async function createFishCard({ fish, rarity, valueBonus = 0, luckBonus = 0, badge = '' }) {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');
  const theme = rarityAccent(fish.rarity);

  try {
    const image = await getBackground(rarity.background);
    ctx.drawImage(image, 0, 0, WIDTH, HEIGHT);
  } catch {
    ctx.fillStyle = '#8ecfee';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }

  panel(ctx);
  frame(ctx, theme.accent);
  text(ctx, '˚₊‧꒰ა You successfully catch a... ໒꒱‧₊˚', 'italic 28px sans-serif', 83);
  text(ctx, rarity.label.toUpperCase() + ' CATCH!', 'bold 52px sans-serif', 138);
  text(ctx, RARITY_PHRASES[fish.rarity] ?? 'The cosmic tide has granted you a discovery!', 'italic 21px sans-serif', 174);

  const fishName = String(fish.name).toUpperCase();
  const fishFontSize = Math.min(112, Math.max(48, Math.floor(920 / Math.max(fishName.length, 8) * 1.35)));
  text(ctx, fishName, 'bold ' + fishFontSize + 'px sans-serif', 300);

  text(ctx, 'Successfully saved to Almanac', 'italic 32px sans-serif', 365, '#fff7fa', false);
  text(ctx, 'Est. Value: ' + Number(fish.value ?? 0).toLocaleString() + ' coins', '24px sans-serif', 404, '#fff7fa', false);
  text(ctx, 'Value Bonus: +' + Math.round(valueBonus) + '% | Luck Bonus: +' + Math.round(luckBonus) + '%', '22px sans-serif', 439, '#fff7fa', false);
  if (badge) text(ctx, badge, 'bold 18px sans-serif', 470, theme.accent, false);

  return new AttachmentBuilder(await canvas.encode('png'), { name: 'yachiyo-fish-card.png' });
}
