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

    IMPORTANT: Ensure all original text is covered sentence-by-sentence in "sentencePairs".
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
  
  try {
    // Attempt to parse the text directly
    return JSON.parse(text);
  } catch (e) {
    console.warn("Direct JSON parse failed, trying robust extraction", e);
    // Robust extraction: find the first { and the last }
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const potentialJson = text.substring(firstBrace, lastBrace + 1);
      try {
        // If there's an extra bracket at the end, lastIndexOf('}') might catch it.
        // We can try to progressively trim from the end until it parses or fails.
        let currentJson = potentialJson;
        while (currentJson.length > 0) {
          try {
            return JSON.parse(currentJson);
          } catch (innerError) {
            const nextLastBrace = currentJson.lastIndexOf('}', currentJson.length - 2);
            if (nextLastBrace === -1) break;
            currentJson = currentJson.substring(0, nextLastBrace + 1);
          }
        }
      } catch (finalError) {
        console.error("Robust extraction failed:", finalError);
      }
    }
    console.error("Final JSON Parse Error. Text:", text);
    throw new Error("Invalid AI response format");
  }
}
