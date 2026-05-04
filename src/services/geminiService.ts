import { GoogleGenAI, Type } from "@google/genai";

export async function analyzeEssay(content: string) {
  const apiKey = (process.env.GEMINI_API_KEY || "").trim();
  
  if (!apiKey || apiKey === "undefined" || apiKey.includes("INSERT_YOUR_KEY")) {
    console.error("AI API Key is missing. Value:", apiKey);
    throw new Error("AI API Key is missing. Please set GEMINI_API_KEY in the environment.");
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
      You are an expert English-Chinese bilingual teacher.
      Task: Analyze this English essay for a Hong Kong DSE student.
      Essay: "${content}"
      
      Requirements:
      1. "sentencePairs": Break the essay into sentences. For each, provide the "original" English and a polished "translation" in Traditional Chinese.
      2. "suggestions": Extract 5-8 useful vocabulary items (words/idioms). For each provide: "word", "pos" (part of speech), "meaning" (Traditional Chinese), and "example" (English sentence).
      
      Return ONLY valid JSON.
    `;

    const result = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
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

    const text = result.text;
    if (!text) throw new Error("AI returned no results");
    return JSON.parse(text);
  } catch (error: any) {
    console.error("AI Analysis Error:", error);
    throw error;
  }
}
