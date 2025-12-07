// server/routes/admin.js
const express = require("express");
const router = express.Router();

// 加载数据库模型
const db = require("../models");
const Conversation = db.Conversation;
const Message = db.Message;

/**
 * 简单的管理员 Token 验证
 * 不需要登录系统，也不需要 User 表
 * 只要前端请求时带上正确的 ADMIN_TOKEN（存 .env）
 */
function adminCheck(req, res, next) {
  // 允许 header 或 query 传入 token
  const token = req.headers["x-admin-token"] || req.query.token;

  if (!token || token !== process.env.ADMIN_TOKEN) {
    return res.status(403).json({ error: "Forbidden: Invalid admin token" });
  }

  next();
}

function formatDateEST(date) {
  if (!date) return "";

  const d = new Date(date);

  const options = {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  };

  const parts = new Intl.DateTimeFormat("en-US", options).formatToParts(d);

  const dateStr = `${parts.find((p) => p.type === "year").value}-${
    parts.find((p) => p.type === "month").value
  }-${parts.find((p) => p.type === "day").value} ${
    parts.find((p) => p.type === "hour").value
  }:${parts.find((p) => p.type === "minute").value}:${
    parts.find((p) => p.type === "second").value
  }`;

  return `${dateStr} EST`;
}

/**
 * 测试路由
 * 用来确认 admin.js 是否挂载成功
 */
router.get("/test", adminCheck, (req, res) => {
  res.json({ message: "Admin route is working" });
});

/**
 * 获取所有 Conversation 列表
 * 按创建时间倒序排列
 * 不返回 Message 内容，只返回 meta
 */
router.get("/conversations", adminCheck, async (req, res) => {
  try {
    const conversations = await Conversation.findAll({
      order: [["createdAt", "DESC"]],
    });

    res.json(conversations);
  } catch (err) {
    console.error("❌ Failed to load conversations:", err);
    res.status(500).json({ error: "Failed to load conversations" });
  }
});

/**
 * 获取某个 Conversation 的所有 Messages
 * 包含 user/assistant 消息，以及 Stage1 分析字段（analysis）
 */
router.get("/messages/:id", adminCheck, async (req, res) => {
  try {
    const messages = await Message.findAll({
      where: { conversationId: req.params.id },
      order: [["createdAt", "ASC"]],
    });

    res.json(messages);
  } catch (err) {
    console.error("❌ Failed to load messages:", err);
    res.status(500).json({ error: "Failed to load messages" });
  }
});

/**
 * 导出某个 conversation 的 messages 为 CSV
 */
router.get("/export/:id", adminCheck, async (req, res) => {
  try {
    const convoId = req.params.id;

    // 先查 Conversation 本身（为了取 aiType、username）
    const convo = await Conversation.findByPk(convoId);

    if (!convo) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    // 查 messages
    const messages = await Message.findAll({
      where: { conversationId: convoId },
      order: [["createdAt", "ASC"]],
    });

    // CSV 头
    let csv =
      "conversationId,messageId,role,aiType,username,userId,text,createdAt,updatedAt,analysis\n";

    // 拼接每一行
    messages.forEach((m) => {
      const safeText = (m.text || "").replace(/"/g, '""'); // 处理引号
      const safeAnalysis = m.analysis
        ? JSON.stringify(m.analysis).replace(/"/g, '""')
        : "";

      csv += `${convoId},${m.id},${m.role || ""},${convo.aiType || ""},${
        convo.username || ""
      },${convo.userId || ""},"${safeText}",${formatDateEST(
        m.createdAt
      )},${formatDateEST(m.updatedAt)},"${safeAnalysis}"\n`;
    });

    // 设置下载文件 headers
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=conversation_${convoId}.csv`
    );

    res.send(csv);
  } catch (err) {
    console.error("❌ Failed to export CSV:", err);
    res.status(500).json({ error: "Failed to export CSV" });
  }
});

/**
 * 导出全部 conversations 的 messages 为一个大 CSV
 */
router.get("/export-all", adminCheck, async (req, res) => {
  try {
    // 拉所有 conversations（为了取 aiType / username 信息）
    const conversations = await Conversation.findAll();

    // 建一个映射表方便取 aiType 等信息
    const convoMap = {};
    conversations.forEach((c) => {
      convoMap[c.id] = {
        aiType: c.aiType,
        username: c.username,
        userId: c.userId,
      };
    });

    // 拉所有 messages
    const messages = await Message.findAll({
      order: [
        ["conversationId", "ASC"],
        ["createdAt", "ASC"],
      ],
    });

    // CSV header
    let csv =
      "conversationId,messageId,role,aiType,username,userId,text,createdAt,updatedAt,analysis\n";

    // 拼接每一条记录
    messages.forEach((m) => {
      const convoInfo = convoMap[m.conversationId] || {};
      const safeText = (m.text || "").replace(/"/g, '""');
      const safeAnalysis = m.analysis
        ? JSON.stringify(m.analysis).replace(/"/g, '""')
        : "";

      csv += `${m.conversationId},${m.id},${m.role || ""},${
        convoInfo.aiType || ""
      },${convoInfo.username || ""},${
        convoInfo.userId || ""
      },"${safeText}",${formatDateEST(m.createdAt)}
,${formatDateEST(m.updatedAt)},"${safeAnalysis}"\n`;
    });

    // 设置下载 headers
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=all_conversations_messages.csv`
    );

    res.send(csv);
  } catch (err) {
    console.error("❌ Failed to export all messages CSV:", err);
    res.status(500).json({ error: "Failed to export all messages CSV" });
  }
});

module.exports = router;
