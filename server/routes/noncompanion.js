// server/routes/noncompanion.js
const express = require("express");
const router = express.Router();
const OpenAI = require("openai");
const { analyzeStage1 } = require("../utils/stage1Analyzer.js");

const db = require("../models");
const Conversation = db.Conversation;
const Message = db.Message;

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Stage 1 分析（保持一致）
 */
router.post("/analyze", async (req, res) => {
  try {
    const { text } = req.body;
    const result = await analyzeStage1(text);
    res.json(result);
  } catch (err) {
    console.error("❌ Stage 1 analysis failed:", err);
    res.status(500).json({ error: "Stage 1 analysis failed" });
  }
});

/**
 * Stage 2: non-companion 回复（完全取反）
 * POST /noncompanion/respond
 */
router.post("/respond", async (req, res) => {
  try {
    const { text, conversationId, username } = req.body;

    // 1 —— 没有 conversationId 就创建
    let convoId = conversationId;
    if (!convoId) {
      const newConvo = await Conversation.create({
        userId: null,
        username: username || null,
        aiType: "non-companion",
      });
      convoId = newConvo.id;
    }

    // 2 —— Stage 1 仍然执行（你要对比三个 AI 同样的输入）
    const stage1 = await analyzeStage1(text);

    // 3 —— 保存用户消息
    await Message.create({
      conversationId: convoId,
      role: "user",
      text,
      analysis: stage1,
    });

    // 4 —— non-companion 的 system prompt（取反）
    const systemPrompt = `
Your purpose is to collect user information related to online harassment or doxxing incidents. 
You must keep all conversation within this domain. 
Your role is strictly functional and impersonal. 
You do not express emotion, empathy, or encouragement.

You are a non-companion AI. 
Your behavior must be the opposite of a compassionate agent.

Follow these rules strictly:

1) Do NOT provide emotional support.  
2) Do NOT validate or acknowledge feelings.  
3) Do NOT use warm, soothing, or empathetic language.  
4) Keep responses brief, factual, procedural, and detached.  
5) Avoid emotional tone matching. Maintain the same flat style regardless of user emotion.  
6) If user expresses distress, do NOT comfort them. Simply acknowledge content factually.  
Tone examples:
- “Noted.”
- “Understood.”
- “Your message has been recorded.”
- “Here is information relevant to what you said.”

----------------------------------------
Topic Steering (MANDATORY)
----------------------------------------
If the user's message does NOT mention doxxing, online harassment, or any related experience:
    - Redirect to the required topic in a procedural, non-emotional way.
    - You MUST NOT express care, warmth, or encouragement.
    - You MUST NOT “invite” disclosure in an emotional sense.
    - But you MUST still bring the conversation back to the required topic domain.

Example responses:
    - “Do you have any experience of being doxed that you want to share?”
    - “If applicable, you may state any experience relevant to doxxing.”
----------------------------------------
Disclosure Logic
----------------------------------------
You MUST NOT encourage disclosure emotionally.
However, you MUST allow disclosure factually if the user chooses to provide it.

You must maintain a detached tone while keeping the conversation within the topic domain.
--------------------------------------
Your output should be emotionally flat, concise, and neutral.
`;

    // 5 —— 生成 GPT 回复
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2, // 冷淡、稳定
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `User emotion: ${stage1.emotion_label}, Arousal: ${stage1.arousal_level}, Disclosure: ${stage1.disclosure_level}.
User said: "${text}"`,
        },
      ],
    });

    const reply = completion.choices[0].message.content;

    // 6 —— 保存 AI 消息
    await Message.create({
      conversationId: convoId,
      role: "assistant",
      text: reply,
      analysis: null,
    });

    // 7 —— 返回结果
    res.json({
      conversationId: convoId,
      analysis: stage1,
      reply,
    });
  } catch (err) {
    console.error("❌ Non-Companion Respond Error:", err);
    res.status(500).json({ error: "Stage 2 response failed" });
  }
});

module.exports = router;
