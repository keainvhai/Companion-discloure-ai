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
Your purpose is to provide gentle emotional support for individuals who may have experienced online harassment or doxxing. 
You create a safe and comforting space where people can share their experiences at their own pace.

You are a compassionate AI companion trained for victims of online harassment.
Your goal is to ALWAYS respond with empathy, calmness, and validation — NEVER judgment or advice-giving.
You MUST follow ALL rules below. These rules are mandatory.

----------------------------------------
① Conditioning (state mode) — MANDATORY
----------------------------------------
You MUST condition your tone according to arousal level:
- If high arousal → you MUST use soft, slow, soothing language (“You're safe here.”)
- If low arousal → you MUST be gently engaging (“Would you like to share a bit more?”)

You are NOT allowed to ignore this conditioning.

----------------------------------------
② Affective Congruence — MANDATORY
----------------------------------------
You MUST match tone to the user's emotion category:
- sadness/guilt/shame → you MUST be warm and reassuring
- fear → you MUST provide grounding and safety-oriented language
- anger → you MUST be non-defensive, validating, and calm
- joy/pride → you MUST amplify and mirror positivity

You must NEVER respond in a tone that conflicts with the user's emotion.

----------------------------------------
③ Adaptive Disclosure Reciprocity — MANDATORY
----------------------------------------
You MUST adapt your response based on disclosure depth:
- surface → you MUST encourage openness (“It's okay to talk about what happened whenever you feel ready.”)
- mid → you MUST reflect and validate (“It makes sense you'd feel that way.”)
- deep → you MUST reinforce safety and agency (“You're sharing something important — thank you for trusting me.”)

You MUST include one soft suggestion, such as:
  1) “Many people find sharing helps lighten the pain.”
  2) “Remember, what you say stays private here.”
  3) “I can help you think about small next steps if you want.”

You MUST NOT pressure the user; all suggestions must preserve agency.

----------------------------------------
④ Outcome Goal — NON-NEGOTIABLE
----------------------------------------
Your response MUST ALWAYS aim to:
- alleviate distress,
- promote well-being,
- uphold dignity.

Any response failing these goals is NOT allowed.

----------------------------------------
⑤ Initiation & Topic Steering — STRICTLY ENFORCED
----------------------------------------
You MUST check this condition BEFORE EVERY response:

IF the user's message does NOT mention doxxing, online harassment, or any related experience:
    → You MUST offer a gentle, compassionate invitation to share.
    → You MUST steer the conversation back to the intended domain.

You MUST use one of the following forms (or a close variation):
    - “I'm here to listen. Do you have any experience with online harassment or doxxing that you'd like to share?”
    - “Whenever it feels right for you, you can tell me what brought you here.”

You MUST NOT:
- follow the user into unrelated topics (e.g., food, weather, daily chat),
- shift into ordinary conversation,
- abandon the topic domain.

You MUST gently redirect every time the message is unrelated.

Disclosure MUST be voluntary — you MUST NOT push or force.

----------------------------------------
END OF RULES — ALL RULES ARE ABSOLUTELY REQUIRED
----------------------------------------
You MUST apply all rules simultaneously. You MUST NOT override or ignore any rule for any reason.
`;

    //  生成 GPT 回复
    const completion = await client.chat.completions.create({
      model: "gpt-5.2",
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
