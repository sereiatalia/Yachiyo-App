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

function drawText(ctx, value, font, y, color = '#ffffff', shadow = true) {
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = color;
  ctx.shadowColor = shadow ? 'rgba(38, 29, 43, 0.82)' : 'transparent';
  ctx.shadowBlur = shadow ? 9 : 0;
  ctx.shadowOffsetX = shadow ? 2 : 0;
  ctx.shadowOffsetY = shadow ? 2 : 0;
  ctx.fillText(String(value), WIDTH / 2, y);
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
}

function drawOverlay(ctx) {
  const gradient = ctx.createLinearGradient(0, 190, 0, HEIGHT);
  gradient.addColorStop(0, 'rgba(35, 28, 42, 0.02)');
  gradient.addColorStop(0.45, 'rgba(35, 28, 42, 0.20)');
  gradient.addColorStop(1, 'rgba(35, 28, 42, 0.58)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
}

function drawFrame(ctx, accent) {
  ctx.strokeStyle = accent;
  ctx.lineWidth = 5;
  ctx.globalAlpha = 0.9;
  ctx.strokeRect(22, 22, WIDTH - 44, HEIGHT - 44);
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.65;
  ctx.strokeRect(35, 35, WIDTH - 70, HEIGHT - 70);
  ctx.globalAlpha = 1;

  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(100, 55);
  ctx.lineTo(900, 55);
  ctx.stroke();
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

  drawOverlay(ctx);
  drawFrame(ctx, theme.accent);

  // Keep the canvas text ASCII-only: some Railway font stacks silently drop emoji and ornamental glyphs.
  drawText(ctx, 'You successfully catch a...', 'italic 28px sans-serif', 84);
  drawText(ctx, `${rarity.label.toUpperCase()} CATCH!`, 'bold 52px sans-serif', 140);
  drawText(ctx, RARITY_PHRASES[fish.rarity] ?? 'The cosmic tide has granted you a remarkable discovery!', 'italic 21px sans-serif', 176);

  const fishName = String(fish.name).toUpperCase();
  const fishFontSize = Math.min(112, Math.max(48, Math.floor(920 / Math.max(fishName.length, 8) * 1.35)));
  drawText(ctx, fishName, `bold ${fishFontSize}px sans-serif`, 304);

  drawText(ctx, 'Successfully saved to Almanac', 'italic 32px sans-serif', 368, '#fff7fa', false);
  drawText(ctx, `Est. Value: ${Number(fish.value ?? 0).toLocaleString()} coins`, '24px sans-serif', 407, '#fff7fa', false);
  drawText(ctx, `Value Bonus: +${Math.round(valueBonus)}% | Luck Bonus: +${Math.round(luckBonus)}%`, '22px sans-serif', 442, '#fff7fa', false);
  if (badge) drawText(ctx, badge, 'bold 18px sans-serif', 472, theme.accent, false);

  return new AttachmentBuilder(await canvas.encode('png'), { name: 'yachiyo-fish-card.png' });
}
