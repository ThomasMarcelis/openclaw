export type ProviderTheme = {
  name: string;
  accent: string;
  bg: string;
  text: string;
  border: string;
  glow: string;
  badge: string;
};

const PROVIDER_THEMES: Record<string, ProviderTheme> = {
  anthropic: {
    name: "Anthropic",
    accent: "#f97316",
    bg: "#f9731610",
    text: "#fb923c",
    border: "#f9731630",
    glow: "#f9731618",
    badge: "#f9731620",
  },
  openai: {
    name: "OpenAI",
    accent: "#10b981",
    bg: "#10b98110",
    text: "#34d399",
    border: "#10b98130",
    glow: "#10b98118",
    badge: "#10b98120",
  },
  google: {
    name: "Google",
    accent: "#3b82f6",
    bg: "#3b82f610",
    text: "#60a5fa",
    border: "#3b82f630",
    glow: "#3b82f618",
    badge: "#3b82f620",
  },
  venice: {
    name: "Venice",
    accent: "#8b5cf6",
    bg: "#8b5cf610",
    text: "#a78bfa",
    border: "#8b5cf630",
    glow: "#8b5cf618",
    badge: "#8b5cf620",
  },
  openrouter: {
    name: "OpenRouter",
    accent: "#ec4899",
    bg: "#ec489910",
    text: "#f472b6",
    border: "#ec489930",
    glow: "#ec489918",
    badge: "#ec489920",
  },
};

const DEFAULT_THEME: ProviderTheme = {
  name: "Default",
  accent: "#6b7280",
  bg: "#6b728010",
  text: "#9ca3af",
  border: "#6b728030",
  glow: "#6b728018",
  badge: "#6b728020",
};

/** Detect model provider from model name string. */
export function detectProvider(model?: string): string {
  if (!model) {
    return "default";
  }
  const m = model.toLowerCase();
  if (m.includes("claude") || m.includes("anthropic")) {
    return "anthropic";
  }
  if (m.includes("gpt") || m.includes("o1") || m.includes("o3") || m.includes("openai")) {
    return "openai";
  }
  if (m.includes("gemini") || m.includes("google")) {
    return "google";
  }
  if (m.includes("venice")) {
    return "venice";
  }
  if (m.includes("openrouter") || m.includes("or/")) {
    return "openrouter";
  }
  return "default";
}

export function getProviderTheme(model?: string): ProviderTheme {
  const key = detectProvider(model);
  return PROVIDER_THEMES[key] ?? DEFAULT_THEME;
}

/** Short display label for a model name (e.g. "claude-sonnet" -> "Sonnet"). */
export function modelTag(model?: string): string {
  if (!model) {
    return "";
  }
  const parts = model.split(/[-/]/);
  const last = parts[parts.length - 1];
  if (!last) {
    return model;
  }
  return last.charAt(0).toUpperCase() + last.slice(1);
}
