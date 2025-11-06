// server/utils/stage1Analyzer.js
const axios = require("axios");
const OpenAI = require("openai");
require("dotenv").config();

const HF_TOKEN = process.env.HF_TOKEN;
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Step 1: use HuggingFace model to recgnoize emotion_label
 */
async function analyzeEmotion(text) {
  const url =
    "https://router.huggingface.co/hf-inference/models/j-hartmann/emotion-english-distilroberta-base";

  const res = await axios.post(
    url,
    { inputs: text },
    { headers: { Authorization: `Bearer ${HF_TOKEN}` } }
  );

  const top = res.data[0][0]; // 返回二维数组
  return {
    emotion_label: top.label.toLowerCase(),
    emotion_confidence: top.score,
  };
}

/**
 * Step 2: self identify arousal_level from emotion
 */
function estimateArousal(emotion) {
  const high = ["anger", "fear"];
  const low = ["sadness", "guilt", "shame", "neutral"];
  if (high.includes(emotion)) return "high";
  if (low.includes(emotion)) return "low";
  return "medium";
}

/**
 * Step 3: use GPT reason disclosure_level / distress_score / help_intent
 */
async function analyzeDisclosure(text) {
  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are a psychologist analyzing text for emotional disclosure. Return JSON with disclosure_level (surface/mid/deep), distress_score (0-1 float), and help_intent (true/false).",
      },
      { role: "user", content: text },
    ],
  });

  try {
    return JSON.parse(res.choices[0].message.content);
  } catch (err) {
    console.error("❌ JSON parse error in analyzeDisclosure:", err);
    return {
      disclosure_level: "unknown",
      distress_score: 0.0,
      help_intent: false,
    };
  }
}

/**
 * Step 4: gather results (Stage 1)
 */
async function analyzeStage1(text) {
  try {
    const emo = await analyzeEmotion(text);
    const arousal = estimateArousal(emo.emotion_label);
    const disc = await analyzeDisclosure(text);

    const result = {
      emotion_label: emo.emotion_label,
      arousal_level: arousal,
      disclosure_level: disc.disclosure_level,
      distress_score: disc.distress_score,
      help_intent: disc.help_intent,
    };

    console.log("✅ Stage1 analysis:", result);
    return result;
  } catch (err) {
    console.error("❌ Stage1 error:", err.message);
    throw err;
  }
}

module.exports = { analyzeStage1 };
