import { BookConfig } from '../types';

// Helper to escape special characters for URL
const encodePrompt = (prompt: string) => encodeURIComponent(prompt);

/**
 * Generates a creative prompt for a specific page based on the general topic.
 * Uses Pollinations Text API (OpenAI compatible).
 */
export const generatePagePrompt = async (
  config: BookConfig, 
  pageNumber: number,
  total: number
): Promise<string> => {
  const isCover = pageNumber === 0;
  const isBack = pageNumber === total + 1;

  let systemPrompt = "You are an expert creative director for children's coloring books.";
  let userPrompt = "";

  if (isCover) {
    userPrompt = `Describe a cute, catchy, bestseller coloring book cover for a book titled "${config.title}" about "${config.topic}". Style: ${config.artStyle}. description only, no introduction.`;
  } else if (isBack) {
    userPrompt = `Describe a minimal, clean back cover for a coloring book about "${config.topic}". description only.`;
  } else {
    userPrompt = `Describe a single, unique, cute scene for page ${pageNumber} of a coloring book about "${config.topic}". 
    Focus on Kawaii and Cottagecore aesthetics. 
    Include specific details like animals, items, or scenery. 
    Keep it simple for coloring. Description only, max 20 words.`;
  }

  try {
    const response = await fetch('https://text.pollinations.ai/openai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai', // Using the default/openai model provided by Pollinations
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
        // Fallback if text API fails
        return `${config.topic} coloring page scene ${pageNumber}`;
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || `${config.topic} scene`;
  } catch (error) {
    console.error("Text generation failed, using fallback", error);
    return `${config.topic} cute scene ${pageNumber}`;
  }
};

/**
 * Generates the actual image URL using Pollinations Image API.
 * We construct the prompt carefully to ensure "Coloring Book" style.
 */
export const generateImageURL = (basePrompt: string, type: 'COVER' | 'INTERIOR' | 'BACK_COVER', seed: number): string => {
  const width = 850; // Approximating 8.5 ratio
  const height = 1100; // Approximating 11 ratio
  const model = 'flux'; // Flux is good for details

  let finalPrompt = "";

  if (type === 'COVER') {
    finalPrompt = `kids coloring book cover, title text "${basePrompt}", vibrant colors, cute, high quality, 8k, vector style, catchy design`;
    // Note: Pollinations might not render text perfectly, but we try. 
    // Usually for covers we prefer the image and overlay text in CSS, but the prompt asks for generated covers.
    // Let's adjust to generate the *art* for the cover.
    finalPrompt = `coloring book cover art, ${basePrompt}, vibrant, full color, cute, bestseller style, high resolution, 8k`;
  } else if (type === 'BACK_COVER') {
    finalPrompt = `coloring book back cover, ${basePrompt}, minimal, small icons pattern, light colors, professional design`;
  } else {
    // CRITICAL: Coloring book interior style prompt engineering
    finalPrompt = `coloring book page, ${basePrompt}, black and white line art, crisp thick black lines, white background, empty background, no shading, no greyscale, low detail, kawaii, cottagecore, cute, vector style, printable`;
  }

  // Construct URL
  // We use a random seed to ensure uniqueness even if prompt is similar
  return `https://image.pollinations.ai/prompt/${encodePrompt(finalPrompt)}?width=${width}&height=${height}&seed=${seed}&model=${model}&nologo=true&enhance=false`;
};