import { LayerConfig, SelectedTrait, TraitFile } from "./types";
import { INCOMPATIBILITY_RULES, DEPENDENCY_RULES } from "./config";

export function selectTraits(
  layers: LayerConfig[],
  optionalLayers: string[]
): SelectedTrait[] {
  const selected: SelectedTrait[] = [];
  const selectedNames = new Set<string>();

  for (const layer of layers) {
    const isOptional = optionalLayers.includes(layer.name);

    // Skip optional layers ~40% of the time
    if (isOptional && Math.random() < 0.4) continue;

    const available = getAvailableTraits(layer, selectedNames);
    if (available.length === 0) continue;

    const trait = weightedRandom(available);
    if (!trait) continue;

    selected.push({
      layer: layer.name,
      traitName: trait.name,
      fileName: trait.fileName,
      filePath: trait.filePath,
      rarity: trait.rarity,
    });
    selectedNames.add(trait.name);
  }

  return applyDependencyRules(selected, layers);
}

function getAvailableTraits(
  layer: LayerConfig,
  selectedNames: Set<string>
): TraitFile[] {
  return layer.traits.filter((trait) => {
    // Check incompatibility rules
    for (const rule of INCOMPATIBILITY_RULES) {
      if (!rule.enabled) continue;
      if (selectedNames.has(rule.ifTrait) && rule.thenExclude.includes(trait.name)) {
        return false;
      }
      if (trait.name === rule.ifTrait) {
        for (const excluded of rule.thenExclude) {
          if (selectedNames.has(excluded)) return false;
        }
      }
    }
    return true;
  });
}

function applyDependencyRules(
  selected: SelectedTrait[],
  layers: LayerConfig[]
): SelectedTrait[] {
  const result = [...selected];

  for (const rule of DEPENDENCY_RULES) {
    if (!rule.enabled) continue;
    const hasTrigger = result.some((t) => t.traitName === rule.ifTrait);
    if (!hasTrigger) continue;

    const targetLayer = layers.find((l) => l.name === rule.thenRequire.layer);
    if (!targetLayer) continue;

    const existingIdx = result.findIndex((t) => t.layer === rule.thenRequire.layer);
    const requiredTraitName = rule.thenRequire.traits[0];
    const requiredTrait = targetLayer.traits.find((t) => t.name === requiredTraitName);
    if (!requiredTrait) continue;

    const replacement: SelectedTrait = {
      layer: targetLayer.name,
      traitName: requiredTrait.name,
      fileName: requiredTrait.fileName,
      filePath: requiredTrait.filePath,
      rarity: requiredTrait.rarity,
    };

    if (existingIdx >= 0) {
      result[existingIdx] = replacement;
    } else {
      result.push(replacement);
    }
  }

  return result;
}

export function weightedRandom(traits: TraitFile[]): TraitFile | null {
  if (traits.length === 0) return null;
  const total = traits.reduce((sum, t) => sum + t.weight, 0);
  let rand = Math.random() * total;
  for (const trait of traits) {
    rand -= trait.weight;
    if (rand <= 0) return trait;
  }
  return traits[traits.length - 1];
}

export function generateDNA(traits: SelectedTrait[]): string {
  return traits
    .map((t) => `${t.layer}:${t.traitName}`)
    .sort()
    .join("|");
}

export function calculateRarityScore(traits: SelectedTrait[]): number {
  if (traits.length === 0) return 0;
  const avg = traits.reduce((sum, t) => sum + t.rarity, 0) / traits.length;
  // Invert so rarer traits = higher score
  return Math.round(100 - avg);
}
