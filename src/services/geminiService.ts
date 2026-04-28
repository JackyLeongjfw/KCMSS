import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function analyzeEssay(content: string) {
  const prompt = `
    You are an English teacher for Hong Kong secondary school students (DSE level).
    Analyze the following essay:
    "${content}"

    Please provide:
    1. A sentence-by-sentence analysis pairing the original English sentences with their Traditional Chinese translations. Include the whole essay coverage.
    2. A list of 5-8 useful vocabulary words or idioms from the essay (or related to its topic) that the student should learn, with:
       - Word/Phrase
       - Part of speech
       - Chinese meaning
       - Example sentence

    Return the result as a STRICT JSON object with this structure:
    {
      "sentencePairs": [
        { "original": "English sentence", "translation": "Traditional Chinese translation" }
      ],
      "suggestions": [
        { "word": "word", "pos": "noun/verb/adj/etc", "meaning": "Chinese meaning", "example": "English example" }
      ]
    }
    IMPORTANT: Provide exactly 5-8 suggestions. Ensure all original text is covered sentence-by-sentence in "sentencePairs". Only return the JSON object, no other text.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json"
    }
  });

  const text = response.text;
  if (!text) throw new Error("No response from AI");
  
  // Handle case where AI might wrap JSON in markdown code blocks
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  const cleanJson = jsonMatch ? jsonMatch[0] : text;
  
  try {
    return JSON.parse(cleanJson);
  } catch (e) {
    console.error("JSON Parse Error:", e, "Text:", text);
    throw new Error("Invalid AI response format");
  }
}
