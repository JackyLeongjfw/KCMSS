import { GoogleGenAI, Type } from "@google/genai";

export async function analyzeEssay(content: string) {
  const key = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "").trim();

  if (!key) {
    throw new Error("GEMINI_API_KEY is missing. Please ensure it is set in environment secrets.");
  }

  const ai = new GoogleGenAI({ apiKey: key });

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `
      You are an expert English-Chinese bilingual teacher.
      Task: Analyze this English essay for a Hong Kong DSE student.
      Essay: "${content}"
      
      Requirements:
      1. "sentencePairs": Break the essay into sentences. For each, provide the "original" English and a polished "translation" in Traditional Chinese.
      2. "suggestions": Extract 5-8 useful vocabulary items (words/idioms). For each provide: "word", "pos" (part of speech), "meaning" (Traditional Chinese), and "example" (English sentence).
      
      Return ONLY valid JSON.
    `,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          sentencePairs: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                original: { type: Type.STRING },
                translation: { type: Type.STRING }
              },
              required: ["original", "translation"]
            }
          },
          suggestions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                word: { type: Type.STRING },
                pos: { type: Type.STRING },
                meaning: { type: Type.STRING },
                example: { type: Type.STRING }
              },
              required: ["word", "pos", "meaning", "example"]
            }
          }
        },
        required: ["sentencePairs", "suggestions"]
      }
    }
  });

  if (!response.text) {
    throw new Error("Gemini returned empty text response");
  }

  return JSON.parse(response.text);
}
