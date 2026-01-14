import { GoogleGenAI, Type, VideoGenerationReferenceType } from "@google/genai";
import { SceneConcept, AppConfig, DEFAULT_CONFIG, AppMode } from "../types";

// State to hold current configuration
let currentConfig: AppConfig = { ...DEFAULT_CONFIG };

export const updateServiceConfig = (config: AppConfig) => {
  currentConfig = { ...config };
};

// Helper to get AI instance based on modality
const getAiClient = (modality: 'text' | 'image' | 'video') => {
  let key = process.env.API_KEY; // Fallback to env
  
  // Override with user config if present
  if (modality === 'text' && currentConfig.textKey) key = currentConfig.textKey;
  if (modality === 'image' && currentConfig.imageKey) key = currentConfig.imageKey;
  if (modality === 'video' && currentConfig.videoKey) key = currentConfig.videoKey;

  if (!key) {
    console.warn(`No API Key found for ${modality}, using fallback or potentially failing.`);
  }

  return new GoogleGenAI({ apiKey: key });
};

/**
 * Generates a product description based on the product name.
 */
export const generateProductDescription = async (name: string): Promise<string> => {
  const ai = getAiClient('text');
  const prompt = `
    为这款小家电商品写一段简短、吸引人的产品描述（50字左右）。
    商品名称：${name}
    
    要求：
    1. 突出小家电的便携性、智能化或生活美学。
    2. 语气现代、轻松。
    3. 直接返回描述内容，不要加引号或解释。
  `;

  const response = await ai.models.generateContent({
    model: currentConfig.textModel,
    contents: prompt,
  });

  return response.text || "";
};

/**
 * Generates creative concepts based on AppMode.
 */
export const generateConcepts = async (
  name: string,
  description: string,
  direction: string,
  productImages?: string[], // Array of Base64 strings
  mode: AppMode = 'video'
): Promise<SceneConcept[]> => {
  const ai = getAiClient('text');
  
  // --- PROMPT STRATEGY SELECTOR ---
  let systemContext = "";
  let outputRequirements = "";

  if (mode === 'video') {
      systemContext = `
        You are a viral Short-Video Director (TikTok/Douyin Expert).
        CORE OBJECTIVE: Generate 3 video ad concepts optimized for **MAXIMUM COMPLETION RATE (完播率)**.
        **Visual Style**: Cinematic, dynamic camera movement, high frame rate feel.
      `;
      outputRequirements = `
        **Structure Requirements:**
        1. **HOOK (0-3s)**: Visual shock + Audio Hook.
        2. **RETENTION (3-12s)**: Fast demonstration.
        3. **CONVERSION (12-15s)**: Call To Action.
        
        **Fields:**
        - Script: Natural spoken narration (oral Chinese).
        - Storyboard: **MUST** use camera terms (Pan, Zoom, POV). Describe 4 key keyframes.
      `;
  } else if (mode === 'image') {
      systemContext = `
        You are a Social Media Content Creator (Xiaohongshu/Instagram Expert).
        CORE OBJECTIVE: Generate 3 static image ad sets (Carousel format) optimized for **CLICK-THROUGH RATE (CTR)**.
        **Visual Style**: Lifestyle, soft lighting, "Soft Sell" (种草), authentic, 1:1 square composition.
      `;
      outputRequirements = `
        **Structure Requirements:**
        Generate a concept that consists of 4 distinct images that tell a story or show different angles.
        1. **Image 1**: Eye-catching Main Visual (Flat lay or Context).
        2. **Image 2**: Close-up detail / Texture.
        3. **Image 3**: User interaction / Life scenario.
        4. **Image 4**: Summary / Mood shot.

        **Fields:**
        - Script: This is the **Ad Copy/Caption** (文案) for the social post. Use emojis, hashtags, and engaging tone.
        - Storyboard: Describe the 4 specific images in detail. Format: "图1: [场景]...; 图2: [细节]..."
      `;
  } else if (mode === 'pdp') {
      systemContext = `
        You are an E-commerce Visual Designer (Tmall/Amazon Expert).
        CORE OBJECTIVE: Generate 3 Product Detail Page (PDP) concepts optimized for **CONVERSION RATE (CVR)**.
        **Visual Style**: Clean, high-resolution, commercial photography, informative, trustworthy.
      `;
      outputRequirements = `
        **Structure Requirements:**
        Generate a concept for a Long-Form PDP (Product Detail Page) composed of 4 vertical sections.
        1. **Section 1**: Hero Poster (Headline + Key Benefit).
        2. **Section 2**: Pain Point & Solution.
        3. **Section 3**: Core Feature Deep-dive (Tech/Specs).
        4. **Section 4**: Social Proof / Usage Scenario.

        **Fields:**
        - Script: This is the **Marketing Copy** (营销卖点) displayed on the images.
        - Storyboard: Describe the visual layout of the 4 sections. Format: "板块1: [头图]...; 板块2: [痛点]..."
      `;
  }

  const textPrompt = `
    ${systemContext}
    
    Product Name: ${name}
    Product Description: ${description}
    Creative Direction/Style: "${direction}"
    ${productImages && productImages.length > 0 ? `NOTE: ${productImages.length} product images are provided. Analyze their visual features.` : ""}

    ${outputRequirements}

    Output JSON Format:
    1. Title (Chinese): Catchy title.
    2. Description (Chinese): Concept overview.
    3. Script (Chinese): As defined above.
    4. Storyboard (Chinese): As defined above.
    5. Visual Prompt (English): Detailed keywords for the Main Visual generation (lighting, angle, lens type).
  `;

  let contents: any = textPrompt;

  // If we have images, we switch to multimodal input
  if (productImages && productImages.length > 0) {
      const parts: any[] = [{ text: textPrompt }];
      
      productImages.forEach(img => {
          parts.push({
              inlineData: {
                  mimeType: "image/png", 
                  data: img.replace(/^data:image\/(png|jpeg|jpg);base64,/, "")
              }
          });
      });
      
      contents = { parts };
  }

  const response = await ai.models.generateContent({
    model: currentConfig.textModel,
    contents: contents,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            script: { type: Type.STRING },
            storyboard: { type: Type.STRING },
            visualPrompt: { type: Type.STRING },
          },
          required: ["title", "description", "script", "storyboard", "visualPrompt"],
        },
      },
    },
  });

  const text = response.text;
  if (!text) throw new Error("No concepts generated");
  return JSON.parse(text) as SceneConcept[];
};

/**
 * Generates an image based on a prompt.
 * Supports multiple reference product images for consistency.
 */
export const generateSceneImage = async (
    prompt: string, 
    referenceProductImages?: string[],
    aspectRatio: string = "16:9" // Added aspectRatio parameter
): Promise<string> => {
  const ai = getAiClient('image');
  const model = currentConfig.imageModel;
  
  const isFlash = model.includes('flash');
  
  const config: any = {
    imageConfig: {
      aspectRatio: aspectRatio,
    }
  };

  if (!isFlash) {
    config.imageConfig.imageSize = "1K";
  }

  let contents: any = prompt;

  if (referenceProductImages && referenceProductImages.length > 0) {
      const parts: any[] = [];
      
      // Add all reference images
      referenceProductImages.forEach(img => {
           parts.push({
              inlineData: {
                  mimeType: "image/png",
                  data: img.replace(/^data:image\/(png|jpeg|jpg);base64,/, "")
              }
          });
      });

      // Add the text prompt
      parts.push({ text: `Generate a high-quality scene featuring the product shown in the images above. Maintain the product's visual identity. Context: ${prompt}` });
      
      contents = { parts };
  }

  const response = await ai.models.generateContent({
    model: model,
    contents: contents,
    config: config,
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("No image generated");
};

/**
 * Edits an existing image.
 */
export const editSceneImage = async (
  baseImage: string,
  instruction: string,
  referenceProductImage?: string,
  aspectRatio: string = "16:9" // Added aspectRatio parameter
): Promise<string> => {
  const ai = getAiClient('image');
  const model = currentConfig.imageModel;
  
  const isFlash = model.includes('flash');
  
  const parts: any[] = [];

  // 1. Base Image to edit
  parts.push({
    inlineData: {
      mimeType: "image/png",
      data: baseImage.replace(/^data:image\/(png|jpeg|jpg);base64,/, ""),
    },
  });

  // 2. Optional: Reference Product Image
  if (referenceProductImage) {
     parts.push({
      inlineData: {
        mimeType: "image/png", 
        data: referenceProductImage.replace(/^data:image\/(png|jpeg|jpg);base64,/, ""),
      },
    });
    // Stronger prompt to enforce identity
    parts.push({ text: "Reference product image provided above. You MUST maintain the product's visual identity details (logo, color, shape) strictly while applying the edit." });
  }

  // 3. Instruction
  parts.push({ text: `Edit the first image provided. Instruction: ${instruction}` });

  const config: any = {
    imageConfig: {
      aspectRatio: aspectRatio, // Respect ratio during edit if supported (mainly for regen)
    }
  };

  if (!isFlash) {
    config.imageConfig.imageSize = "1K";
  }

  const response = await ai.models.generateContent({
    model: model,
    contents: { parts },
    config: config,
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("Image editing failed");
};

/**
 * Generates storyboard shots based on the specific storyboard script.
 */
export const generateStoryboardShots = async (
  baseImage: string,
  storyboardScript: string,
  referenceProductImages?: string[],
  mode: AppMode = 'video',
  aspectRatio: string = "16:9"
): Promise<{ label: string; base64: string; instruction: string }[]> => {
  
  // 1. Parse the storyboard script using Gemini Text
  const ai = getAiClient('text');
  
  let roleContext = "";
  if (mode === 'video') {
      roleContext = "You are a Storyboard Artist for Video Ads. Extract 4 cinematic shots (POV, Close-up, Wide, etc.).";
  } else if (mode === 'image') {
      roleContext = "You are a Social Media Photographer. Extract 4 distinct photo concepts (Flat lay, Context, Detail, etc.).";
  } else {
      roleContext = "You are an E-commerce Designer. Extract 4 layout sections for a PDP (Header, Pain Point, Feature, Usage).";
  }

  const parsePrompt = `
    ${roleContext}
    
    Input Script/Description: "${storyboardScript}"
    
    Extract exactly 4 key visuals. 
    **CRITICAL**: The 'instruction' must use correct visual terminology for the medium.
    
    For each visual provide:
    1. "label": Short Chinese title.
    2. "instruction": Precise English instruction for the AI image editor to generate this specific visual.
    
    Return a JSON array with 4 items.
  `;

  let shotsConfig: { label: string; instruction: string }[] = [];

  try {
      const response = await ai.models.generateContent({
        model: currentConfig.textModel,
        contents: parsePrompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        label: { type: Type.STRING },
                        instruction: { type: Type.STRING }
                    },
                    required: ["label", "instruction"]
                }
            }
        }
      });
      
      if (response.text) {
          shotsConfig = JSON.parse(response.text);
      }
  } catch (e) {
      console.warn("Failed to parse storyboard script, falling back to defaults.", e);
  }

  // Fallback if parsing failed or returned empty
  if (shotsConfig.length === 0) {
      shotsConfig = [
        { label: "视觉 1", instruction: "Main hero shot, high quality, commercial lighting." },
        { label: "视觉 2", instruction: "Detail shot, close up, texture focus." },
        { label: "视觉 3", instruction: "Context usage shot, lifestyle vibe." },
        { label: "视觉 4", instruction: "Creative composition, artistic angle." }
      ];
  }

  // Pick the primary product image for reference if available
  const referenceImage = referenceProductImages && referenceProductImages.length > 0 
      ? referenceProductImages[0] 
      : undefined;

  // 2. Generate images for each shot
  const promises = shotsConfig.map(async (shot) => {
    try {
      // We use editSceneImage to maintain consistency with the base image style
      // Pass mode-specific aspect ratio if needed, or inherit
      const result = await editSceneImage(baseImage, shot.instruction, referenceImage, aspectRatio);
      return { label: shot.label, base64: result, instruction: shot.instruction };
    } catch (e) {
      console.error(`Failed to generate shot ${shot.label}`, e);
      return null;
    }
  });

  const results = await Promise.all(promises);
  return results.filter((r) => r !== null) as { label: string; base64: string; instruction: string }[];
};

/**
 * Generates a video using Veo with Multi-Image Support.
 */
export const generateStoryVideo = async (
  script: string,
  referenceImages: string[] // Base64 strings
): Promise<string> => {
  let key = currentConfig.videoKey || process.env.API_KEY;
  if (!key) {
      // Logic assumes key is validated in UI
  }
  
  const ai = new GoogleGenAI({ apiKey: key });
  
  const refsToUse = referenceImages.slice(0, 3);
  const referenceImagesPayload: any[] = [];
  
  for (const img of refsToUse) {
      referenceImagesPayload.push({
          image: {
              imageBytes: img.replace(/^data:image\/(png|jpeg|jpg);base64,/, ""),
              mimeType: 'image/png',
          },
          referenceType: VideoGenerationReferenceType.ASSET,
      });
  }

  // NOTE: For multi-image reference, we MUST use 'veo-3.1-generate-preview'
  const model = 'veo-3.1-generate-preview'; 

  let operation = await ai.models.generateVideos({
    model: model,
    prompt: `Cinematic video ad. Narration/Context: "${script}". Style: High quality, coherent transition.`,
    config: {
      numberOfVideos: 1,
      referenceImages: referenceImagesPayload.length > 0 ? referenceImagesPayload : undefined,
      resolution: '720p',
      aspectRatio: '16:9' // Veo mainly supports landscape for generation currently, need to verify if portrait works with this model. Confirmed 9:16 is supported in Veo.
    }
  });

  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 8000));
    operation = await ai.operations.getVideosOperation({operation: operation});
  }

  const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!videoUri) throw new Error("Video generation failed");

  return videoUri;
};

// Legacy single image function
export const generateVideoContent = async (
  image: string,
  prompt: string
): Promise<string> => {
   return generateStoryVideo(prompt, [image]);
};

export const fetchVideoUrl = async (uri: string): Promise<string> => {
    let key = currentConfig.videoKey || process.env.API_KEY;
    const response = await fetch(`${uri}&key=${key}`);
    const blob = await response.blob();
    return URL.createObjectURL(blob);
}