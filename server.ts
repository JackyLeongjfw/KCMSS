import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      mode: process.env.NODE_ENV, 
      nodeVersion: process.version
    });
  });

  // AI Analysis Endpoint
  app.post("/api/analyze", async (req, res) => {
    const { content } = req.body;
    
    if (!content || content.length < 10) {
      return res.status(400).json({ error: "Content is too short or missing" });
    }

    const apiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "").trim();
    
    if (!apiKey) {
      return res.status(500).json({ error: "GEMINI_API_KEY is missing on server. Please set it in environment secrets." });
    }

    try {
      const ai = new GoogleGenAI(apiKey);
      const model = ai.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        generationConfig: {
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

      const prompt = `
        You are an expert English-Chinese bilingual teacher.
        Task: Analyze this English essay for a Hong Kong DSE student.
        Essay: "${content}"
        
        Requirements:
        1. "sentencePairs": Break the essay into sentences. For each, provide the "original" English and a polished "translation" in Traditional Chinese.
        2. "suggestions": Extract 5-8 useful vocabulary items (words/idioms). For each provide: "word", "pos" (part of speech), "meaning" (Traditional Chinese), and "example" (English sentence).
        
        Return ONLY valid JSON.
      `;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      
      res.json(JSON.parse(text));
    } catch (error: unknown) {
      console.error("Gemini server error:", error);
      const details = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: "AI Analysis failed", details });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
