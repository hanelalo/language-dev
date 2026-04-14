import React, { useState, useEffect } from "react";
import { DEFAULT_SETTINGS, type Settings } from "../shared/storage-schema";

// 内置领域
const BUILTIN_DOMAINS = [
  { id: "it", name: "IT/技术", prompt: "你是专业 IT 技术文档翻译专家，保持术语一致并保留缩写。" },
  { id: "legal", name: "法律", prompt: "使用正式法律语言，保持条款与术语精确对应。" },
  { id: "medical", name: "医学", prompt: "使用规范医学术语，避免口语化表达。" },
  { id: "finance", name: "金融", prompt: "保留金融专有名词，强调数值与单位准确性。" },
  { id: "gaming", name: "游戏", prompt: "保留游戏语境和术语，语气自然且可读。" },
  { id: "literature", name: "文学", prompt: "优先保留文风和修辞，同时确保语义忠实。" },
];

export function OptionsApp() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [deeplKey, setDeeplKey] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const [openaiModel, setOpenaiModel] = useState("gpt-4o");
  const [saved, setSaved] = useState(false);

  // 加载保存的设置
  useEffect(() => {
    chrome.storage.local.get(["settings", "engines"], (result) => {
      if (result.settings) {
        setSettings(result.settings);
      }
      if (result.engines?.deepl?.apiKey) {
        setDeeplKey(result.engines.deepl.apiKey);
      }
      if (result.engines?.openai?.apiKey) {
        setOpenaiKey(result.engines.openai.apiKey);
      }
      if (result.engines?.openai?.model) {
        setOpenaiModel(result.engines.openai.model);
      }
    });
  }, []);

  const handleSave = () => {
    chrome.storage.local.set({
      settings,
      engines: {
        deepl: { apiKey: deeplKey },
        openai: { apiKey: openaiKey, model: openaiModel },
      },
    }, () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  };

  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "24px 16px", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      <header style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, margin: "0 0 8px 0", color: "#1e293b" }}>扩展设置</h1>
        <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>配置翻译引擎和领域 Prompt</p>
      </header>

      {/* 翻译引擎配置 */}
      <section style={{ background: "#f8fafc", borderRadius: 12, padding: 24, marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 20px 0", color: "#1e293b", display: "flex", alignItems: "center", gap: 8 }}>
          <span>🌐</span> 翻译引擎
        </h2>

        {/* DeepL */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: "#475569", marginBottom: 6 }}>
            DeepL API Key
          </label>
          <input
            type="password"
            value={deeplKey}
            onChange={(e) => setDeeplKey(e.target.value)}
            placeholder="输入 DeepL API Key"
            style={{ width: "100%", padding: "10px 12px", fontSize: 14, border: "1px solid #e2e8f0", borderRadius: 6, boxSizing: "border-box" }}
          />
        </div>

        {/* OpenAI */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: "#475569", marginBottom: 6 }}>
            OpenAI API Key
          </label>
          <input
            type="password"
            value={openaiKey}
            onChange={(e) => setOpenaiKey(e.target.value)}
            placeholder="输入 OpenAI API Key"
            style={{ width: "100%", padding: "10px 12px", fontSize: 14, border: "1px solid #e2e8f0", borderRadius: 6, boxSizing: "border-box" }}
          />
        </div>

        {/* OpenAI Model */}
        <div>
          <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: "#475569", marginBottom: 6 }}>
            OpenAI 模型
          </label>
          <select
            value={openaiModel}
            onChange={(e) => setOpenaiModel(e.target.value)}
            style={{ width: "100%", padding: "10px 12px", fontSize: 14, border: "1px solid #e2e8f0", borderRadius: 6, boxSizing: "border-box", background: "white" }}
          >
            <option value="gpt-4o">GPT-4o</option>
            <option value="gpt-4o-mini">GPT-4o Mini</option>
            <option value="gpt-4-turbo">GPT-4 Turbo</option>
            <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
          </select>
        </div>
      </section>

      {/* 领域 Prompt 配置 */}
      <section style={{ background: "#f8fafc", borderRadius: 12, padding: 24, marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 20px 0", color: "#1e293b", display: "flex", alignItems: "center", gap: 8 }}>
          <span>📝</span> 领域 Prompt
        </h2>

        {/* 目标语言 */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: "#475569", marginBottom: 6 }}>
            目标语言
          </label>
          <select
            value={settings.targetLang}
            onChange={(e) => setSettings({ ...settings, targetLang: e.target.value })}
            style={{ width: "100%", padding: "10px 12px", fontSize: 14, border: "1px solid #e2e8f0", borderRadius: 6, boxSizing: "border-box", background: "white" }}
          >
            <option value="zh-CN">中文（简体）</option>
            <option value="zh-TW">中文（繁体）</option>
            <option value="en">英语</option>
            <option value="ja">日语</option>
            <option value="ko">韩语</option>
            <option value="fr">法语</option>
            <option value="de">德语</option>
            <option value="es">西班牙语</option>
          </select>
        </div>

        {/* 领域选择 */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: "#475569", marginBottom: 6 }}>
            翻译领域
          </label>
          <select
            value={settings.currentDomain}
            onChange={(e) => setSettings({ ...settings, currentDomain: e.target.value })}
            style={{ width: "100%", padding: "10px 12px", fontSize: 14, border: "1px solid #e2e8f0", borderRadius: 6, boxSizing: "border-box", background: "white" }}
          >
            <option value="">不使用领域 Prompt</option>
            {BUILTIN_DOMAINS.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        {/* 领域 Prompt 预览 */}
        {settings.currentDomain && (
          <div style={{ background: "#f1f5f9", borderRadius: 6, padding: 12 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#64748b", marginBottom: 4 }}>
              领域 Prompt 预览
            </label>
            <p style={{ margin: 0, fontSize: 13, color: "#475569", lineHeight: 1.5 }}>
              {BUILTIN_DOMAINS.find((d) => d.id === settings.currentDomain)?.prompt || ""}
            </p>
          </div>
        )}
      </section>

      {/* 保存按钮 */}
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <button
          onClick={handleSave}
          style={{
            padding: "12px 24px",
            fontSize: 15,
            fontWeight: 500,
            color: "white",
            background: "#7c3aed",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
          }}
        >
          保存设置
        </button>
        {saved && (
          <span style={{ color: "#16a34a", fontSize: 14 }}>✓ 保存成功</span>
        )}
      </div>

      <footer style={{ marginTop: 40, paddingTop: 20, borderTop: "1px solid #e2e8f0", color: "#94a3b8", fontSize: 12 }}>
        Web Page Translator v0.1.0
      </footer>
    </main>
  );
}
