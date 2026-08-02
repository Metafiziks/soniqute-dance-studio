import { GeneratedCard, Metadata } from "./types";
import { CONFIG } from "./config";

export function buildMetadata(card: GeneratedCard, baseUri: string = ""): Metadata {
  const attributes = [
    ...card.traits.map((t) => ({
      trait_type: t.layer,
      value: t.traitName,
    })),
    ...card.loreTraits.map((lt) => ({
      trait_type: lt.name,
      value: lt.label,
    })),
    { trait_type: "Rarity Tier", value: card.rarity },
    { trait_type: "Rarity Score", value: card.rarityScore },
  ];

  return {
    name: `${CONFIG.collectionName} #${card.tokenId}`,
    description: card.flavorText || CONFIG.collectionDescription,
    image: baseUri ? `${baseUri}/images/${card.tokenId}.png` : `${card.tokenId}.png`,
    card_image: baseUri ? `${baseUri}/cards/${card.tokenId}.png` : `${card.tokenId}_card.png`,
    dna: card.dna,
    edition: card.tokenId,
    date: Date.now(),
    rarity: card.rarity,
    attributes,
    compiler: "Bags Bro! Studio",
  };
}
