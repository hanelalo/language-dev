import { defineManifest } from "@crxjs/vite-plugin";

export default defineManifest({
  manifest_version: 3,
  name: "Web Page Translator",
  version: "0.1.0",
  permissions: ["storage", "activeTab", "scripting"],
  host_permissions: ["<all_urls>"],
  icons: {
    "16": "icon-16.png",
    "48": "icon-48.png",
    "128": "icon-128.png"
  },
  action: { default_popup: "src/popup/index.html" },
  background: { service_worker: "src/background/index.ts", type: "module" },
  content_scripts: [
    {
      matches: ["<all_urls>"],
      js: ["src/content/index.ts"],
      run_at: "document_idle"
    }
  ],
  options_ui: {
    page: "src/options/index.html",
    open_in_tab: true
  },
  web_accessible_resources: [
    {
      resources: ["icon-48.png"],
      matches: ["<all_urls>"]
    }
  ]
});
