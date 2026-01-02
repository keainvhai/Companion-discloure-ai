import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUsernameStore } from "./store/useUsernameStore";

const UsernamePage = () => {
  const [tempName, setTempName] = useState("");
  const setUsername = useUsernameStore((s) => s.setUsername);
  const navigate = useNavigate();

  const startChat = () => {
    if (!tempName.trim()) return alert("Please enter a username.");
    setUsername(tempName.trim());
    navigate(-1); // 返回上一个页面
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2>👋 Welcome to use conversational AI</h2>

        <div style={styles.row}>
          <label style={{ marginRight: 10 }}>Prolific ID</label>
          <input
            style={styles.input}
            value={tempName}
            onChange={(e) => setTempName(e.target.value)}
            placeholder="Enter your Prolific ID"
          />
        </div>

        <button style={styles.button} onClick={startChat}>
          💬 Start Chat
        </button>
      </div>
    </div>
  );
};

const styles = {
  container: {
    width: "100vw",
    height: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#f9fafe",
  },
  card: {
    padding: 30,
    background: "white",
    borderRadius: 12,
    boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
    textAlign: "center",
    width: 400,
  },
  row: {
    display: "flex",
    alignItems: "center",
    marginTop: 20,
  },
  input: {
    flex: 1,
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #ddd",
  },
  button: {
    marginTop: 25,
    padding: "10px 20px",
    background: "#d1a3ff",
    color: "white",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
  },
};

export default UsernamePage;
