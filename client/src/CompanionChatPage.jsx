import React, { useState } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import "./ChatPage.css";
import api from "./api";

import { useUsernameStore } from "./store/useUsernameStore";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

const CompassionChatPage = () => {
  const username = useUsernameStore((s) => s.username);

  const navigate = useNavigate();
  useEffect(() => {
    if (!username) {
      navigate("/");
    }
  }, [username, navigate]);

  const isLocked = useUsernameStore((s) => s.isLocked);
  const setUsername = useUsernameStore((s) => s.setUsername);
  const lockUsername = useUsernameStore((s) => s.lockUsername);

  const [showEdit, setShowEdit] = useState(false);
  const [editTemp, setEditTemp] = useState(username);

  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hi, I'm your AI Companion. How are you today?",
      mood: "neutral",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);

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

    // 🔐 第一条消息后锁定 username
    if (!isLocked) lockUsername();

    const newMessages = [...messages, { role: "user", content: input }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await api.post("/companion/respond", {
        text: input,
        conversationId: conversationId,
        username: username,
      });

      // ⭐ 保存后端返回的 conversationId（第一次聊天的新值）
      if (!conversationId && res.data.conversationId) {
        setConversationId(res.data.conversationId);
      }

      // 从后端取出回复
      const reply = res.data.reply || "Sorry, I couldn't process that.";
      const mood = res.data.mood || "neutral";

      setMessages([
        ...newMessages,
        { role: "assistant", content: reply, mood },
      ]);
    } catch (err) {
      console.error("Chat API error:", err);
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: "❌ Something went wrong with the AI.",
          mood: "neutral",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-container">
      <h2 className="chat-title">AI Companion Chat</h2>

      {/* ⭐ 顶部提示条（发送前可修改） */}
      {!isLocked && (
        <div className="notice-bar">
          ✨ Before start, you can modify conversation settings
          <button className="edit-btn" onClick={() => setShowEdit(true)}>
            Edit
          </button>
        </div>
      )}

      {/* ⭐ Edit 弹出的浮层 */}
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

export default CompassionChatPage;
