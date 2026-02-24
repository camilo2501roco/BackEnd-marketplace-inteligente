import { GoogleGenerativeAI } from "@google/generative-ai";

let apiKeys = [];

let currentIndex = 0;

const getNextKey = () => {
  const key = apiKeys[currentIndex];
  currentIndex = (currentIndex + 1) % apiKeys.length;
  return key;
};

export const getGeminiModel = () => {
  if (!process.env.GEMINI_API_KEYS) {
    throw new Error("GEMINI_API_KEYS no está configurado en el .env");
  }

  if (apiKeys.length === 0) {
    apiKeys = process.env.GEMINI_API_KEYS.split(",").map((key) => key.trim());
  }

  const genAI = new GoogleGenerativeAI(getNextKey());
  return genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
};
