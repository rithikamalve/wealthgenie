/**
 * Groq API Configuration
 *
 * IMPORTANT: Add your Groq API key below
 * Get your API key from: https://console.groq.com
 *
 * 🔑 Steps to configure:
 * 1. Go to https://console.groq.com
 * 2. Sign up/login and create an API key
 * 3. Replace 'YOUR_GROQ_API_KEY_HERE' below with your actual key
 * 4. Save this file
 *
 * Example:
 * export const groqApiKey = "gsk_abc123xyz456..."
 */

export const groqApiKey = import.meta.env.GROQ_API_KEY;

// Model configuration
export const groqModel = "llama-3.3-70b-versatile";
export const groqApiUrl = "https://api.groq.com/openai/v1/chat/completions";