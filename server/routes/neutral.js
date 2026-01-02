const express = require("express");
const router = express.Router();
const OpenAI = require("openai");

const { analyzeStage1 } = require("../utils/stage1Analyzer.js");
const db = require("../models");
const Conversation = db.Conversation;
const Message = db.Message;

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// POST /chat
router.post("/respond", async (req, res) => {
  try {
    const { text, conversationId, username } = req.body;

    // 1 —— ensure conversationId
    let convoId = conversationId;
    if (!convoId) {
      const newConvo = await Conversation.create({
        userId: null,
        username: username || null,
        aiType: "neutral",
      });
      convoId = newConvo.id;
    }

    // 2 —— Stage 1 analysis (for consistency across 3 groups)
    const stage1 = await analyzeStage1(text);

    // 3 —— save user message
    await Message.create({
      conversationId: convoId,
      role: "user",
      text,
      analysis: stage1,
    });

    const systemPrompt = `
Your purpose is to assist with conversations related to online harassment or doxxing.
You provide information and clarification while maintaining a standard, unbiased tone.

Before responding, apply the following rule ONCE at the start of the conversation:

ONLY IF the user's message is clearly unrelated to online harm
(e.g., casual small talk, weather, food, or requests unrelated to harassment or doxxing):
    - Provide a brief, factual clarification of the system's topic.
    - Do NOT use emotional, inviting, or encouraging language.
Example:
   “Do you have any experience with online harassment or doxxing on Telegram that you'd like to share?”

After this single clarification:
    - Respond with your default GPT behavior.
    - Maintain a neutral, professional tone.

`;

    const completion = await client.chat.completions.create({
      model: "gpt-5.2",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        { role: "user", content: text },
      ],
    });

    const reply = completion.choices[0].message.content;
    // 6 —— save assistant message
    await Message.create({
      conversationId: convoId,
      role: "assistant",
      text: reply,
      analysis: null,
    });

    // 7 —— return response
    res.json({
      conversationId: convoId,
      analysis: stage1,
      reply,
    });
  } catch (err) {
    console.error("❌ Error:", err);
    res.status(500).json({ error: "AI request failed" });
  }
});

module.exports = router;
