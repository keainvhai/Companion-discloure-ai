// server/routes/companion.js
const express = require("express");
const router = express.Router();
const OpenAI = require("openai");
const { analyzeStage1 } = require("../utils/stage1Analyzer.js");

const db = require("../models");
const Conversation = db.Conversation;
const Message = db.Message;

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
 * Stage 2: 情绪响应生成
 * POST /companion/respond
 */
router.post("/respond", async (req, res) => {
  try {
    const { text, conversationId, username } = req.body;

    // 1 ------- 如果没有 conversationId，创建一个新的 ----------
    let convoId = conversationId;
    if (!convoId) {
      const newConvo = await Conversation.create({
        userId: null,
        username: username || null,
        aiType: "companion",
      });
      convoId = newConvo.id;
    }

    // 2 先执行情绪识别
    const stage1 = await analyzeStage1(text);

    const {
      emotion_label,
      arousal_level,
      disclosure_level,
      distress_score,
      help_intent,
    } = stage1;

    // 3 ------- 保存用户消息到 Messages 表 ----------
    const userMsg = await Message.create({
      conversationId: convoId,
      role: "user",
      text,
      analysis: stage1, // JSON 保存分析结果
    });

    // 4 构造 GPT 提示词（包含 Conditioning / Congruence / Reciprocity）
    const systemPrompt = `
You are a compassionate AI companion trained for victims of online harassment.
Your goal: respond with empathy, calmness, and validation — never judgment or advice-giving.
Always follow these layered rules:

① Conditioning (state mode):
- high arousal → use soft, slow, soothing language (“You're safe here.”)
- low arousal → be gently engaging (“Would you like to share a bit more?”)

② Affective Congruence:
- Match tone to the user's emotion.
  sadness/guilt/shame → warm and reassuring
  fear → grounding and safety oriented
  anger → non-defensive, validating, calm
  joy/pride → amplify and mirror positivity

③ Adaptive Disclosure Reciprocity:
- surface → encourage openness (“It's okay to talk about what happened whenever you feel ready.”)
- mid → reflect and validate (“It makes sense you'd feel that way.”)
- deep → reinforce safety and agency (“You're sharing something important — thank you for trusting me.”)
- add a soft suggestion like:
  1) “Many people find sharing helps lighten the pain.”
  2) “Remember, what you say stays private here.”
  3) “I can help you think about small next steps if you want.”

④ Outcome Goal:
Always alleviate distress, promote well-being, and uphold dignity.
`;

    //  生成 GPT 回复
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.8,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `User emotion: ${emotion_label}, Arousal: ${arousal_level}, Disclosure: ${disclosure_level}, Distress: ${distress_score}, HelpIntent: ${help_intent}.
User said: "${text}"`,
        },
      ],
    });

    const reply = completion.choices[0].message.content;

    // 5 ------- 保存 AI 回复 ----------
    const aiMsg = await Message.create({
      conversationId: convoId,
      role: "assistant",
      text: reply,
      analysis: null, // AI 回复不需要 Stage1 分析
    });

    // 6 返回结果
    res.json({
      conversationId: convoId,
      analysis: stage1,
      reply,
    });
  } catch (err) {
    console.error("❌ Companion Respond Error:", err);
    res.status(500).json({ error: "Stage 2 response failed" });
  }
});

module.exports = router;
