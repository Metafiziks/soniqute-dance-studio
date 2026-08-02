export interface TraitFile {
  name: string;
  fileName: string;
  filePath: string;
  weight: number;
  rarity: number; // percentage 0-100
  isNone?: boolean; // virtual trait — skip rendering and metadata
}

export interface LayerConfig {
  name: string;
  folderName: string;
  required: boolean;
  order: number;
  traits: TraitFile[];
  frequency: number; // 0-100, how often this layer appears across the collection
}

export interface SelectedTrait {
  layer: string;
  traitName: string;
  fileName: string;
  filePath: string;
  rarity: number;
}

export interface LoreTrait {
  code: string;
  name: string;
  level: number;
  label: string;
  text: string;
}

export interface GeneratedCard {
  tokenId: number;
  dna: string;
  rarity: string;
  rarityScore: number;
  traits: SelectedTrait[];
  loreTraits: LoreTrait[];
  flavorText: string;
  imagePath: string;
  cardPath: string;
  metadataPath: string;
}

export interface Metadata {
  name: string;
  description: string;
  image: string;
  card_image: string;
  dna: string;
  edition: number;
  date: number;
  rarity: string;
  attributes: Array<{ trait_type: string; value: string | number }>;
  compiler: string;
}

export interface ProjectConfig {
  collectionName: string;
  collectionSize: number;
  description: string;
  pixelArtMode: boolean;
  layerOrder: string[];
  optionalLayers: string[];
  incompatibilityRules: IncompatibilityRule[];
  dependencyRules: DependencyRule[];
}

export interface IncompatibilityRule {
  id: string;
  ifTrait: string;
  thenExclude: string[];
  enabled: boolean;
}

export interface DependencyRule {
  id: string;
  ifTrait: string;
  thenRequire: { layer: string; traits: string[] };
  enabled: boolean;
}
