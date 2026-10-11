import { randomInt } from 'node:crypto';

// Each Discord user is one entry, regardless of reaction retry or event timing.
// Fisher-Yates with crypto.randomInt gives every eligible entry an equal chance.
export function selectGiveawayWinners(entries, winnerCount, excludedUserIds = []) {
  const excluded = new Set(excludedUserIds.map(String));
  const eligible = [...new Set(entries.map(String))].filter(userId => !excluded.has(userId));
  for (let index = eligible.length - 1; index > 0; index--) {
    const swapIndex = randomInt(index + 1);
    [eligible[index], eligible[swapIndex]] = [eligible[swapIndex], eligible[index]];
  }
  return eligible.slice(0, Math.max(0, Math.floor(Number(winnerCount) || 0)));
}
