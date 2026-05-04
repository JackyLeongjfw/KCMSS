import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function analyzeEssay(content: string) {
  const prompt = `
    You are an English teacher for Hong Kong secondary school students (DSE level).
    Analyze the following essay:
    "${content}"

    Please provide:
    1. A sentence-by-sentence analysis pairing the original English sentences with their Traditional Chinese translations. Include the whole essay coverage.
    2. A list of 5-8 useful vocabulary words or idioms from the essay (or related to its topic) that the student should learn, with their part of speech, Chinese meaning, and an example sentence.

    IMPORTANT: Ensure all original text is covered sentence-by-sentence in "sentencePairs". Use JSON format.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
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

  const text = response.text;
  if (!text) throw new Error("No response from AI");
  
  return JSON.parse(text);
}
