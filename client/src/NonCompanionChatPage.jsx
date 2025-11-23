import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import api from "./api";
import "./ChatPage.css";

import { useUsernameStore } from "./store/useUsernameStore";
import { useNavigate } from "react-router-dom";

const MODE = "chatC"; // ⭐ 当前页面对应模式

const NonCompanionChatPage = () => {
  const navigate = useNavigate();

  // 基础用户信息
  const username = useUsernameStore((s) => s.username);
  const isLocked = useUsernameStore((s) => s.isLocked);
  const setUsername = useUsernameStore((s) => s.setUsername);
  const lockUsername = useUsernameStore((s) => s.lockUsername);

  // ⭐ 独立的聊天记录
  const messages = useUsernameStore((s) => s.messagesByMode[MODE] || []);
  const addMessage = useUsernameStore((s) => s.addMessage);

  // ⭐ 独立的 conversationId
  const conversationId = useUsernameStore((s) => s.conversationIdByMode[MODE]);
  const setConversationId = useUsernameStore((s) => s.setConversationId);

  const [showEdit, setShowEdit] = useState(false);
  const [editTemp, setEditTemp] = useState(username);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // 如果没用户名 → 回首页
  useEffect(() => {
    if (!username) navigate("/");
  }, [username, navigate]);

  const getAvatar = (mood) => {
    switch (mood) {
      case "happy":
        return "😀";
      case "sad":
        return "😢";
      case "caring":
        return "🤗";
      default:
        return "🙂";
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    if (!isLocked) lockUsername();

    const userText = input;
    addMessage(MODE, { role: "user", content: userText });

    setInput("");
    setLoading(true);

    try {
      const res = await api.post("/noncompanion/respond", {
        text: userText,
        conversationId,
        username,
      });

      // 第一次生成 conversationId → 独立保存
      if (!conversationId && res.data.conversationId) {
        setConversationId(MODE, res.data.conversationId);
      }

      const reply = res.data.reply || "Sorry, I couldn't process that.";
      const mood = res.data.mood || "neutral";

      addMessage(MODE, {
        role: "assistant",
        content: reply,
        mood,
      });
    } catch (err) {
      addMessage(MODE, {
        role: "assistant",
        content: "❌ Something went wrong with the AI.",
        mood: "neutral",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-container">
      <h2 className="chat-title">Non-Companion Chat</h2>

      {!isLocked && (
        <div className="notice-bar">
          ✨ Before starting, you can modify username
          <button className="edit-btn" onClick={() => setShowEdit(true)}>
            Edit
          </button>
        </div>
      )}

      {showEdit && (
        <div className="modal">
          <div className="modal-content">
            <h3>Edit Username</h3>
            <input
              value={editTemp}
              onChange={(e) => setEditTemp(e.target.value)}
            />
            <div className="modal-actions">
              <button
                onClick={() => {
                  setUsername(editTemp.trim());
                  setShowEdit(false);
                }}
              >
                Save
              </button>
              <button onClick={() => setShowEdit(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="messages">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`message ${m.role} ${m.mood ? `mood-${m.mood}` : ""}`}
          >
            {m.role === "assistant" && (
              <div className="avatar">{getAvatar(m.mood)}</div>
            )}
            <div className="bubble">
              <ReactMarkdown>{m.content}</ReactMarkdown>
            </div>
          </div>
        ))}

        {loading && (
          <div className="message assistant">
            <div className="avatar">🤖</div>
            <div className="bubble typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
      </div>

      <div className="input-area">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button onClick={sendMessage} disabled={loading}>
          {loading ? "..." : "Send"}
        </button>
      </div>
    </div>
  );
};

export default NonCompanionChatPage;
