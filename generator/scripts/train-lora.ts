// ============================================
// PaMs LoRA Training Script
// Uploads lora-dataset.zip to Replicate and
// trains a custom FLUX LoRA on the 1,000 PaMs
// collectible card images.
//
// Prerequisites:
//   node scripts/generate-dataset.js
//   node scripts/zip-dataset.js (or: zip -r lora-dataset.zip lora-dataset/)
//
// Run:
//   REPLICATE_API_TOKEN=r8_... npx ts-node scripts/train-lora.ts
// ============================================

import * as fs from "fs";
import * as path from "path";

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;
if (!REPLICATE_API_TOKEN) {
  console.error("❌ Set REPLICATE_API_TOKEN env var first");
  console.error("   export REPLICATE_API_TOKEN=r8_...");
  process.exit(1);
}

const ZIP_PATH = path.join(__dirname, "..", "lora-dataset.zip");
if (!fs.existsSync(ZIP_PATH)) {
  console.error(`❌ Zip not found at ${ZIP_PATH}`);
  console.error("   Run: zip -r lora-dataset.zip lora-dataset/");
  process.exit(1);
}

// ── Step 1: Upload zip to Replicate file storage ──────────────────────────────

async function uploadZip(): Promise<string> {
  console.log("📤 Uploading dataset zip to Replicate...");

  const zipBuffer = fs.readFileSync(ZIP_PATH);
  const sizeMB = (zipBuffer.length / 1024 / 1024).toFixed(1);
  console.log(`   File size: ${sizeMB} MB`);

  const formData = new FormData();
  const blob = new Blob([zipBuffer], { type: "application/zip" });
  formData.append("content", blob, "lora-dataset.zip");

  const response = await fetch("https://api.replicate.com/v1/files", {
    method: "POST",
    headers: { Authorization: `Bearer ${REPLICATE_API_TOKEN}` },
    body: formData,
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Upload failed (${response.status}): ${err}`);
  }

  const data = await response.json() as { urls: { get: string }; id: string };
  console.log(`✅ Zip uploaded: ${data.id}`);
  return data.urls.get;
}

// ── Step 2: Submit training job ───────────────────────────────────────────────

async function submitTraining(zipUrl: string): Promise<string> {
  console.log("\n🚀 Submitting LoRA training job to Replicate...");

  // Create the destination model at https://replicate.com/create before running.
  // Replace with your Replicate username and model name.
  const DESTINATION = "your-username/pams-collection-style";

  // Trigger word to activate the LoRA in prompts. Include it in every generation prompt.
  const TRIGGER_WORD = "PAMSCHAR";

  const VERSION = "4ffd32160efd92e956d39c5338a9b8fbafca58e03f791f6d8011f3e20e8ea6fa";
  const response = await fetch(
    `https://api.replicate.com/v1/models/ostris/flux-dev-lora-trainer/versions/${VERSION}/trainings`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        destination: DESTINATION,
        input: {
          input_images: zipUrl,
          trigger_word: TRIGGER_WORD,
          steps: 2000,
          lora_rank: 16,
          optimizer: "adamw8bit",
          batch_size: 1,
          resolution: "512,768,1024",
          autocaption: false,
          learning_rate: 0.0004,
          caption_dropout_rate: 0.1,
        },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Training submission failed (${response.status}): ${err}`);
  }

  const data = await response.json() as { id: string; urls: { get: string } };
  console.log(`✅ Training job submitted!`);
  console.log(`   Training ID: ${data.id}`);
  console.log(`   Track at: https://replicate.com/p/${data.id}`);
  return data.id;
}

// ── Step 3: Poll for completion ───────────────────────────────────────────────

async function pollTraining(trainingId: string): Promise<string> {
  console.log("\n⏳ Polling for completion (~30–45 min)...");
  console.log("   You can safely Ctrl+C and check the URL above manually.\n");

  const startTime = Date.now();
  while (true) {
    await new Promise(r => setTimeout(r, 30_000));

    const response = await fetch(
      `https://api.replicate.com/v1/trainings/${trainingId}`,
      { headers: { Authorization: `Bearer ${REPLICATE_API_TOKEN}` } }
    );

    const data = await response.json() as {
      status: string;
      output?: { weights: string };
      error?: string;
    };

    const elapsed = Math.round((Date.now() - startTime) / 60000);
    console.log(`   [${elapsed}m] Status: ${data.status}`);

    if (data.status === "succeeded") {
      const weightsUrl = data.output?.weights;
      if (!weightsUrl) throw new Error("Training succeeded but no weights URL returned");

      console.log("\n🎉 Training complete!");
      console.log(`   Weights URL: ${weightsUrl}`);
      console.log("\n📋 Next step — use this weights URL when prompting:");
      console.log(`   Include "PAMSCHAR" in every prompt to activate the style.`);

      fs.writeFileSync(
        path.join(__dirname, "..", "pams-lora.txt"),
        `Training ID: ${trainingId}\nWeights URL: ${weightsUrl}\nCompleted: ${new Date().toISOString()}\n`
      );
      console.log("\n💾 Weights URL saved to pams-lora.txt");
      return weightsUrl;
    }

    if (data.status === "failed" || data.status === "canceled") {
      throw new Error(`Training ${data.status}: ${data.error ?? "unknown error"}`);
    }
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🎨 PaMs LoRA Training Pipeline\n");
  try {
    const zipUrl = await uploadZip();
    const trainingId = await submitTraining(zipUrl);
    await pollTraining(trainingId);
  } catch (err: unknown) {
    console.error("\n❌ Error:", err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

main();
