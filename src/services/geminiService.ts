import { GoogleGenAI, Type } from "@google/genai";

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// ⭐ 全域控制（重點）
let lastCallTime = 0;
let queue: Promise<any> = Promise.resolve();

const MIN_INTERVAL = 1500; // 1.5 秒（AI Studio 建議）

async function rateLimit() {
  const now = Date.now();
  const diff = now - lastCallTime;

  if (diff < MIN_INTERVAL) {
    await sleep(MIN_INTERVAL - diff);
  }

  lastCallTime = Date.now();
}

// ⭐ retry（保留你原本邏輯但強化）
async function generateWithRetry(ai: GoogleGenAI, payload: any) {
  for (let i = 0; i < 5; i++) {
    try {
      await rateLimit(); // ⭐ 每次 request 前都限速

      const result = await ai.models.generateContent(payload);
      return result;

    } catch (error: any) {
      const is429 =
        error?.status === 429 ||
        error?.message?.includes("429") ||
        error?.message?.includes("TooManyRequests");

      if (!is429) throw error;

      const delay = Math.pow(2, i) * 1000;
      console.warn(`429 detected, retry in ${delay} ms`);
      await sleep(delay);
    }
  }

  throw new Error("Too many retries (429)");
}

// ⭐ Queue（關鍵：避免同時多個 request）
function enqueue(task: () => Promise<any>) {
  queue = queue.then(task).catch(() => {});
  return queue;
}

// ⭐ 主 function
export function analyzeEssay(content: string) {
  return enqueue(async () => {
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
2. "suggestions": Extract 3-5 useful vocabulary items.

Return ONLY valid JSON.
`;

    const result = await generateWithRetry(ai, {
      model: "gemini-1.5-flash", // ⭐ 建議不要用 preview
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
  });
}
