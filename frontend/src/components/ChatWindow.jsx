import React, { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import "./ChatWindow.css";

const ChatWindow = ({ messages }) => {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="chat-window">
      {messages.map((msg, i) => (
        <div
          key={i}
          className={`chat-line ${msg.sender === "user" ? "user-msg" : "bot-msg"}`}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}   // ✅ enables Markdown tables
            rehypePlugins={[rehypeRaw]}   // ✅ safely renders HTML tags
            components={{
              table: ({ node, ...props }) => (
                <table className="markdown-table" {...props} />
              ),
              th: ({ node, ...props }) => (
                <th className="markdown-th" {...props} />
              ),
              td: ({ node, ...props }) => (
                <td className="markdown-td" {...props} />
              ),
            }}
          >
            {msg.text}
          </ReactMarkdown>
        </div>
      ))}
      <div ref={endRef} />
    </div>
  );
};

export default ChatWindow;
