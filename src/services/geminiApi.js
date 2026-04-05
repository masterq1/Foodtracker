import AsyncStorage from '@react-native-async-storage/async-storage';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const PRIMARY_MODEL = 'gemini-2.5-flash';
const FALLBACK_MODEL = 'gemini-3.1-flash-lite';
const DAILY_LIMIT = 20;
const USAGE_KEY = 'gemini_primary_usage';

const PROMPT = `You are a professional nutritionist. Analyze this food image carefully and respond ONLY with a valid JSON object — no markdown, no explanation, no other text:

{
  "foodName": "descriptive name of the dish",
  "ingredients": [
    { "name": "ingredient name", "amount": "estimated portion e.g. 150g, 2 slices" }
  ],
  "totalCalories": <integer>,
  "totalWeightGrams": <integer>,
  "proteinGrams": <integer>,
  "carbsGrams": <integer>,
  "fatGrams": <integer>,
  "confidence": "high" | "medium" | "low",
  "notes": "brief note about estimation accuracy"
}

Guidelines:
- Be realistic and accurate with all estimates
- If multiple items are visible, include all and sum the totals
- Ensure protein + carbs + fat macros are consistent with the calorie total (roughly: protein*4 + carbs*4 + fat*9 ≈ calories)
- Set confidence to "low" if the image is unclear`;

export const PRIMARY_MODEL_LABEL = 'Gemini 2.5 Flash';
export const FALLBACK_MODEL_LABEL = 'Gemini 3.1 Flash Lite';
export { DAILY_LIMIT };

export async function getUsageInfo() {
  const usage = await getTodayUsage();
  const usePrimary = usage.count < DAILY_LIMIT;
  return {
    model: usePrimary ? PRIMARY_MODEL_LABEL : FALLBACK_MODEL_LABEL,
    used: usage.count,
    remaining: usePrimary ? DAILY_LIMIT - usage.count : 0,
    usingPrimary: usePrimary,
  };
}

async function getTodayUsage() {
  try {
    const raw = await AsyncStorage.getItem(USAGE_KEY);
    const data = raw ? JSON.parse(raw) : null;
    const today = new Date().toISOString().slice(0, 10);
    if (!data || data.date !== today) return { date: today, count: 0 };
    return data;
  } catch {
    return { date: new Date().toISOString().slice(0, 10), count: 0 };
  }
}

async function incrementUsage(usage) {
  try {
    await AsyncStorage.setItem(USAGE_KEY, JSON.stringify({ ...usage, count: usage.count + 1 }));
  } catch {
    // non-critical
  }
}

async function callModel(model, base64Image, apiKey) {
  const url = `${GEMINI_BASE}/${model}:generateContent?key=${apiKey.trim()}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
            { text: PROMPT },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 4096,
      },
    }),
  });

  if (!response.ok) {
    let msg = `API error (${response.status})`;
    try {
      const err = await response.json();
      msg = err.error?.message || msg;
    } catch {
      // ignore parse error
    }
    if (response.status === 403) msg = `Access denied: ${msg}`;
    const err = new Error(msg);
    err.status = response.status;
    throw err;
  }

  const data = await response.json();
  const parts = data.candidates?.[0]?.content?.parts || [];
  // Filter out "thought" parts — Gemini 2.5 Flash emits thinking tokens before the answer
  const text = parts
    .filter((p) => !p.thought)
    .map((p) => p.text || '')
    .join('')
    .trim();

  if (!text) throw new Error('Empty response from Gemini API');

  const stripped = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  const jsonMatch = stripped.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Could not parse food analysis from Gemini response');

  const result = JSON.parse(jsonMatch[0].trim());
  result.totalCalories = Math.round(Number(result.totalCalories) || 0);
  result.totalWeightGrams = Math.round(Number(result.totalWeightGrams) || 0);
  result.proteinGrams = Math.round(Number(result.proteinGrams) || 0);
  result.carbsGrams = Math.round(Number(result.carbsGrams) || 0);
  result.fatGrams = Math.round(Number(result.fatGrams) || 0);
  return result;
}

export async function analyzeFoodImage(base64Image, apiKey) {
  if (!apiKey?.trim()) {
    throw new Error('Google AI API key not configured. Please add your key in Settings.');
  }

  const usage = await getTodayUsage();
  const usePrimary = usage.count < DAILY_LIMIT;
  const model = usePrimary ? PRIMARY_MODEL : FALLBACK_MODEL;

  try {
    const result = await callModel(model, base64Image, apiKey);
    if (usePrimary) await incrementUsage(usage);
    result._modelUsed = model;
    return result;
  } catch (err) {
    // If primary hits a 429, fall back to the fallback model automatically
    if (usePrimary && err.status === 429) {
      const result = await callModel(FALLBACK_MODEL, base64Image, apiKey);
      result._modelUsed = FALLBACK_MODEL;
      return result;
    }
    throw err;
  }
}
