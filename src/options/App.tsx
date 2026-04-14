import React, { useState, useEffect } from "react";
import { DEFAULT_SETTINGS, type Settings } from "../shared/storage-schema";
import { getSettings, saveSettings, getEngineConfig, saveEngineConfig } from "../background/config-store";

// 内置领域
const BUILTIN_DOMAINS = [
  { id: "it", name: "IT/技术", prompt: "你是专业 IT 技术文档翻译专家，保持术语一致并保留缩写。" },
  { id: "legal", name: "法律", prompt: "使用正式法律语言，保持条款与术语精确对应。" },
  { id: "medical", name: "医学", prompt: "使用规范医学术语，避免口语化表达。" },
  { id: "finance", name: "金融", prompt: "保留金融专有名词，强调数值与单位准确性。" },
  { id: "gaming", name: "游戏", prompt: "保留游戏语境和术语，语气自然且可读。" },
  { id: "literature", name: "文学", prompt: "优先保留文风和修辞，同时确保语义忠实。" },
];

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
  inputBg: "#F9FAFB",
  success: "#34D399",
  footer: "#9CA3AF",
};

export function OptionsApp() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [deeplKey, setDeeplKey] = useState("");
  const [deeplPlan, setDeeplPlan] = useState<"free" | "pro">("pro");
  const [openaiKey, setOpenaiKey] = useState("");
  const [openaiModel, setOpenaiModel] = useState("gpt-4o");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  // 加载保存的设置
  useEffect(() => {
    async function loadConfig() {
      setLoading(true);
      const [loadedSettings, deeplConfig, openaiConfig] = await Promise.all([
        getSettings(),
        getEngineConfig("deepl"),
        getEngineConfig("openai"),
      ]);
      setSettings(loadedSettings);
      if (deeplConfig.apiKey) setDeeplKey(deeplConfig.apiKey);
      if (deeplConfig.plan) setDeeplPlan(deeplConfig.plan as "free" | "pro");
      if (openaiConfig.apiKey) setOpenaiKey(openaiConfig.apiKey);
      if (openaiConfig.model) setOpenaiModel(openaiConfig.model);
      setLoading(false);
    }
    loadConfig();
  }, []);

  const handleSave = async () => {
    await Promise.all([
      saveSettings(settings),
      saveEngineConfig("deepl", { apiKey: deeplKey, plan: deeplPlan }),
      saveEngineConfig("openai", { apiKey: openaiKey, model: openaiModel }),
    ]);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const styles: Record<string, React.CSSProperties> = {
    container: {
      maxWidth: 640,
      margin: "0 auto",
      padding: "40px 24px",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      color: colors.text,
      background: colors.bg,
      minHeight: "100vh",
    },
    header: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 32,
      paddingBottom: 20,
      borderBottom: `1px solid ${colors.border}`,
    },
    headerLeft: {
      display: "flex",
      alignItems: "center",
      gap: 12,
    },
    logo: {
      width: 40,
      height: 40,
      borderRadius: 10,
    },
    title: {
      fontSize: 22,
      fontWeight: 700,
      margin: 0,
      color: colors.text,
    },
    subtitle: {
      fontSize: 13,
      color: colors.textSecondary,
      margin: "4px 0 0 0",
    },
    section: {
      marginBottom: 24,
      padding: 24,
      background: colors.card,
      borderRadius: 16,
      border: `1px solid ${colors.border}`,
      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: 600,
      margin: "0 0 20px 0",
      color: colors.text,
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
      color: colors.textSecondary,
      marginBottom: 6,
    },
    input: {
      width: "100%",
      padding: "12px 14px",
      fontSize: 14,
      border: `1px solid ${colors.border}`,
      borderRadius: 10,
      boxSizing: "border-box",
      outline: "none",
      background: colors.inputBg,
      transition: "border-color 0.2s, box-shadow 0.2s",
    },
    select: {
      width: "100%",
      padding: "12px 14px",
      fontSize: 14,
      border: `1px solid ${colors.border}`,
      borderRadius: 10,
      boxSizing: "border-box",
      background: colors.card,
      outline: "none",
      cursor: "pointer",
      transition: "border-color 0.2s",
    },
    promptBox: {
      marginTop: 12,
      padding: 14,
      background: colors.primaryLight,
      borderRadius: 10,
      border: `1px solid ${colors.primary}30`,
    },
    promptLabel: {
      fontSize: 11,
      fontWeight: 600,
      color: colors.primary,
      marginBottom: 6,
      textTransform: "uppercase" as const,
      letterSpacing: "0.5px",
    },
    promptText: {
      fontSize: 13,
      color: colors.text,
      lineHeight: 1.6,
      margin: 0,
    },
    actions: {
      display: "flex",
      alignItems: "center",
      gap: 16,
      marginTop: 28,
    },
    saveBtn: {
      padding: "14px 32px",
      fontSize: 15,
      fontWeight: 600,
      color: "#ffffff",
      background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryHover} 100%)`,
      border: "none",
      borderRadius: 10,
      cursor: "pointer",
      boxShadow: `0 2px 8px ${colors.primary}40`,
      transition: "transform 0.15s, box-shadow 0.15s",
    },
    successMsg: {
      fontSize: 14,
      color: colors.primary,
      display: "flex",
      alignItems: "center",
      gap: 6,
    },
    footer: {
      marginTop: 48,
      paddingTop: 24,
      borderTop: `1px solid ${colors.border}`,
      color: colors.footer,
      fontSize: 12,
      textAlign: "center" as const,
    },
  };

  return (
    <main style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <img src="../../public/icon-128.svg" alt="logo" style={styles.logo} />
          <div>
            <h1 style={styles.title}>Web Page Translator</h1>
            <p style={styles.subtitle}>配置翻译引擎和领域设置</p>
          </div>
        </div>
      </header>

      {/* 翻译引擎配置 */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="2" y1="12" x2="22" y2="12"/>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
          </svg>
          翻译引擎
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
          <label style={styles.label}>DeepL Plan</label>
          <select
            value={deeplPlan}
            onChange={(e) => setDeeplPlan(e.target.value as "free" | "pro")}
            style={styles.select}
          >
            <option value="pro">Pro</option>
            <option value="free">Free</option>
          </select>
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

      {/* 翻译设置 */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
            <polyline points="14,2 14,8 20,8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <line x1="10" y1="9" x2="8" y2="9"/>
          </svg>
          领域 Prompt
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
        <button onClick={handleSave} disabled={loading} style={styles.saveBtn}>
          保存设置
        </button>
        {saved && (
          <span style={styles.successMsg}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20,6 9,17 4,12"/>
            </svg>
            保存成功
          </span>
        )}
      </div>

      <footer style={styles.footer}>
        Web Page Translator v0.1.0
      </footer>
    </main>
  );
}
