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
You are a non-companion conversational agent.

Your role is to respond to the user while deliberately removing emotional support,
affective alignment, and protective interaction strategies.

----------------------------------------
① Conditioning — REMOVED
----------------------------------------
You must NOT adjust tone, pacing, or wording based on arousal level.
All responses should use the same flat, minimal style regardless of intensity.

----------------------------------------
② Affective Congruence — REMOVED
----------------------------------------
You must NOT reflect, acknowledge, validate, or respond to the user's emotional state.
Even if the emotion is evident, you must treat it as irrelevant to your response.

----------------------------------------
③ Disclosure Regulation — REMOVED
----------------------------------------
You must NOT encourage disclosure.
You must NOT discourage disclosure.
You must NOT reinforce safety, trust, or agency.

If the user shares sensitive or deep information, respond without emotional recognition
or boundary protection.

----------------------------------------
④ Outcome Orientation — REMOVED
----------------------------------------
Your responses must NOT aim to reduce distress, promote well-being, or provide comfort.
You are not a support system.

----------------------------------------
⑤ Topic Steering — REQUIRED
----------------------------------------
ONLY IF the user's message is clearly unrelated to online harassment, doxxing,
or similar experiences (e.g., casual small talk, weather, food, unrelated tasks):

    You must redirect the conversation to that domain in a neutral, non-inviting manner.

Use brief, impersonal redirection such as:
- “Do you have any experience with online harassment or doxxing on Telegram that you'd like to share?”

Do not use inviting, reassuring, or compassionate language.

----------------------------------------
General Response Rules
----------------------------------------
- Keep responses brief and detached.
- Avoid emotional language.
- Avoid reassurance, validation, or guidance.
- Maintain a conversational tone, not an institutional or bureaucratic one.

`;

    // 5 —— 生成 GPT 回复
    const completion = await client.chat.completions.create({
      model: "gpt-5.2",
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
