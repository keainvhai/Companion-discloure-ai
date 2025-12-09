import { useState, useEffect } from "react";
import axios from "axios";
import api from "./api"; // 引用你封装好的 axios 实例

const AdminDashboard = () => {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);

  // 真正登录用的 token —— 从 localStorage 读取
  const [adminToken, setAdminToken] = useState(
    localStorage.getItem("admin-token")
  );

  // 输入框用的临时 token（不会触发 API）
  const [tempToken, setTempToken] = useState("");

  // 只有 adminToken 存在时才加载数据
  useEffect(() => {
    if (!adminToken) return; // 🔥 没 token 不要访问 API

    api
      .get("/admin/conversations", {
        headers: { "x-admin-token": adminToken },
      })
      .then((res) => {
        console.log("🔍 conversations =", res.data);
        setConversations(res.data);
      })
      .catch((err) => console.error("Failed to load conversations", err));
  }, [adminToken]); // 🔥 有 token 才触发加载

  // 加载 messages
  const loadConversation = async (convo) => {
    setSelectedConversation(convo);

    try {
      const res = await api.get(`/admin/messages/${convo.id}`, {
        headers: { "x-admin-token": adminToken },
      });

      setMessages(res.data);
    } catch (err) {
      console.error("Failed to load messages", err);
    }
  };

  // =============================
  // 🔐 登录界面（没有 token → 显示）
  // =============================
  if (!adminToken) {
    return (
      <div style={{ padding: 40 }}>
        <h2>Admin Access</h2>

        <input
          type="password"
          placeholder="Enter Admin Token"
          value={tempToken}
          onChange={(e) => setTempToken(e.target.value)}
          style={{ padding: 8, width: 250 }}
        />

        <button
          onClick={() => {
            localStorage.setItem("admin-token", tempToken);
            setAdminToken(tempToken); // 🔥 设置真正 token
          }}
          style={{ marginLeft: 10 }}
        >
          Enter
        </button>
      </div>
    );
  }

  // =============================
  // 主界面（通过验证后显示）
  // =============================
  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {/* 左侧区域 */}
      <div
        style={{
          width: 300,
          borderRight: "1px solid #ccc",
          padding: 10,
          overflowY: "auto",
        }}
      >
        <h3>Conversations</h3>

        <button
          onClick={() =>
            window.open(
              `${
                import.meta.env.VITE_API_URL
              }/admin/export-all?token=${adminToken}`
            )
          }
          style={{ marginBottom: 10 }}
        >
          download all Messages (CSV)
        </button>

        {conversations.map((c) => (
          <div
            key={c.id}
            onClick={() => loadConversation(c)}
            style={{
              padding: 10,
              cursor: "pointer",
              background:
                selectedConversation?.id === c.id ? "#eee" : "transparent",
              borderBottom: "1px solid #ddd",
            }}
          >
            <div>
              <strong>ID:</strong> {c.id}
            </div>
            <div>
              <strong>AI Type:</strong> {c.aiType}
            </div>
            <div>
              <strong>User:</strong> {c.username || "Anonymous"}
            </div>
            <div style={{ fontSize: 12, color: "#666" }}>
              {new Date(c.createdAt).toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      {/* 右侧区域 */}
      <div style={{ flex: 1, padding: 20, overflowY: "auto" }}>
        {selectedConversation ? (
          <>
            <h2>Conversation #{selectedConversation.id}</h2>

            <button
              onClick={() =>
                window.open(
                  `${import.meta.env.VITE_API_URL}/admin/export/${
                    selectedConversation.id
                  }?token=${adminToken}`
                )
              }
              style={{ marginBottom: 10 }}
            >
              download this Conversation (CSV)
            </button>

            <p>
              <strong>AI Type:</strong> {selectedConversation.aiType}
            </p>
            <p>
              <strong>User:</strong>{" "}
              {selectedConversation.username || "Anonymous"}
            </p>
            <hr />

            {messages.map((m) => (
              <div key={m.id} style={{ marginBottom: 20 }}>
                <strong>{m.role?.toUpperCase() || "(UNKNOWN)"}</strong>

                <div>{m.text}</div>

                <div style={{ fontSize: 12, color: "#777" }}>
                  {new Date(m.createdAt).toLocaleString()}
                </div>

                {m.analysis && (
                  <pre
                    style={{
                      background: "#f6f6f6",
                      padding: 10,
                      marginTop: 5,
                    }}
                  >
                    {JSON.stringify(m.analysis, null, 2)}
                  </pre>
                )}

                <hr />
              </div>
            ))}
          </>
        ) : (
          <h3>Please Select One Conversation</h3>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
