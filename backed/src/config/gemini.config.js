import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY || '';
if (!apiKey) {
  console.warn('[Gemini AI] Warning: GEMINI_API_KEY is not set in environment variables');
}

export const genAI = new GoogleGenerativeAI(apiKey);
export const defaultModelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
