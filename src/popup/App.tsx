import React, { useState, useEffect } from "react";
import { MESSAGE_TYPES } from "../shared/constants";

// 清新自然风格配色
const colors = {
  bg: "#F8FBF9",
  card: "#FFFFFF",
  primary: "#10B981",
  primaryHover: "#059669",
  primaryLight: "#D1FAE5",
  text: "#1F2937",
  textSecondary: "#6B7280",
  border: "#E5E7EB",
  footer: "#9CA3AF",
  error: "#dc2626",
};

export function PopupApp() {
  const [status, setStatus] = useState<"idle" | "translating" | "done" | "error">("idle");
  const [progress, setProgress] = useState({ total: 0, completed: 0, failed: 0 });
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const handleProgress = (message: any) => {
      if (message.type === MESSAGE_TYPES.TRANSLATION_PROGRESS) {
        const { total, completed, failed } = message.payload;
        setProgress({ total, completed, failed });
        if (completed + failed === total && total > 0) {
          setStatus(failed > 0 ? "error" : "done");
        }
      }
    };

    const handleError = (message: any) => {
      if (message.type === MESSAGE_TYPES.TRANSLATION_ERROR) {
        setErrorMsg(message.error);
        setStatus("error");
      }
    };

    chrome.runtime.onMessage.addListener(handleProgress);
    chrome.runtime.onMessage.addListener(handleError);

    return () => {
      chrome.runtime.onMessage.removeListener(handleProgress);
      chrome.runtime.onMessage.removeListener(handleError);
    };
  }, []);

  const handleTranslate = () => {
    setStatus("translating");
    setErrorMsg("");
    setProgress({ total: 0, completed: 0, failed: 0 });

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]?.id) {
        setStatus("error");
        setErrorMsg("无法获取当前标签页");
        return;
      }

      chrome.tabs.sendMessage(tabs[0].id, { type: MESSAGE_TYPES.START_PAGE_TRANSLATION });
    });
  };

  const openOptions = () => {
    chrome.runtime.openOptionsPage();
  };

  const styles: Record<string, React.CSSProperties> = {
    container: {
      width: 360,
      padding: 20,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      color: colors.text,
      background: colors.bg,
    },
    header: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 20,
    },
    headerLeft: {
      display: "flex",
      alignItems: "center",
      gap: 10,
    },
    logo: {
      width: 32,
      height: 32,
      borderRadius: 8,
    },
    title: {
      fontSize: 16,
      fontWeight: 700,
      margin: 0,
      color: colors.text,
    },
    settingsBtn: {
      width: 34,
      height: 34,
      borderRadius: 8,
      border: `1px solid ${colors.border}`,
      background: colors.card,
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      transition: "border-color 0.2s, background 0.2s",
    },
    card: {
      background: colors.card,
      borderRadius: 16,
      border: `1px solid ${colors.border}`,
      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      padding: 24,
      marginBottom: 16,
    },
    translateBtn: {
      width: "100%",
      padding: "16px 20px",
      fontSize: 15,
      fontWeight: 600,
      color: "#ffffff",
      background: status === "done"
        ? colors.primaryHover
        : `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryHover} 100%)`,
      border: "none",
      borderRadius: 12,
      cursor: status === "translating" ? "not-allowed" : "pointer",
      boxShadow: `0 2px 8px ${colors.primary}40`,
      transition: "transform 0.15s, box-shadow 0.15s",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    status: {
      fontSize: 13,
      color: colors.textSecondary,
      margin: "14px 0 0 0",
      textAlign: "center" as const,
    },
    footer: {
      fontSize: 12,
      color: colors.footer,
      textAlign: "center" as const,
    },
  };

  return (
    <main style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <img src="../../public/icon-48.png" alt="logo" style={styles.logo} />
          <h1 style={styles.title}>网页翻译器</h1>
        </div>
        <button
          onClick={openOptions}
          title="设置"
          style={styles.settingsBtn}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.textSecondary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </button>
      </header>

      <div style={styles.card}>
        <button
          type="button"
          onClick={handleTranslate}
          disabled={status === "translating"}
          style={styles.translateBtn}
        >
          {status === "translating" ? (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "spin 1s linear infinite" }}>
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
              </svg>
              翻译中...
            </>
          ) : status === "done" ? (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20,6 9,17 4,12"/>
              </svg>
              翻译完成
            </>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 8l6 6"/>
                <path d="M4 14l6-6 2-3"/>
                <path d="M2 5h12"/>
                <path d="M7 2h1"/>
                <path d="M22 22l-5-10-5 10"/>
                <path d="M14 18h6"/>
              </svg>
              翻译当前页
            </>
          )}
        </button>
        <p style={styles.status}>
          {status === "idle" && "点击上方按钮翻译当前页面"}
          {status === "translating" && "正在翻译，请稍候..."}
          {status === "done" && "翻译已完成"}
          {status === "error" && "翻译失败"}
        </p>
        {status === "translating" && progress.total > 0 && (
          <>
            <p style={{ marginTop: 14, fontSize: 13, color: colors.textSecondary, textAlign: "center" }}>
              {progress.completed} / {progress.total} ({((progress.completed / progress.total) * 100).toFixed(0)}%)
            </p>
            <div style={{ width: "100%", height: 6, background: colors.border, borderRadius: 3, marginTop: 10, overflow: "hidden" }}>
              <div style={{ height: "100%", background: colors.primary, transition: "width 0.3s ease", width: `${(progress.completed / progress.total) * 100}%` }} />
            </div>
          </>
        )}
        {status === "error" && errorMsg && (
          <p style={{ marginTop: 8, fontSize: 12, color: colors.error, textAlign: "center" }}>{errorMsg}</p>
        )}
        {status === "done" && progress.failed > 0 && (
          <button
            type="button"
            onClick={handleTranslate}
            style={{
              marginTop: 12,
              width: "100%",
              padding: "10px 16px",
              fontSize: 13,
              fontWeight: 500,
              color: colors.primary,
              background: colors.primaryLight,
              border: `1px solid ${colors.primary}30`,
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            重试失败的 {progress.failed} 段
          </button>
        )}
      </div>

      <footer style={styles.footer}>
        网页翻译器 v0.1.0
      </footer>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  );
}
