const express = require("express");
const router = express.Router();
const OpenAI = require("openai");

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// POST /chat
router.post("/", async (req, res) => {
  const { message } = req.body;

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: message }],
    });

    const reply = completion.choices[0].message.content;

    // 简单随机情绪（后面我们会换成情绪识别逻辑）
    const moods = ["neutral", "happy", "sad", "caring"];
    const mood = moods[Math.floor(Math.random() * moods.length)];

    res.json({ reply, mood });
  } catch (err) {
    console.error("❌ Error:", err);
    res.status(500).json({ error: "AI request failed" });
  }
});

module.exports = router;
