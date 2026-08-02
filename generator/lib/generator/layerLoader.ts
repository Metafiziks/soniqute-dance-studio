import fs from "fs";
import path from "path";
import { DEFAULT_LAYER_ORDER } from "./config";
import { LayerConfig, TraitFile } from "./types";

interface LoadLayersOptions {
  defaultLayerOrder?: string[];
  layersWithNone?: string[];
  defaultFrequencies?: Record<string, number>;
}

// Bags Bro default frequencies (used as fallback for bags-bro collection)
const BAGS_BRO_DEFAULT_FREQUENCIES: Record<string, number> = {
  Wings: 5,
  Bag_Vision: 8,
  Earrings: 20,
  Facial_Hair: 30,
  Socks: 40,
  Outfit: 15,
};

const BAGS_BRO_LAYERS_WITH_NONE = [
  "Socks", "Outfit", "Facial_Hair", "Earrings", "Wings", "Bag_Vision", "Mouth",
];

export function loadLayers(layersRoot: string, options: LoadLayersOptions = {}): LayerConfig[] {
  const layerOrder = options.defaultLayerOrder?.length
    ? options.defaultLayerOrder
    : DEFAULT_LAYER_ORDER;
  const layersWithNone = options.layersWithNone ?? BAGS_BRO_LAYERS_WITH_NONE;
  const defaultFrequencies = options.defaultFrequencies && Object.keys(options.defaultFrequencies).length
    ? options.defaultFrequencies
    : BAGS_BRO_DEFAULT_FREQUENCIES;

  const layers: LayerConfig[] = [];
  const folders = fs.existsSync(layersRoot)
    ? fs.readdirSync(layersRoot).filter((f) => {
        const p = path.join(layersRoot, f);
        return fs.statSync(p).isDirectory();
      })
    : [];

  const ordered = [
    ...layerOrder.filter((l) => folders.includes(l)),
    ...folders.filter((f) => !layerOrder.includes(f)),
  ];

  ordered.forEach((layerName, index) => {
    const layerPath = path.join(layersRoot, layerName);
    const weightsFile = path.join(layerPath, "weights.json");
    const saved: Record<string, number> = fs.existsSync(weightsFile)
      ? JSON.parse(fs.readFileSync(weightsFile, "utf-8"))
      : {};

    const frequency: number = saved["__frequency"] ?? defaultFrequencies[layerName] ?? 100;

    const files = fs
      .readdirSync(layerPath)
      .filter((f) => f.endsWith(".png") && !f.startsWith(".") && !f.toLowerCase().includes("__none"));

    const hasNone = layersWithNone.includes(layerName);

    const noneWeight = hasNone ? (saved["none"] ?? 0) : 0;
    const totalWeight = files.reduce((sum, file) => {
      const name = fileToTraitName(file);
      return sum + (saved[name] ?? 10);
    }, 0) + noneWeight;

    const traits: TraitFile[] = files.map((file) => {
      const name = fileToTraitName(file);
      const weight = saved[name] ?? 10;
      return {
        name,
        fileName: file,
        filePath: path.join(layerPath, file),
        weight,
        rarity: totalWeight > 0 ? Math.round((weight / totalWeight) * 10000) / 100 : 0,
        isNone: false,
      };
    });

    if (hasNone) {
      traits.unshift({
        name: "none",
        fileName: "",
        filePath: "",
        weight: noneWeight,
        rarity: totalWeight > 0 ? Math.round((noneWeight / totalWeight) * 10000) / 100 : 0,
        isNone: true,
      });
    }

    layers.push({
      name: layerName,
      folderName: layerName,
      required: frequency >= 100,
      order: index,
      traits,
      frequency,
    });
  });

  return layers;
}

export function fileToTraitName(fileName: string): string {
  const withoutExt = fileName.replace(".png", "");
  if (withoutExt.includes("__")) {
    return withoutExt.split("__").slice(1).join(" ").replace(/_/g, " ");
  }
  return withoutExt.replace(/_/g, " ");
}

export function traitNameToFileName(name: string): string {
  return name.replace(/ /g, "_") + ".png";
}
