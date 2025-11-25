
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { BookConfig, PageType } from '../types';

const API_KEY = process.env.API_KEY ? process.env.API_KEY.trim() : "";
const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

if (!API_KEY) {
    console.warn("⚠️ ADVERTENCIA: No se detectó 'API_KEY'. La generación fallará.");
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Generates a detailed prompt for a page using Gemini Flash (Text).
 */
export const generatePagePrompt = async (
  config: BookConfig, 
  pageNumber: number,
  total: number
): Promise<string> => {
  if (!ai) {
    throw new Error("API Key faltante. Configura la variable 'API_KEY' en Vercel.");
  }

  const isCover = pageNumber === 0;
  const isBack = pageNumber === total + 1;

  let systemPrompt = `You are an expert creative director for coloring books. 
  Topic: "${config.topic}". Style: ${config.artStyle}.`;

  let userPrompt = "";

  if (isCover) {
    userPrompt = `Describe a visually striking, best-selling coloring book cover art for "${config.title}".
    Theme: ${config.artStyle}.
    Must be fully colored, cute, and eye-catching. Output visual description only.`;
  } else if (isBack) {
    userPrompt = `Describe a visual pattern or theme for a professional coloring book back cover about "${config.topic}". Output visual description only.`;
  } else {
    // Logic for Interior Pages based on StyleMode and ArtStyle
    const styleKeyword = config.artStyle.toUpperCase();
    
    if (config.styleMode === 'classic') {
        userPrompt = `Describe a SINGLE character (e.g., one animal/object) for page ${pageNumber}. 
        Style: ${styleKeyword}.
        NO background. NO scenery. Just the character doing a simple pose.
        Keep it extremely simple. Max 15 words.`;
    } else {
        userPrompt = `Describe a SINGLE, unique coloring page scene for page ${pageNumber}.
        Style: ${styleKeyword}.
        Focus on ONE main subject in the center. 
        Limit background elements to ensure clarity.
        Max 20 words. Visual description only.`;
    }
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7,
      }
    });

    return response.text || `${config.topic} scene`;
  } catch (error) {
    console.error("Text generation failed:", error);
    return `${config.topic} cute coloring scene`;
  }
};

/**
 * Generates the actual image using Gemini Flash Image.
 * Handles Complexity, Frames, and Classic Mode.
 */
export const generateImage = async (
  prompt: string, 
  type: PageType, 
  config: BookConfig // Pass full config to access new settings
): Promise<string> => {
  if (!ai) {
    throw new Error("CRITICAL: API Key is missing.");
  }

  const model = 'gemini-2.5-flash-image';
  
  // Construct the specialized prompt
  const constructPrompt = (safeMode: boolean = false) => {
    let fullPrompt = "";
    
    // Define Art Style Specific Rules
    let styleRules = "";
    switch(config.artStyle) {
        case 'kawaii':
            styleRules = "AESTHETIC: KAWAII, CUTE, ROUNDED SHAPES, SWEET EXPRESSIONS, ADORABLE.";
            break;
        case 'mandala':
            styleRules = "AESTHETIC: MANDALA, ZENTANGLE, RADIAL SYMMETRY, GEOMETRIC PATTERNS, FLORAL MOTIFS, RELAXING.";
            break;
        case 'spooky':
            styleRules = "AESTHETIC: HALLOWEEN, SPOOKY, CUTE GHOSTS, PUMPKINS, BATS, WITCHY, FUN SCARY.";
            break;
        case 'fantasy':
            styleRules = "AESTHETIC: FANTASY, PRINCESS, CASTLES, MAGICAL, FAIRY TALE, ELEGANT.";
            break;
        case 'cartoon':
            styleRules = "AESTHETIC: CARTOON, DYNAMIC POSES, COMIC STYLE, EXAGGERATED FEATURES, FUNNY.";
            break;
        case 'pixel':
            styleRules = "AESTHETIC: PIXEL ART STYLE, BLOCKY, RETRO GAME, SQUARE EDGES, 8-BIT VIBE (BUT BLACK LINE ART).";
            break;
        default:
            styleRules = "AESTHETIC: KAWAII, CUTE.";
    }

    if (type === PageType.COVER) {
        fullPrompt = `High-quality coloring book cover art. 
        Title area: "${config.title}". Scene: ${prompt}.
        ${styleRules}
        Style: Vibrant colors, 8k resolution, vector art, commercial bestseller aesthetic.`;
    } else if (type === PageType.BACK_COVER) {
        // PROFESSIONAL COMMERCIAL BACK COVER
        fullPrompt = `Professional Coloring Book Back Cover Design for "${config.title}".
        VIEW: Flat 2D Print file (NOT a 3D book mockup).
        LAYOUT:
        - Clean commercial layout.
        - Features 4 small square preview thumbnails of interior pages arranged neatly in a grid or row.
        - A designated blank rectangular white space for Barcode/ISBN at the bottom right.
        - Placeholder visual blocks representing summary text.
        STYLE:
        - Minimalist, coherent with the cover.
        - ${styleRules}
        - Subtle background pattern related to: ${prompt}.
        - High resolution, 8k, vector style print ready.
        - NO text characters, just layout blocks.`;
    } else {
        // INTERIOR PAGES
        
        // Safety Fallback: Use generic terms if normal prompt failed safety
        const safePrompt = safeMode ? "cute simple shape outline" : prompt;
        const babyText = safeMode ? "SIMPLE THICK OUTLINES" : "BABY/TODDLER LEVEL";

        fullPrompt = `coloring book page, ${safePrompt}. ${styleRules}. `;

        if (config.styleMode === 'baby') {
            fullPrompt += `
            COMPLEXITY: ${babyText}.
            - EXTRA THICK BOLD LINES.
            - VERY SIMPLE SHAPES.
            - MINIMAL DETAILS.
            - LARGE EMPTY SPACES FOR COLORING.
            `;
        } else {
            fullPrompt += `
            COMPLEXITY: STANDARD KDP PROFESSIONAL.
            - Clean, medium-weight continuous black lines.
            - Balanced detail.
            `;
        }

        if (config.styleMode === 'classic') {
            fullPrompt += `
            COMPOSITION:
            - ISOLATED SUBJECT IN CENTER.
            - ABSOLUTELY NO BACKGROUND.
            - NO SCENERY. NO SKY. NO GRASS. NO HORIZON LINE.
            - PURE WHITE VOID SURROUNDING THE SUBJECT.
            `;
        } else {
            fullPrompt += `
            COMPOSITION:
            - Single cohesive scene.
            - Clear separation between foreground and background.
            `;
        }

        if (config.hasFrames) {
            fullPrompt += `
            BORDER:
            - Include a decorative stylistic border/frame around the page content.
            `;
        } else {
            fullPrompt += `
            BORDER:
            - NO BORDERS. NO FRAMES.
            `;
        }

        fullPrompt += `
        STRICT RULES:
        - STRICTLY BLACK AND WHITE LINE ART ONLY.
        - NO TEXT. NO NUMBERS. NO WORDS.
        - NO GRAYSCALE. NO SHADING. NO FILL.
        - DO NOT create multiple panels. ONE SINGLE IMAGE.
        - Pure white background (#FFFFFF).
        `;
    }
    return fullPrompt;
  };

  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    try {
      // Use fallback prompt on last attempt or if specifically retrying due to safety
      const isLastAttempt = attempts === maxAttempts - 1;
      const currentPrompt = constructPrompt(isLastAttempt);

      const response = await ai.models.generateContent({
        model: model,
        contents: currentPrompt,
        config: {
          imageConfig: {
              aspectRatio: config.aspectRatio === '1:1' ? '1:1' : '3:4', 
          },
          safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
          ]
        }
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          const base64String = part.inlineData.data;
          const mimeType = part.inlineData.mimeType || 'image/png';
          return `data:${mimeType};base64,${base64String}`;
        }
      }
      // If we got here, maybe text was returned (refusal)
      console.warn(`Attempt ${attempts + 1}: No image returned. Response might be text refusal.`);
      
    } catch (error: any) {
      console.error(`Attempt ${attempts + 1} Error:`, error);
      
      const errString = String(error);
      
      // Handle Rate Limit (429) - Wait longer
      if (errString.includes('429')) {
        console.log("Rate limit hit. Waiting 10 seconds...");
        await delay(10000); 
      } 
      // Handle Safety Blocks
      else if (errString.includes('Safety') || errString.includes('SAFETY')) {
          console.log("Safety block hit. Retrying with sanitized prompt...");
          // Do not wait long, just retry with the safePrompt logic in next loop
      }
      else {
          await delay(2000);
      }
    }
    attempts++;
  }
  throw new Error("Failed to generate image after retries.");
};
