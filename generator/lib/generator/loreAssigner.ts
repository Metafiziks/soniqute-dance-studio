import { LORE_TRAITS, LORE_LEVEL_THRESHOLDS } from "./config";
import { LoreTrait } from "./types";

export function assignLoreTraits(rarityScore: number): LoreTrait[] {
  return LORE_TRAITS.map((trait) => {
    // Add some randomness per-trait (±20 points) so not all traits are same level
    const variance = (Math.random() - 0.5) * 40;
    const adjustedScore = Math.max(0, Math.min(100, rarityScore + variance));
    const threshold = LORE_LEVEL_THRESHOLDS.find((t) => adjustedScore <= t.maxScore);
    const level = threshold?.level ?? 5;
    const levelData = trait.levels.find((l) => l.level === level) ?? trait.levels[0];

    return {
      code: trait.code,
      name: trait.name,
      level,
      label: levelData.label,
      text: levelData.text,
    };
  });
}
