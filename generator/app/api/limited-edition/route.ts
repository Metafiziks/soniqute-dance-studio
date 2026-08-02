import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const LE_DIR = path.join(process.cwd(), "collections", "pams", "limited-edition");
const SLOTS_FILE = path.join(LE_DIR, "slots.json");
const MAX_SLOTS = 25;

type SlotData = { name: string; description: string; hasImage: boolean };

function ensureDir() {
  if (!fs.existsSync(LE_DIR)) fs.mkdirSync(LE_DIR, { recursive: true });
}

function readSlots(): SlotData[] {
  ensureDir();
  if (!fs.existsSync(SLOTS_FILE)) {
    const empty = Array.from({ length: MAX_SLOTS }, () => ({ name: "", description: "", hasImage: false }));
    fs.writeFileSync(SLOTS_FILE, JSON.stringify(empty, null, 2));
    return empty;
  }
  return JSON.parse(fs.readFileSync(SLOTS_FILE, "utf-8"));
}

function writeSlots(slots: SlotData[]) {
  ensureDir();
  fs.writeFileSync(SLOTS_FILE, JSON.stringify(slots, null, 2));
}

function slotImagePath(index: number) {
  return path.join(LE_DIR, `slot-${String(index + 1).padStart(2, "0")}.png`);
}

// GET — load all slots
export async function GET() {
  const slots = readSlots();
  const result = slots.map((s, i) => ({
    ...s,
    hasImage: fs.existsSync(slotImagePath(i)),
    imageUrl: fs.existsSync(slotImagePath(i))
      ? `/api/collections-static/pams/limited-edition/slot-${String(i + 1).padStart(2, "0")}.png`
      : null,
  }));
  return NextResponse.json({ slots: result });
}

// POST — save a slot (FormData: index, name, description, image?)
export async function POST(req: NextRequest) {
  ensureDir();
  const formData = await req.formData();
  const index = Number(formData.get("index"));
  const name = String(formData.get("name") ?? "");
  const description = String(formData.get("description") ?? "");
  const image = formData.get("image") as File | null;

  if (isNaN(index) || index < 0 || index >= MAX_SLOTS) {
    return NextResponse.json({ error: "Invalid slot index" }, { status: 400 });
  }

  const slots = readSlots();
  slots[index] = { name, description, hasImage: slots[index].hasImage };

  // Save image if provided
  if (image && image.size > 0) {
    const buffer = Buffer.from(await image.arrayBuffer());
    fs.writeFileSync(slotImagePath(index), buffer);
    slots[index].hasImage = true;
  }

  writeSlots(slots);

  return NextResponse.json({
    ok: true,
    slot: {
      ...slots[index],
      imageUrl: slots[index].hasImage
        ? `/api/collections-static/pams/limited-edition/slot-${String(index + 1).padStart(2, "0")}.png`
        : null,
    },
  });
}

// DELETE — remove a slot's image and clear its data
export async function DELETE(req: NextRequest) {
  const { index } = await req.json();
  if (typeof index !== "number" || index < 0 || index >= MAX_SLOTS) {
    return NextResponse.json({ error: "Invalid slot index" }, { status: 400 });
  }

  const slots = readSlots();
  slots[index] = { name: "", description: "", hasImage: false };

  const imgPath = slotImagePath(index);
  if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);

  writeSlots(slots);
  return NextResponse.json({ ok: true });
}
