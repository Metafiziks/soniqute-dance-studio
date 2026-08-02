import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await params;
  const filePath = path.join(process.cwd(), "collections", ...segments);

  if (!fs.existsSync(filePath)) {
    return new NextResponse("Not found: " + filePath, { status: 404 });
  }

  const buffer = fs.readFileSync(filePath);
  return new NextResponse(buffer, {
    headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=3600" },
  });
}
