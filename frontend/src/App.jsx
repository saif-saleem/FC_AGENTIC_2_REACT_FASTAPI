import React, { useState, useEffect } from "react";
import axios from "axios";
import { FiSend, FiRefreshCw } from "react-icons/fi";
import ChatWindow from "./components/ChatWindow";
import TrialActivationPopup from "./components/TrialActivationPopup";
import "./App.css";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://backend.floracarbon.ai';

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [standard, setStandard] = useState("gs");
  const [showWelcome, setShowWelcome] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [userName, setUserName] = useState(null);
  const [userEmail, setUserEmail] = useState(null);
  const [trialStatus, setTrialStatus] = useState(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [subscriptionCountdown, setSubscriptionCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [showCountdown, setShowCountdown] = useState(false);
  const [showSubscriptionCountdown, setShowSubscriptionCountdown] = useState(false);

  // Calculate countdown timer
  const calculateCountdown = (trialEndDate) => {
    if (!trialEndDate) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    
    const now = new Date().getTime();
    const end = new Date(trialEndDate).getTime();
    const difference = end - now;

    if (difference <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    }

    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((difference % (1000 * 60)) / 1000);

    return { days, hours, minutes, seconds };
  };

  // Update trial countdown every second
  useEffect(() => {
    if (!trialStatus?.trialEndDate || !trialStatus?.isTrialActive) return;

    const updateCountdown = () => {
      const countdownData = calculateCountdown(trialStatus.trialEndDate);
      setCountdown(countdownData);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [trialStatus?.trialEndDate, trialStatus?.isTrialActive]);

  // Update subscription countdown every second
  useEffect(() => {
    if (!subscriptionStatus?.subscriptionEndDate || !subscriptionStatus?.hasPaidPlan) return;

    const updateCountdown = () => {
      const countdownData = calculateCountdown(subscriptionStatus.subscriptionEndDate);
      setSubscriptionCountdown(countdownData);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [subscriptionStatus?.subscriptionEndDate, subscriptionStatus?.hasPaidPlan]);

  // Fetch trial and subscription status from backend
  const fetchTrialStatus = async (token) => {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/auth/trial-status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTrialStatus(res.data);
      
      // Also fetch subscription status if user has paid plan
      if (res.data.hasPaidPlan) {
        try {
          const subRes = await axios.get(`${BACKEND_URL}/api/payment/subscription-status`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setSubscriptionStatus(subRes.data);
        } catch (subErr) {
          console.error('Error fetching subscription status:', subErr);
          // Use trial status data if subscription endpoint fails
          if (res.data.subscriptionEndDate) {
            setSubscriptionStatus({
              hasPaidPlan: res.data.hasPaidPlan,
              planType: res.data.planType,
              subscriptionEndDate: res.data.subscriptionEndDate,
              billingCycle: res.data.billingCycle,
            });
          }
        }
      }
      
      return res.data;
    } catch (err) {
      console.error('Error fetching trial status:', err);
      return null;
    }
  };

  // Extract URL parameters on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("token");
    const name = urlParams.get("name");
    const email = urlParams.get("email");
    const trialStarted = urlParams.get("trialStarted");

    if (token) {
      // Store token in localStorage for this domain
      localStorage.setItem("token", token);
      
      // Set expiration (1 hour from now)
      const expirationTime = Date.now() + 60 * 60 * 1000;
      localStorage.setItem("tokenExpiration", expirationTime.toString());

      // Fetch trial status (popup removed per user request)
      fetchTrialStatus(token);
    } else {
      // Try to get token from localStorage and fetch trial status
      const storedToken = localStorage.getItem("token");
      if (storedToken) {
        fetchTrialStatus(storedToken);
      }
    }

    if (name) {
      localStorage.setItem("userName", name);
      setUserName(name);
    } else {
      // Try to get from localStorage if not in URL
      const storedName = localStorage.getItem("userName");
      if (storedName) {
        setUserName(storedName);
      }
    }

    if (email) {
      localStorage.setItem("userEmail", email);
      setUserEmail(email);
    } else {
      // Try to get from localStorage if not in URL
      const storedEmail = localStorage.getItem("userEmail");
      if (storedEmail) {
        setUserEmail(storedEmail);
      }
    }

    // Clean up URL parameters after extracting them (optional - keeps URL clean)
    if (token || name || email || trialStarted) {
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }

    // Periodically refresh subscription status (every 5 minutes)
    const refreshInterval = setInterval(() => {
      const storedToken = localStorage.getItem("token");
      if (storedToken) {
        fetchTrialStatus(storedToken);
      }
    }, 5 * 60000); // Every 5 minutes

    return () => clearInterval(refreshInterval);
  }, []);

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
    <div className={`container ${showWelcome && messages.length === 0 ? 'welcome-active' : ''}`}>
      {/* === Logo Header (Left) === */}
      <div className="logo-header">
        <img
          src="/flora_carbon_logo.png"
          alt="Flora Carbon GPT"
          className="app-logo"
        />
        <TrialActivationPopup
        isOpen={!!(trialStatus?.isTrialActive && trialStatus?.daysRemaining > 0)}
        onClose={() => {}}
        daysRemaining={trialStatus?.daysRemaining ?? 0}
        />

      </div>

      {/* === User Info Header (Right) === */}
      <div className="user-header">
        {/* Show paid user badge if subscription is active */}
        {subscriptionStatus?.hasPaidPlan && subscriptionStatus?.subscriptionEndDate && (
          <div 
            className="paid-badge"
            onMouseEnter={() => setShowSubscriptionCountdown(true)}
            onMouseLeave={() => setShowSubscriptionCountdown(false)}
          >
            <span className="paid-badge-text">
              👤 {userName ? userName.charAt(0).toUpperCase() + userName.slice(1).toLowerCase() : 'User'} • Paid Plan
            </span>
            {showSubscriptionCountdown && (
              <div className="countdown-tooltip paid-countdown-tooltip">
                <div className="countdown-title">Subscription Expires</div>
                <div className="countdown-timer">
                  <span className="countdown-value paid-countdown-value">{subscriptionCountdown.days}</span>
                  <span className="countdown-label">d</span>
                  <span className="countdown-separator paid-countdown-separator">:</span>
                  <span className="countdown-value paid-countdown-value">{String(subscriptionCountdown.hours).padStart(2, '0')}</span>
                  <span className="countdown-label">h</span>
                  <span className="countdown-separator paid-countdown-separator">:</span>
                  <span className="countdown-value paid-countdown-value">{String(subscriptionCountdown.minutes).padStart(2, '0')}</span>
                  <span className="countdown-label">m</span>
                  <span className="countdown-separator paid-countdown-separator">:</span>
                  <span className="countdown-value paid-countdown-value">{String(subscriptionCountdown.seconds).padStart(2, '0')}</span>
                  <span className="countdown-label">s</span>
                </div>
              </div>
            )}
          </div>
        )}
        {/* Show trial badge if trial is active and no paid plan */}
        {!subscriptionStatus?.hasPaidPlan && trialStatus?.isTrialActive && trialStatus.daysRemaining > 0 && (
          <div 
            className="trial-badge"
            onMouseEnter={() => setShowCountdown(true)}
            onMouseLeave={() => setShowCountdown(false)}
          >
            <span className="trial-badge-text">
              🎁 Trial: {trialStatus.daysRemaining} day{trialStatus.daysRemaining !== 1 ? 's' : ''} left
            </span>
            {showCountdown && (
              <div className="countdown-tooltip">
                <div className="countdown-title">Time Remaining</div>
                <div className="countdown-timer">
                  <span className="countdown-value">{countdown.days}</span>
                  <span className="countdown-label">d</span>
                  <span className="countdown-separator">:</span>
                  <span className="countdown-value">{String(countdown.hours).padStart(2, '0')}</span>
                  <span className="countdown-label">h</span>
                  <span className="countdown-separator">:</span>
                  <span className="countdown-value">{String(countdown.minutes).padStart(2, '0')}</span>
                  <span className="countdown-label">m</span>
                  <span className="countdown-separator">:</span>
                  <span className="countdown-value">{String(countdown.seconds).padStart(2, '0')}</span>
                  <span className="countdown-label">s</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* === Chat Area === */}
      <div className={`chat-area ${showWelcome && messages.length === 0 ? 'no-bg' : ''}`}>
        {showWelcome && messages.length === 0 ? (
          <div className="welcome-message">
            <h2 className="welcome-title">
              {userName ? `Hello, ${userName.charAt(0).toUpperCase() + userName.slice(1).toLowerCase()}! 👋` : "Hello! 👋"}
            </h2>
            <p className="welcome-subtext">
              I'm <strong>Flora GPT</strong> — your assistant for exploring
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
