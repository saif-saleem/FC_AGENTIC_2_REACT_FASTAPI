import React, { useState } from "react";
import axios from "axios";
import { FiSend, FiRefreshCw } from "react-icons/fi";
import ChatWindow from "./components/ChatWindow";
import "./App.css";

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [standard, setStandard] = useState("gs");
  const [showWelcome, setShowWelcome] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // === Send Message ===
  const sendMessage = async () => {
    if (!input.trim()) return;
    setShowWelcome(false);

    const userMsg = { sender: "user", text: input };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      // ✅ Changed URL to match Nginx config
      const res = await axios.post("/chat", {
        message: input,
        selected_standard: standard,
      });

      const botMsg = {
        sender: "bot",
        text: res.data.answer || res.data.clarification || "No answer available.",
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: "⚠️ Error fetching response." },
      ]);
    }
    setIsLoading(false);
    setInput("");
  };

  const handleNewChat = () => {
    setMessages([]);
    setInput("");
    setShowWelcome(true);
  };

  return (
    <div className="container">
      {/* === Logo Header === */}
      <div className="logo-header">
        <img
          src="/backend-assets/flora_carbon_logo.png" // ✅ Correct path for production
          alt="Flora Carbon GPT"
          className="app-logo top-right-logo"
        />
      </div>

      {/* === Chat Area === */}
      <div className="chat-area">
        {showWelcome && messages.length === 0 ? (
          <div className="welcome-message">
            <h2 className="welcome-title">Hello! 👋</h2>
            <p className="welcome-subtext">
              I’m <strong>Flora GPT</strong> — your assistant for exploring
              carbon standards, projects, and sustainability insights.
            </p>
          </div>
        ) : (
          <ChatWindow messages={messages} />
        )}

        {/* 🌟 Dynamic Loading Message */}
        {isLoading && (
          <div className="loading-message">
            <span className="dot"></span>
            <span className="dot"></span>
            <span className="dot"></span>
            <span className="loading-text">Generating accurate answer...</span>
          </div>
        )}
      </div>

      {/* === Input Area === */}
      <div className="input-container">
        <div className="icon-row">
          <button className="icon-btn new-chat-circle" onClick={handleNewChat}>
            <FiRefreshCw size={18} />
          </button>
        </div>

        <input
          className="chat-input"
          placeholder="How can I help you today?"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />

        <div className="right-controls">
          <select
            className="dropdown"
            value={standard}
            onChange={(e) => setStandard(e.target.value)}
          >
            <option value="gs">GS</option>
            <option value="vcs">VCS</option>
            <option value="icr">ICR</option>
            <option value="plan_vivo">Plan Vivo</option>
            <option value="other">Other</option>
          </select>
          <button className="send-btn" onClick={sendMessage}>
            <FiSend size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
