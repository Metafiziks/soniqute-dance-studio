import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";

export async function POST(req: Request) {
  try {
    const { collection = "bags-bro", layerName, weights, frequency } = await req.json();
    const layerPath = path.join(process.cwd(), "collections", collection, "layers", layerName);
    if (!fs.existsSync(layerPath)) {
      return NextResponse.json({ error: "Layer not found" }, { status: 404 });
    }
    const toSave = { __frequency: frequency ?? 100, ...weights };
    fs.writeFileSync(path.join(layerPath, "weights.json"), JSON.stringify(toSave, null, 2));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to save weights", details: String(error) },
      { status: 500 }
    );
  }
}
