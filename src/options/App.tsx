import React, { useState, useEffect } from "react";
import { DEFAULT_SETTINGS, type Settings } from "../shared/storage-schema";
import { getSettings, saveSettings, getEngineConfig, saveEngineConfig, getCustomApis, saveCustomApi, deleteCustomApi, getDomains, saveDomain, deleteDomain, type CustomLLMConfig, type Domain } from "../background/config-store";
import { BUILTIN_DOMAINS } from "../background/config-store";

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
  const [customApis, setCustomApis] = useState<CustomLLMConfig[]>([]);
  const [editingApi, setEditingApi] = useState<CustomLLMConfig | null>(null);
  const [showApiDialog, setShowApiDialog] = useState(false);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [editingDomain, setEditingDomain] = useState<Domain | null>(null);
  const [showDomainDialog, setShowDomainDialog] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  // 加载保存的设置
  useEffect(() => {
    async function loadConfig() {
      setLoading(true);
      const [loadedSettings, deeplConfig, openaiConfig, loadedCustomApis, loadedDomains] = await Promise.all([
        getSettings(),
        getEngineConfig("deepl"),
        getEngineConfig("openai"),
        getCustomApis(),
        getDomains(),
      ]);
      setSettings(loadedSettings);
      if (deeplConfig.apiKey) setDeeplKey(deeplConfig.apiKey);
      if (deeplConfig.plan) setDeeplPlan(deeplConfig.plan as "free" | "pro");
      if (openaiConfig.apiKey) setOpenaiKey(openaiConfig.apiKey);
      if (openaiConfig.model) setOpenaiModel(openaiConfig.model);
      setCustomApis(loadedCustomApis);
      setDomains(loadedDomains.length > 0 ? loadedDomains : BUILTIN_DOMAINS);
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

  const handleSaveApi = async () => {
    if (!editingApi) return;
    await saveCustomApi(editingApi);
    const updated = await getCustomApis();
    setCustomApis(updated);
    setShowApiDialog(false);
    setEditingApi(null);
  };

  const handleDeleteApi = async (name: string) => {
    await deleteCustomApi(name);
    const updated = await getCustomApis();
    setCustomApis(updated);
  };

  const openAddApi = () => {
    setEditingApi({ name: "", apiKey: "", baseUrl: "", model: "gpt-4o" });
    setShowApiDialog(true);
  };

  const openEditApi = (api: CustomLLMConfig) => {
    setEditingApi({ ...api });
    setShowApiDialog(true);
  };

  const handleSaveDomain = async () => {
    if (!editingDomain) return;
    await saveDomain(editingDomain);
    const updated = await getDomains();
    setDomains(updated);
    setShowDomainDialog(false);
    setEditingDomain(null);
  };

  const handleDeleteDomain = async (id: string) => {
    await deleteDomain(id);
    const updated = await getDomains();
    setDomains(updated);
  };

  const openAddDomain = () => {
    setEditingDomain({ id: `custom-${Date.now()}`, name: "", prompt: "" });
    setShowDomainDialog(true);
  };

  const openEditDomain = (domain: Domain) => {
    setEditingDomain({ ...domain });
    setShowDomainDialog(true);
  };

  const allDomains = [...BUILTIN_DOMAINS, ...domains.filter(d => !d.builtin)];

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

        <div style={{ ...styles.field, marginTop: 24, paddingTop: 16, borderTop: `1px dashed ${colors.border}` }}>
          <label style={{ ...styles.label, color: colors.primary, fontWeight: 600 }}>自定义 LLM API（OpenAI 兼容）</label>
        </div>

        {customApis.length > 0 && (
          <div style={styles.field}>
            {customApis.map((api) => (
              <div key={api.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${colors.border}` }}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>{api.name}</div>
                  <div style={{ fontSize: 12, color: colors.textSecondary }}>{api.baseUrl} · {api.model}</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => openEditApi(api)}
                    style={{ padding: "6px 12px", fontSize: 12, cursor: "pointer", background: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: 6 }}
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => handleDeleteApi(api.name)}
                    style={{ padding: "6px 12px", fontSize: 12, cursor: "pointer", background: "#FEE2E2", border: "1px solid #FECACA", borderRadius: 6, color: "#DC2626" }}
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={openAddApi}
          style={{ marginTop: 12, padding: "10px 16px", fontSize: 13, cursor: "pointer", background: colors.primaryLight, border: `1px solid ${colors.primary}40`, borderRadius: 8, color: colors.primary, fontWeight: 500 }}
        >
          + 添加自定义 API
        </button>
      </section>

      {/* 自定义 API 编辑弹窗 */}
      {showApiDialog && editingApi && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: colors.card, borderRadius: 16, padding: 24, width: 400, maxWidth: "90vw", boxShadow: "0 4px 24px rgba(0,0,0,0.15)" }}>
            <h3 style={{ margin: "0 0 20px 0", fontSize: 16, fontWeight: 600 }}>{editingApi.name ? "编辑自定义 API" : "添加自定义 API"}</h3>
            <div style={styles.field}>
              <label style={styles.label}>名称</label>
              <input
                type="text"
                value={editingApi.name}
                onChange={(e) => setEditingApi({ ...editingApi, name: e.target.value })}
                placeholder="例如：My Claude"
                style={styles.input}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>API 地址</label>
              <input
                type="text"
                value={editingApi.baseUrl}
                onChange={(e) => setEditingApi({ ...editingApi, baseUrl: e.target.value })}
                placeholder="https://api.example.com/v1"
                style={styles.input}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>API Key</label>
              <input
                type="password"
                value={editingApi.apiKey}
                onChange={(e) => setEditingApi({ ...editingApi, apiKey: e.target.value })}
                placeholder="输入 API Key"
                style={styles.input}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>模型</label>
              <input
                type="text"
                value={editingApi.model}
                onChange={(e) => setEditingApi({ ...editingApi, model: e.target.value })}
                placeholder="gpt-4o / claude-3-5-sonnet-latest 等"
                style={styles.input}
              />
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
              <button
                onClick={() => { setShowApiDialog(false); setEditingApi(null); }}
                style={{ flex: 1, padding: "12px", fontSize: 14, cursor: "pointer", background: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: 8 }}
              >
                取消
              </button>
              <button
                onClick={handleSaveApi}
                disabled={!editingApi.name || !editingApi.baseUrl}
                style={{ flex: 1, padding: "12px", fontSize: 14, cursor: editingApi.name && editingApi.baseUrl ? "pointer" : "not-allowed", background: editingApi.name && editingApi.baseUrl ? colors.primary : colors.border, border: "none", borderRadius: 8, color: editingApi.name && editingApi.baseUrl ? "#fff" : colors.textSecondary }}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

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
          翻译设置
        </h2>

        <div style={styles.field}>
          <label style={styles.label}>默认引擎</label>
          <select
            value={settings.defaultEngine}
            onChange={(e) => setSettings({ ...settings, defaultEngine: e.target.value })}
            style={styles.select}
          >
            <option value="deepl">DeepL</option>
            <option value="openai">OpenAI</option>
            {customApis.map((api) => (
              <option key={api.name} value={`custom-llm-${api.name}`}>{api.name}</option>
            ))}
          </select>
        </div>

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
            {allDomains.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        {settings.currentDomain && (
          <div style={styles.promptBox}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <p style={styles.promptLabel}>领域 Prompt 预览</p>
              <button
                onClick={() => openEditDomain(allDomains.find(d => d.id === settings.currentDomain)!)}
                style={{ padding: "4px 10px", fontSize: 11, cursor: "pointer", background: colors.card, border: `1px solid ${colors.primary}40`, borderRadius: 4, color: colors.primary }}
              >
                编辑
              </button>
            </div>
            <p style={styles.promptText}>
              {allDomains.find((d) => d.id === settings.currentDomain)?.prompt || ""}
            </p>
          </div>
        )}

        <div style={{ marginTop: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <label style={styles.label}>系统提示词模板</label>
            <span style={{ fontSize: 11, color: colors.textSecondary }}>支持 {"{{target_lang}}"}, {"{{source_lang}}"}</span>
          </div>
          <textarea
            value={settings.systemPrompt || ""}
            onChange={(e) => setSettings({ ...settings, systemPrompt: e.target.value })}
            placeholder={"You are a professional translator. Translate the following text to {{target_lang}}.\n\nRequirements:\n- Maintain the original tone and style\n- Preserve technical terms and abbreviations"}
            style={{ ...styles.input, minHeight: 100, resize: "vertical" as const }}
          />
          <p style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4 }}>
            {settings.systemPrompt ? "已设置自定义提示词模板" : "使用默认提示词模板"}
          </p>
        </div>

        <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px dashed ${colors.border}` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <label style={{ ...styles.label, marginBottom: 0, color: colors.primary, fontWeight: 600 }}>领域管理</label>
            <button
              onClick={openAddDomain}
              style={{ padding: "6px 12px", fontSize: 12, cursor: "pointer", background: colors.primaryLight, border: `1px solid ${colors.primary}40`, borderRadius: 6, color: colors.primary, fontWeight: 500 }}
            >
              + 添加领域
            </button>
          </div>
          {allDomains.map((domain) => (
            <div key={domain.id} style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${colors.border}` }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, fontSize: 14 }}>{domain.name}{domain.builtin && " ★"}</div>
                <div style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>{domain.prompt.substring(0, 60)}{domain.prompt.length > 60 ? "..." : ""}</div>
              </div>
              <div style={{ display: "flex", gap: 8, marginLeft: 12 }}>
                <button
                  onClick={() => openEditDomain(domain)}
                  style={{ padding: "6px 12px", fontSize: 12, cursor: "pointer", background: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: 6 }}
                >
                  编辑
                </button>
                {!domain.builtin && (
                  <button
                    onClick={() => handleDeleteDomain(domain.id)}
                    style={{ padding: "6px 12px", fontSize: 12, cursor: "pointer", background: "#FEE2E2", border: "1px solid #FECACA", borderRadius: 6, color: "#DC2626" }}
                  >
                    删除
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 领域编辑弹窗 */}
      {showDomainDialog && editingDomain && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: colors.card, borderRadius: 16, padding: 24, width: 480, maxWidth: "90vw", boxShadow: "0 4px 24px rgba(0,0,0,0.15)" }}>
            <h3 style={{ margin: "0 0 20px 0", fontSize: 16, fontWeight: 600 }}>{editingDomain.name ? "编辑领域" : "添加领域"}</h3>
            <div style={styles.field}>
              <label style={styles.label}>领域名称</label>
              <input
                type="text"
                value={editingDomain.name}
                onChange={(e) => setEditingDomain({ ...editingDomain, name: e.target.value })}
                placeholder="例如：IT/技术"
                style={styles.input}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>系统提示词</label>
              <textarea
                value={editingDomain.prompt}
                onChange={(e) => setEditingDomain({ ...editingDomain, prompt: e.target.value })}
                placeholder="输入领域专用的系统提示词，用于指导翻译风格和术语..."
                style={{ ...styles.input, minHeight: 120, resize: "vertical" as const }}
              />
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
              <button
                onClick={() => { setShowDomainDialog(false); setEditingDomain(null); }}
                style={{ flex: 1, padding: "12px", fontSize: 14, cursor: "pointer", background: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: 8 }}
              >
                取消
              </button>
              <button
                onClick={handleSaveDomain}
                disabled={!editingDomain.name || !editingDomain.prompt}
                style={{ flex: 1, padding: "12px", fontSize: 14, cursor: editingDomain.name && editingDomain.prompt ? "pointer" : "not-allowed", background: editingDomain.name && editingDomain.prompt ? colors.primary : colors.border, border: "none", borderRadius: 8, color: editingDomain.name && editingDomain.prompt ? "#fff" : colors.textSecondary }}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

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
