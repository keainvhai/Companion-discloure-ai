import React, { useState } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import "./ChatPage.css";

const ChatPage = () => {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hi, I'm your AI Companion. How are you today?",
      mood: "neutral",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

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

    const newMessages = [...messages, { role: "user", content: input }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await axios.post("http://localhost:3001/companion/respond", {
        text: input,
      });

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

export default ChatPage;
