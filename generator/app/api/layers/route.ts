import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { loadLayers } from "@/lib/generator/layerLoader";

function collectionPath(id: string) {
  return path.join(process.cwd(), "collections", id);
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const collectionId = searchParams.get("collection") ?? "bags-bro";
    const layersPath = path.join(collectionPath(collectionId), "layers");

    const configPath = path.join(collectionPath(collectionId), "collection.json");
    const config = fs.existsSync(configPath)
      ? JSON.parse(fs.readFileSync(configPath, "utf-8"))
      : {};

    const layers = loadLayers(layersPath, {
      defaultLayerOrder: config.defaultLayerOrder ?? [],
      layersWithNone: config.layersWithNone ?? [],
      defaultFrequencies: config.defaultFrequencies ?? {},
    });
    const order = layers.map(l => l.name);
    return NextResponse.json({ layers, order, config });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to load layers", details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const { layerName, traitName, weight } = await req.json();
    return NextResponse.json({ success: true, layerName, traitName, weight });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update weight", details: String(error) },
      { status: 500 }
    );
  }
}
