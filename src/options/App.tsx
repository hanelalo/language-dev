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

  const styles: Record<string, React.CSSProperties> = {
    container: {
      maxWidth: 720,
      margin: "0 auto",
      padding: "32px 24px",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      color: "#334155",
      background: "#ffffff",
    },
    header: {
      marginBottom: 32,
      paddingBottom: 20,
      borderBottom: "1px solid #e2e8f0",
    },
    title: {
      fontSize: 24,
      fontWeight: 700,
      margin: "0 0 6px 0",
      color: "#0f172a",
    },
    subtitle: {
      fontSize: 14,
      color: "#64748b",
      margin: 0,
    },
    section: {
      marginBottom: 28,
      padding: 20,
      background: "#f8fafc",
      borderRadius: 12,
      border: "1px solid #e2e8f0",
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: 600,
      margin: "0 0 16px 0",
      color: "#1e293b",
      display: "flex",
      alignItems: "center",
      gap: 8,
    },
    field: {
      marginBottom: 16,
    },
    label: {
      display: "block",
      fontSize: 13,
      fontWeight: 500,
      color: "#475569",
      marginBottom: 6,
    },
    input: {
      width: "100%",
      padding: "10px 12px",
      fontSize: 14,
      border: "1px solid #cbd5e1",
      borderRadius: 6,
      boxSizing: "border-box",
      outline: "none",
    },
    select: {
      width: "100%",
      padding: "10px 12px",
      fontSize: 14,
      border: "1px solid #cbd5e1",
      borderRadius: 6,
      boxSizing: "border-box",
      background: "#ffffff",
      outline: "none",
    },
    promptBox: {
      marginTop: 12,
      padding: 12,
      background: "#f1f5f9",
      borderRadius: 6,
      border: "1px solid #e2e8f0",
    },
    promptLabel: {
      fontSize: 11,
      fontWeight: 500,
      color: "#94a3b8",
      marginBottom: 4,
      textTransform: "uppercase" as const,
      letterSpacing: "0.5px",
    },
    promptText: {
      fontSize: 13,
      color: "#475569",
      lineHeight: 1.6,
      margin: 0,
    },
    actions: {
      display: "flex",
      alignItems: "center",
      gap: 16,
      marginTop: 24,
    },
    saveBtn: {
      padding: "12px 28px",
      fontSize: 14,
      fontWeight: 600,
      color: "#ffffff",
      background: "#7c3aed",
      border: "none",
      borderRadius: 6,
      cursor: "pointer",
    },
    successMsg: {
      fontSize: 14,
      color: "#16a34a",
    },
    footer: {
      marginTop: 40,
      paddingTop: 20,
      borderTop: "1px solid #e2e8f0",
      color: "#94a3b8",
      fontSize: 12,
      textAlign: "center" as const,
    },
  };

  return (
    <main style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>扩展设置</h1>
        <p style={styles.subtitle}>配置翻译引擎和领域 Prompt</p>
      </header>

      {/* 翻译引擎配置 */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>
          <span>🌐</span> 翻译引擎
        </h2>

        <div style={styles.field}>
          <label style={styles.label}>DeepL API Key</label>
          <input
            type="password"
            value={deeplKey}
            onChange={(e) => setDeeplKey(e.target.value)}
            placeholder="输入 DeepL API Key"
            style={styles.input}
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>OpenAI API Key</label>
          <input
            type="password"
            value={openaiKey}
            onChange={(e) => setOpenaiKey(e.target.value)}
            placeholder="输入 OpenAI API Key"
            style={styles.input}
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>OpenAI 模型</label>
          <select
            value={openaiModel}
            onChange={(e) => setOpenaiModel(e.target.value)}
            style={styles.select}
          >
            <option value="gpt-4o">GPT-4o</option>
            <option value="gpt-4o-mini">GPT-4o Mini</option>
            <option value="gpt-4-turbo">GPT-4 Turbo</option>
            <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
          </select>
        </div>
      </section>

      {/* 领域 Prompt 配置 */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>
          <span>📝</span> 领域 Prompt
        </h2>

        <div style={styles.field}>
          <label style={styles.label}>目标语言</label>
          <select
            value={settings.targetLang}
            onChange={(e) => setSettings({ ...settings, targetLang: e.target.value })}
            style={styles.select}
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

        <div style={styles.field}>
          <label style={styles.label}>翻译领域</label>
          <select
            value={settings.currentDomain}
            onChange={(e) => setSettings({ ...settings, currentDomain: e.target.value })}
            style={styles.select}
          >
            <option value="">不使用领域 Prompt</option>
            {BUILTIN_DOMAINS.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        {settings.currentDomain && (
          <div style={styles.promptBox}>
            <p style={styles.promptLabel}>领域 Prompt 预览</p>
            <p style={styles.promptText}>
              {BUILTIN_DOMAINS.find((d) => d.id === settings.currentDomain)?.prompt || ""}
            </p>
          </div>
        )}
      </section>

      {/* 保存按钮 */}
      <div style={styles.actions}>
        <button onClick={handleSave} style={styles.saveBtn}>
          保存设置
        </button>
        {saved && <span style={styles.successMsg}>✓ 保存成功</span>}
      </div>

      <footer style={styles.footer}>
        Web Page Translator v0.1.0
      </footer>
    </main>
  );
}
