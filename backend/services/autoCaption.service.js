// services/autoCaption.service.js
const OpenAI = require('openai');
const Tesseract = require('tesseract.js');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Extract visible text from image
async function extractVisibleTextFromImage(buffer) {
  const { data: { text } } = await Tesseract.recognize(buffer, 'eng', {
    logger: m => console.log('[OCR]', m),
  });
  return text.trim().replace(/\s+/g, ' ');
}

/**
 * Generate a caption using GPT-4-Vision from an image buffer
 */
async function generateCaptionFromImage(buffer) {
  try {
    const base64 = buffer.toString('base64');
    const result = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Describe this meme in a short, funny sentence. Use degen crypto Twitter tone.' },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/png;base64,${base64}`,
              },
            },
          ],
        },
      ],
      max_tokens: 100,
    });

    const caption = result?.choices?.[0]?.message?.content?.trim();
    return caption;
  } catch (err) {
    console.error('[generateCaptionFromImage] Failed:', err?.error?.message || err.message);
    return null;
  }
}

module.exports = { generateCaptionFromImage };
