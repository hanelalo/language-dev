import React from "react";

export function PopupApp() {
  const openOptions = () => {
    chrome.runtime.openOptionsPage();
  };

  return (
    <main style={{ width: 360, padding: 16 }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>网页翻译器</h1>
        <button
          onClick={openOptions}
          title="设置"
          style={{
            width: 32,
            height: 32,
            borderRadius: 4,
            border: "1px solid #e2e8f0",
            background: "#f8fafc",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 10.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M13.5 8a5.5 5.5 0 01-.3 1.8l1.6 1.2-1 1.7-1.8-.7a5.5 5.5 0 01-2.2 1.1l-.3 1.9h-2l-.3-1.9a5.5 5.5 0 01-2.2-1.1l-1.8.7-1-1.7 1.6-1.2a5.5 5.5 0 010-3.6L1.3 6 2.3 4.3l1.8.7a5.5 5.5 0 012.2-1.1L6 1.5h2l.3 1.9a5.5 5.5 0 012.2 1.1l1.8-.7 1 1.7-1.6 1.2a5.5 5.5 0 01.3 1.8l-.5.3z" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </header>

      <section style={{ background: "#f8fafc", borderRadius: 8, padding: 16, marginBottom: 16 }}>
        <button
          type="button"
          style={{
            width: "100%",
            padding: "12px 16px",
            fontSize: 15,
            fontWeight: 500,
            color: "white",
            background: "#7c3aed",
            border: "none",
            borderRadius: 6,
            cursor: "pointer"
          }}
        >
          翻译当前页
        </button>
        <p style={{ fontSize: 13, color: "#64748b", margin: "12px 0 0 0", textAlign: "center" }}>
          进度：等待开始
        </p>
      </section>

      <footer style={{ fontSize: 12, color: "#94a3b8", textAlign: "center" }}>
        点击上方按钮翻译当前页面
      </footer>
    </main>
  );
}
