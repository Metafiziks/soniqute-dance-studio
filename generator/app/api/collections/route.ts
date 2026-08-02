import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  const collectionsDir = path.join(process.cwd(), "collections");
  
  try {
    const entries = fs.readdirSync(collectionsDir, { withFileTypes: true });
    const collections = entries
      .filter(e => e.isDirectory())
      .map(e => {
        try {
          const configPath = path.join(collectionsDir, e.name, "collection.json");
          const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
          return { id: config.id, name: config.name, description: config.description ?? "" };
        } catch {
          return { id: e.name, name: e.name, description: "" };
        }
      });
    
    return NextResponse.json({ collections });
  } catch {
    return NextResponse.json({ collections: [] });
  }
}
