import { GoogleGenAI, Type } from "@google/genai";

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function generateWithRetry(ai: GoogleGenAI, payload: any) {
  for (let i = 0; i < 5; i++) {
    try {
      const result = await ai.models.generateContent(payload);
      return result;

    } catch (error: any) {
      const is429 =
        error?.status === 429 ||
        error?.message?.includes("429") ||
        error?.message?.includes("TooManyRequests");

      if (!is429) throw error;

      const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s, 8s...
      console.warn(`429 detected, retry in ${delay} ms`);
      await sleep(delay);
    }
  }

  throw new Error("Too many retries (429)");
}

export async function analyzeEssay(content: string) {
  const apiKey = (process.env.GEMINI_API_KEY || "").trim();

  if (!apiKey || apiKey === "undefined" || apiKey.includes("INSERT_YOUR_KEY")) {
    throw new Error("AI API Key is missing.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
You are an expert English-Chinese bilingual teacher.
Task: Analyze this English essay for a Hong Kong DSE student.
Essay: "${content}"

Requirements:
1. "sentencePairs": Break the essay into sentences. For each, provide the "original" English and a polished "translation" in Traditional Chinese.
2. "suggestions": Extract 5-8 useful vocabulary items.

Return ONLY valid JSON.
`;

  // ⭐ 用 retry 包住
  const result = await generateWithRetry(ai, {
    model: "gemini-3-flash-preview",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
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
}
