/* eslint-disable no-console */
/**
 * Google Cloud Video Intelligence Service
 * 
 * Analyzes video content to extract meaningful context including:
 * - Labels (objects, actions, scenes)
 * - Shot changes
 * - Explicit content detection
 * - Text detection in video
 * 
 * Uses this to generate contextual captions for videos without readable text.
 */

const video = require('@google-cloud/video-intelligence').v1;
const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Initialize Video Intelligence client
const videoClient = new video.VideoIntelligenceServiceClient();

/**
 * Analyze video from URL using Google Video Intelligence
 * @param {string} videoUrl - Public URL of the video (will be downloaded and encoded)
 * @returns {Promise<Object>} Analysis results with labels, shots, and text
 */
async function analyzeVideoContent(videoUrl) {
  try {
    console.log('[VideoIntelligence] Analyzing video:', videoUrl);

    // Download video and convert to base64
    // Video Intelligence API requires either GCS URI or base64 content
    console.log('[VideoIntelligence] Downloading video...');
    const https = require('https');
    const http = require('http');
    
    const videoBuffer = await new Promise((resolve, reject) => {
      const lib = videoUrl.startsWith('https') ? https : http;
      lib.get(videoUrl, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download video: ${response.statusCode}`));
          return;
        }
        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => resolve(Buffer.concat(chunks)));
      }).on('error', reject);
    });

    console.log('[VideoIntelligence] Video downloaded, size:', (videoBuffer.length / 1024 / 1024).toFixed(2), 'MB');
    
    // Convert to base64
    const base64Video = videoBuffer.toString('base64');

    // Configure what features to detect
    const request = {
      inputContent: base64Video,  // Use base64 content instead of URI
      features: [
        'LABEL_DETECTION',           // Detect objects, actions, scenes
        'SHOT_CHANGE_DETECTION',     // Detect scene changes
        'TEXT_DETECTION',            // Detect any text in video
      ],
      videoContext: {
        labelDetectionConfig: {
          labelDetectionMode: 'SHOT_AND_FRAME_MODE',
          stationaryCamera: false,
          model: 'builtin/latest',
        },
      },
    };

    // Start the video analysis operation
    const [operation] = await videoClient.annotateVideo(request);
    console.log('[VideoIntelligence] Processing video...');

    // Wait for the operation to complete
    const [operationResult] = await operation.promise();
    
    // Extract the annotation results
    const annotations = operationResult.annotationResults[0];
    
    // Process shot labels (high-level scene understanding)
    const shotLabels = annotations.shotLabelAnnotations || [];
    const topShotLabels = shotLabels
      .filter(label => label.entity && label.entity.description)
      .slice(0, 10)
      .map(label => ({
        description: label.entity.description,
        confidence: label.segments[0]?.confidence || 0,
      }))
      .sort((a, b) => b.confidence - a.confidence);

    // Process frame labels (detailed object/action detection)
    const frameLabels = annotations.frameLabelAnnotations || [];
    const topFrameLabels = frameLabels
      .filter(label => label.entity && label.entity.description)
      .slice(0, 10)
      .map(label => ({
        description: label.entity.description,
        confidence: label.frames[0]?.confidence || 0,
      }))
      .sort((a, b) => b.confidence - a.confidence);

    // Process text detected in video
    const textAnnotations = annotations.textAnnotations || [];
    const detectedText = textAnnotations
      .map(text => text.text)
      .filter(Boolean)
      .join(' ');

    // Process shot changes (scene transitions)
    const shotChanges = annotations.shotAnnotations || [];
    const numberOfScenes = shotChanges.length;

    console.log('[VideoIntelligence] Analysis complete:');
    console.log('  - Shot labels:', topShotLabels.length);
    console.log('  - Frame labels:', topFrameLabels.length);
    console.log('  - Detected text:', detectedText || 'NONE');
    console.log('  - Number of scenes:', numberOfScenes);

    return {
      shotLabels: topShotLabels,
      frameLabels: topFrameLabels,
      detectedText,
      numberOfScenes,
    };

  } catch (error) {
    console.error('[VideoIntelligence] Analysis failed:', error.message);
    throw error;
  }
}

/**
 * Generate a contextual caption from video analysis results
 * @param {Object} analysisResults - Results from analyzeVideoContent
 * @param {string} userCaption - User-provided caption (optional)
 * @returns {Promise<string>} Generated caption describing the video
 */
async function generateCaptionFromVideoAnalysis(analysisResults, userCaption = '') {
  try {
    const { shotLabels, frameLabels, detectedText, numberOfScenes } = analysisResults;

    // Build context from labels
    const shotContext = shotLabels
      .slice(0, 5)
      .map(l => l.description)
      .join(', ');
    
    const frameContext = frameLabels
      .slice(0, 5)
      .map(l => l.description)
      .join(', ');

    // Create a prompt for GPT-4
    const prompt = `Based on this video analysis, create a short, engaging meme caption (1-2 sentences):

Video contains: ${shotContext}
Detected elements: ${frameContext}
${detectedText ? `Text in video: "${detectedText}"` : 'No text visible in video'}
Number of scenes: ${numberOfScenes}
${userCaption ? `User's caption: "${userCaption}"` : ''}

Create a witty, meme-style caption that captures what's happening in the video. Keep it casual and fun.`;

    console.log('[VideoIntelligence] Generating caption from analysis...');

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { 
          role: 'system', 
          content: 'You create short, punchy, meme-style captions that capture the essence of video content. Be witty and casual.' 
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.8,
      max_tokens: 100,
    });

    const caption = response.choices[0].message.content.trim();
    console.log('[VideoIntelligence] Generated caption:', caption);

    return caption;

  } catch (error) {
    console.error('[VideoIntelligence] Caption generation failed:', error.message);
    return null;
  }
}

/**
 * Get searchable keywords from video analysis
 * @param {Object} analysisResults - Results from analyzeVideoContent
 * @returns {string} Space-separated keywords for search indexing
 */
function extractSearchKeywords(analysisResults) {
  const { shotLabels, frameLabels, detectedText } = analysisResults;
  
  const allLabels = [
    ...shotLabels.map(l => l.description),
    ...frameLabels.map(l => l.description),
  ];
  
  // Remove duplicates and join
  const uniqueLabels = [...new Set(allLabels)];
  const keywords = uniqueLabels.slice(0, 15).join(' ');
  
  // Add detected text if any
  const searchText = detectedText 
    ? `${keywords} ${detectedText}`.trim()
    : keywords;
  
  return searchText;
}

module.exports = {
  analyzeVideoContent,
  generateCaptionFromVideoAnalysis,
  extractSearchKeywords,
};