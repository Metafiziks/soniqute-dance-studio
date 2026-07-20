const { Storage } = require('@google-cloud/storage');
const { pipeline } = require('stream/promises');
const fs = require('fs');

const storage = new Storage();
const bucket = storage.bucket(process.env.GCS_BUCKET_NAME);

// Stream a remote URL into GCS, returns the public URL
async function uploadFromUrl(sourceUrl, objectPath, contentType) {
  const res = await fetch(sourceUrl);
  if (!res.ok) throw new Error(`Failed to fetch ${sourceUrl}: ${res.status}`);
  const file = bucket.file(objectPath);
  await pipeline(res.body, file.createWriteStream({ resumable: false, contentType }));
  return publicUrl(objectPath);
}

// Upload a Buffer into GCS, returns the public URL
async function uploadBuffer(buffer, objectPath, contentType) {
  const file = bucket.file(objectPath);
  await file.save(buffer, { resumable: false, contentType });
  return publicUrl(objectPath);
}

// Upload a local file path into GCS, returns the public URL
async function uploadLocalFile(localPath, objectPath, contentType) {
  const file = bucket.file(objectPath);
  const data = fs.readFileSync(localPath);
  await file.save(data, { resumable: false, contentType });
  return publicUrl(objectPath);
}

// Generate a signed URL for browser-to-GCS PUT upload (replaces api_sign_request)
async function generateSignedUploadUrl(objectPath, contentType, expiresMs = 15 * 60 * 1000) {
  const [url] = await bucket.file(objectPath).getSignedUrl({
    version: 'v4',
    action: 'write',
    expires: Date.now() + expiresMs,
    contentType,
  });
  return url;
}

// Delete an object, ignoring 404 (replaces cloudinary.uploader.destroy)
async function deleteObject(objectPath) {
  await bucket.file(objectPath).delete({ ignoreNotFound: true });
}

// Generate a signed read URL for private-ish assets (replaces lib/cloudinary.js generateSignedUrl)
// The bucket is public, but this URL is short-lived so it can't be cached or scraped easily
async function generateSignedReadUrl(objectPath, expiresMs = 60 * 60 * 1000) {
  const [url] = await bucket.file(objectPath).getSignedUrl({
    version: 'v4',
    action: 'read',
    expires: Date.now() + expiresMs,
  });
  return url;
}

function publicUrl(objectPath) {
  return `${process.env.GCS_PUBLIC_BASE_URL}/${objectPath}`;
}

module.exports = {
  storage,
  bucket,
  uploadFromUrl,
  uploadBuffer,
  uploadLocalFile,
  generateSignedUploadUrl,
  deleteObject,
  generateSignedReadUrl,
  publicUrl,
};
