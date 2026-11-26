import { quotaManager } from "./quota";
import { GeminiService, TranslationResult, translateBatchGoogle, translateTextGoogle } from "./gemini";
import {
  TranslationSettings,
  DEFAULT_TRANSLATION_SETTINGS,
  buildTranslationSystemInstruction,
} from "./translationSettings";
import type { GoogleRoutingMode } from "./appPreferences";
import { stripFormatting } from "../utils/subtitleFormatter";

export type AiProviderId =
  | "gemini"
  | "openai"
  | "anthropic"
  | "deepseek"
  | "groq"
  | "openrouter"
  | "google-cloud"
  | "custom";

export type AiProtocol =
  | "gemini"
  | "openai-compatible"
  | "anthropic"
  | "google-translate";

export interface SourceLanguageOption {
  code: string;
  name: string;
}

export const SOURCE_LANGUAGES: SourceLanguageOption[] = [
  { code: "auto", name: "Auto-Detect" },
  { code: "en", name: "English" },
  { code: "tr", name: "Turkish (Türkçe)" },
  { code: "ko", name: "Korean (한국어)" },
  { code: "hi", name: "Hindi (हिन्दी)" },
  { code: "ar", name: "Arabic (العربية)" },
  { code: "ja", name: "Japanese (日本語)" },
  { code: "es", name: "Spanish (Español)" },
  { code: "fa", name: "Persian (فارسی)" },
  { code: "zh", name: "Chinese (中文)" },
  { code: "fr", name: "French (Français)" },
];

export const GOOGLE_ROUTING_MODES: { id: GoogleRoutingMode; label: string }[] = [
  { id: "hybrid", label: "Hybrid (Cloud API + Web Fallback)" },
  { id: "web", label: "Web Endpoint Only (Free)" },
  { id: "cloud", label: "Google Cloud API Only" },
];

export interface AiProviderTutorial {
  title: string;
  steps: string[];
  note?: string;
}

export interface AiModelCatalogEntry {
  id: string;
  name: string;
  provider: AiProviderId;
  providerLabel: string;
  protocol: AiProtocol;
  endpointUrl: string;
  apiKeyUrl: string;
  apiKeyPortalLabel: string;
  keyPlaceholder: string;
  supportsServerProxy?: boolean;
  requiresKey: boolean;
  summary: string;
  tutorial: AiProviderTutorial;
}

export interface CustomAiModelConfig {
  id: string;
  name: string;
  protocol: "openai-compatible" | "gemini" | "anthropic";
  baseUrl: string;
  modelId: string;
  apiKeyUrl?: string;
  createdAt: number;
}

const GEMINI_TUTORIAL: AiProviderTutorial = {
  title: "How to get a Google Gemini API key",
  steps: [
    "Tap the 'Get Gemini Key' link above to open Google AI Studio in your browser.",
    "Sign in with your Google account and tap 'Create API key'.",
    "Select an existing Google Cloud project (or create a new free-tier project).",
    "Copy the generated key starting with 'AIza...' and paste it into the API Key field above.",
    "Tap 'Connect' to verify. Once saved, it stays encrypted in local device storage and works standalone in mobile APKs.",
  ],
  note: "When left blank in web preview mode, Gemini uses the built-in app proxy if configured.",
};

const OPENAI_TUTORIAL: AiProviderTutorial = {
  title: "How to get an OpenAI API key",
  steps: [
    "Open the OpenAI API Keys portal using the 'Get OpenAI Key' link above.",
    "Sign in to your OpenAI Platform account and verify billing/credits if required.",
    "Click '+ Create new secret key', give it a name (e.g. 'Urdu Subtitles'), and copy the 'sk-...' key.",
    "Paste the key above and tap 'Connect' to verify access to GPT-4o / GPT-4.1 models.",
  ],
  note: "OpenAI keys begin with 'sk-' or 'sk-proj-'. Keep your key private.",
};

const ANTHROPIC_TUTORIAL: AiProviderTutorial = {
  title: "How to get an Anthropic Claude API key",
  steps: [
    "Tap 'Get Anthropic Key' above to open the Anthropic Console.",
    "Log in and navigate to Settings -> API Keys -> 'Create Key'.",
    "Copy the key starting with 'sk-ant-...' immediately (it is only shown once).",
    "Paste it above and tap 'Connect'. Direct browser access headers are enabled automatically.",
  ],
  note: "Claude Sonnet 4 and Haiku 3.5 excel at nuanced literary Urdu & emotional dialogue.",
};

const DEEPSEEK_TUTORIAL: AiProviderTutorial = {
  title: "How to get a DeepSeek API key",
  steps: [
    "Tap 'Get DeepSeek Key' above to visit platform.deepseek.com.",
    "Sign in and go to 'API Keys' in the left sidebar.",
    "Click 'Create new API key', enter a label, and copy the generated 'sk-...' key.",
    "Paste it above and tap 'Connect' to test DeepSeek Chat or Reasoner.",
  ],
  note: "DeepSeek uses OpenAI-compatible JSON format and offers very high token efficiency for long series.",
};

const GROQ_TUTORIAL: AiProviderTutorial = {
  title: "How to get a Groq API key",
  steps: [
    "Tap 'Get Groq Key' above to open GroqCloud Console.",
    "Sign in (free tier available) and open 'API Keys'.",
    "Tap 'Create API Key', enter a name, and copy the key starting with 'gsk_...'.",
    "Paste it above and tap 'Connect' for ultra-fast Llama 3.3 70B subtitle batches.",
  ],
  note: "Groq free tier has strict tokens-per-minute limits—lower Batch Size to 8–10 if rate-limited.",
};

const OPENROUTER_TUTORIAL: AiProviderTutorial = {
  title: "How to get an OpenRouter API key",
  steps: [
    "Tap 'Get OpenRouter Key' above to visit openrouter.ai/keys.",
    "Sign in and click 'Create Key' to generate an 'sk-or-...' key.",
    "Paste the key above and tap 'Connect'. You can use OpenRouter Auto or Llama 3.3 70B, or add any OpenRouter model slug as a Custom Model.",
  ],
  note: "OpenRouter gives single-key access to hundreds of models (free & paid) via OpenAI-compatible API.",
};

const GOOGLE_CLOUD_TUTORIAL: AiProviderTutorial = {
  title: "How to get a Google Cloud Translation API key",
  steps: [
    "Leave the key empty to use the Free Web endpoint (works immediately with no billing).",
    "For official high-volume Cloud Translation v2: open 'Get Cloud Key' above.",
    "Enable 'Cloud Translation API' inside your Google Cloud project.",
    "Go to Credentials -> '+ Create Credentials' -> 'API Key', copy the 'AIza...' key, and paste it above.",
  ],
  note: "Switch Google Routing Mode below between Hybrid, Free Web Only, or Cloud API Only.",
};

export const CUSTOM_MODEL_TUTORIAL: AiProviderTutorial = {
  title: "How to connect a Custom AI Model API",
  steps: [
    "Tap '+ Add Custom Model' and give your preset a short name (e.g. 'Together Llama', 'Mistral', or 'Local Ollama').",
    "Choose the API Protocol: most providers (Together, Fireworks, Mistral, Perplexity, xAI, Ollama, LM Studio) use 'OpenAI-Compatible'.",
    "Enter the HTTPS Base URL (for example: 'https://api.together.xyz/v1' or 'https://api.mistral.ai/v1'). You can omit '/chat/completions' and it will be appended automatically.",
    "Enter the exact Model ID expected by that API (e.g. 'mistral-large-latest' or 'meta-llama/Llama-3.3-70B-Instruct-Turbo').",
    "Paste your provider's API Key in the API Key field (leave blank for keyless local servers) and tap 'Connect' to verify.",
  ],
  note: "On Android APKs and HTTPS web apps, remote custom endpoints should use HTTPS with CORS enabled.",
};

export const AI_MODEL_CATALOG: AiModelCatalogEntry[] = [
  // Google Gemini
  {
    id: "gemini-4-hydrogen",
    name: "Gemini 4 Hydrogen / Flash",
    provider: "gemini",
    providerLabel: "Google Gemini",
    protocol: "gemini",
    endpointUrl: "https://generativelanguage.googleapis.com/v1beta",
    apiKeyUrl: "https://aistudio.google.com/apikey",
    apiKeyPortalLabel: "Get Gemini Key",
    keyPlaceholder: "AIza... (optional if server proxy active)",
    supportsServerProxy: true,
    requiresKey: false,
    summary: "Fast everyday dubbing & search-grounded titles",
    tutorial: GEMINI_TUTORIAL,
  },
  {
    id: "gemini-3.1-flash-lite",
    name: "Gemini 3.1 Flash Lite",
    provider: "gemini",
    providerLabel: "Google Gemini",
    protocol: "gemini",
    endpointUrl: "https://generativelanguage.googleapis.com/v1beta",
    apiKeyUrl: "https://aistudio.google.com/apikey",
    apiKeyPortalLabel: "Get Gemini Key",
    keyPlaceholder: "AIza... (optional if server proxy active)",
    supportsServerProxy: true,
    requiresKey: false,
    summary: "Lightweight high-throughput batch translation",
    tutorial: GEMINI_TUTORIAL,
  },
  {
    id: "gemini-4-neon",
    name: "Gemini 4 Neon / Pro",
    provider: "gemini",
    providerLabel: "Google Gemini",
    protocol: "gemini",
    endpointUrl: "https://generativelanguage.googleapis.com/v1beta",
    apiKeyUrl: "https://aistudio.google.com/apikey",
    apiKeyPortalLabel: "Get Gemini Key",
    keyPlaceholder: "AIza... (optional if server proxy active)",
    supportsServerProxy: true,
    requiresKey: false,
    summary: "Balanced literary nuance & cultural idioms",
    tutorial: GEMINI_TUTORIAL,
  },
  {
    id: "gemini-4-carbon",
    name: "Gemini 4 Carbon",
    provider: "gemini",
    providerLabel: "Google Gemini",
    protocol: "gemini",
    endpointUrl: "https://generativelanguage.googleapis.com/v1beta",
    apiKeyUrl: "https://aistudio.google.com/apikey",
    apiKeyPortalLabel: "Get Gemini Key",
    keyPlaceholder: "AIza... (optional if server proxy active)",
    supportsServerProxy: true,
    requiresKey: false,
    summary: "Deep drama dialogue & strict honorific consistency",
    tutorial: GEMINI_TUTORIAL,
  },
  {
    id: "gemini-3.1-pro-preview",
    name: "Gemini 3.1 Pro Preview",
    provider: "gemini",
    providerLabel: "Google Gemini",
    protocol: "gemini",
    endpointUrl: "https://generativelanguage.googleapis.com/v1beta",
    apiKeyUrl: "https://aistudio.google.com/apikey",
    apiKeyPortalLabel: "Get Gemini Key",
    keyPlaceholder: "AIza... (optional if server proxy active)",
    supportsServerProxy: true,
    requiresKey: false,
    summary: "Preview flagship reasoning model",
    tutorial: GEMINI_TUTORIAL,
  },

  // OpenAI
  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    provider: "openai",
    providerLabel: "OpenAI",
    protocol: "openai-compatible",
    endpointUrl: "https://api.openai.com/v1/chat/completions",
    apiKeyUrl: "https://platform.openai.com/api-keys",
    apiKeyPortalLabel: "Get OpenAI Key",
    keyPlaceholder: "sk-proj-...",
    requiresKey: true,
    summary: "Fast, cost-effective OpenAI subtitle translation",
    tutorial: OPENAI_TUTORIAL,
  },
  {
    id: "gpt-4o",
    name: "GPT-4o",
    provider: "openai",
    providerLabel: "OpenAI",
    protocol: "openai-compatible",
    endpointUrl: "https://api.openai.com/v1/chat/completions",
    apiKeyUrl: "https://platform.openai.com/api-keys",
    apiKeyPortalLabel: "Get OpenAI Key",
    keyPlaceholder: "sk-proj-...",
    requiresKey: true,
    summary: "High-accuracy multimodal & idiomatic Urdu phrasing",
    tutorial: OPENAI_TUTORIAL,
  },
  {
    id: "gpt-4.1-mini",
    name: "GPT-4.1 Mini",
    provider: "openai",
    providerLabel: "OpenAI",
    protocol: "openai-compatible",
    endpointUrl: "https://api.openai.com/v1/chat/completions",
    apiKeyUrl: "https://platform.openai.com/api-keys",
    apiKeyPortalLabel: "Get OpenAI Key",
    keyPlaceholder: "sk-proj-...",
    requiresKey: true,
    summary: "Strong instruction-following for bilingual formats",
    tutorial: OPENAI_TUTORIAL,
  },

  // Anthropic Claude
  {
    id: "claude-3-5-haiku-latest",
    name: "Claude 3.5 Haiku",
    provider: "anthropic",
    providerLabel: "Anthropic Claude",
    protocol: "anthropic",
    endpointUrl: "https://api.anthropic.com/v1/messages",
    apiKeyUrl: "https://console.anthropic.com/settings/keys",
    apiKeyPortalLabel: "Get Anthropic Key",
    keyPlaceholder: "sk-ant-...",
    requiresKey: true,
    summary: "Crisp, fast dialogue localization",
    tutorial: ANTHROPIC_TUTORIAL,
  },
  {
    id: "claude-sonnet-4-20250514",
    name: "Claude Sonnet 4",
    provider: "anthropic",
    providerLabel: "Anthropic Claude",
    protocol: "anthropic",
    endpointUrl: "https://api.anthropic.com/v1/messages",
    apiKeyUrl: "https://console.anthropic.com/settings/keys",
    apiKeyPortalLabel: "Get Anthropic Key",
    keyPlaceholder: "sk-ant-...",
    requiresKey: true,
    summary: "Rich literary prose, cinema drama & humor nuance",
    tutorial: ANTHROPIC_TUTORIAL,
  },

  // DeepSeek
  {
    id: "deepseek-chat",
    name: "DeepSeek V3 Chat",
    provider: "deepseek",
    providerLabel: "DeepSeek",
    protocol: "openai-compatible",
    endpointUrl: "https://api.deepseek.com/v1/chat/completions",
    apiKeyUrl: "https://platform.deepseek.com/api_keys",
    apiKeyPortalLabel: "Get DeepSeek Key",
    keyPlaceholder: "sk-...",
    requiresKey: true,
    summary: "High-speed budget-friendly translation batches",
    tutorial: DEEPSEEK_TUTORIAL,
  },
  {
    id: "deepseek-reasoner",
    name: "DeepSeek R1 Reasoner",
    provider: "deepseek",
    providerLabel: "DeepSeek",
    protocol: "openai-compatible",
    endpointUrl: "https://api.deepseek.com/v1/chat/completions",
    apiKeyUrl: "https://platform.deepseek.com/api_keys",
    apiKeyPortalLabel: "Get DeepSeek Key",
    keyPlaceholder: "sk-...",
    requiresKey: true,
    summary: "Deep contextual reasoning for complex idioms",
    tutorial: DEEPSEEK_TUTORIAL,
  },

  // Groq
  {
    id: "llama-3.3-70b-versatile",
    name: "Llama 3.3 70B (Groq)",
    provider: "groq",
    providerLabel: "GroqCloud",
    protocol: "openai-compatible",
    endpointUrl: "https://api.groq.com/openai/v1/chat/completions",
    apiKeyUrl: "https://console.groq.com/keys",
    apiKeyPortalLabel: "Get Groq Key",
    keyPlaceholder: "gsk_...",
    requiresKey: true,
    summary: "Ultra-fast LPU inference with free tier option",
    tutorial: GROQ_TUTORIAL,
  },
  {
    id: "llama-3.1-8b-instant",
    name: "Llama 3.1 8B Instant (Groq)",
    provider: "groq",
    providerLabel: "GroqCloud",
    protocol: "openai-compatible",
    endpointUrl: "https://api.groq.com/openai/v1/chat/completions",
    apiKeyUrl: "https://console.groq.com/keys",
    apiKeyPortalLabel: "Get Groq Key",
    keyPlaceholder: "gsk_...",
    requiresKey: true,
    summary: "Sub-second instant responses",
    tutorial: GROQ_TUTORIAL,
  },

  // OpenRouter
  {
    id: "openrouter/auto",
    name: "OpenRouter Auto",
    provider: "openrouter",
    providerLabel: "OpenRouter",
    protocol: "openai-compatible",
    endpointUrl: "https://openrouter.ai/api/v1/chat/completions",
    apiKeyUrl: "https://openrouter.ai/keys",
    apiKeyPortalLabel: "Get OpenRouter Key",
    keyPlaceholder: "sk-or-v1-...",
    requiresKey: true,
    summary: "Automatic routing across OpenRouter models",
    tutorial: OPENROUTER_TUTORIAL,
  },
  {
    id: "meta-llama/llama-3.3-70b-instruct",
    name: "Llama 3.3 70B (OpenRouter)",
    provider: "openrouter",
    providerLabel: "OpenRouter",
    protocol: "openai-compatible",
    endpointUrl: "https://openrouter.ai/api/v1/chat/completions",
    apiKeyUrl: "https://openrouter.ai/keys",
    apiKeyPortalLabel: "Get OpenRouter Key",
    keyPlaceholder: "sk-or-v1-...",
    requiresKey: true,
    summary: "Open-weights 70B via unified OpenRouter key",
    tutorial: OPENROUTER_TUTORIAL,
  },

  // Google Cloud / Neutral
  {
    id: "google-cloud-translate",
    name: "Google Translate (Cloud / Web)",
    provider: "google-cloud",
    providerLabel: "Google Cloud / Neutral",
    protocol: "google-translate",
    endpointUrl: "https://translation.googleapis.com/language/translate/v2",
    apiKeyUrl: "https://console.cloud.google.com/apis/credentials",
    apiKeyPortalLabel: "Get Cloud Key",
    keyPlaceholder: "AIza... (optional; free web fallback if blank)",
    requiresKey: false,
    summary: "Uses Google Cloud API key or free Web endpoint directly for AI stream",
    tutorial: GOOGLE_CLOUD_TUTORIAL,
  },
];

const MODEL_API_KEYS_STORAGE = "urdu_localizer_model_api_keys_v1";
const CUSTOM_MODELS_STORAGE = "urdu_localizer_custom_ai_models_v1";

function readKeyMap(): Record<string, string> {
  try {
    const raw = localStorage.getItem(MODEL_API_KEYS_STORAGE);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeKeyMap(map: Record<string, string>): void {
  try {
    localStorage.setItem(MODEL_API_KEYS_STORAGE, JSON.stringify(map));
  } catch {
    // Ignore storage errors
  }
}

export function getStoredCustomModels(): CustomAiModelConfig[] {
  try {
    const raw = localStorage.getItem(CUSTOM_MODELS_STORAGE);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is CustomAiModelConfig =>
        Boolean(item && typeof item.id === "string" && typeof item.name === "string" && typeof item.baseUrl === "string" && typeof item.modelId === "string")
    );
  } catch {
    return [];
  }
}

export function saveStoredCustomModels(models: CustomAiModelConfig[]): void {
  try {
    localStorage.setItem(CUSTOM_MODELS_STORAGE, JSON.stringify(models));
  } catch {
    // Ignore storage errors
  }
}

export function isGeminiModelId(modelId: string, customModels: CustomAiModelConfig[] = []): boolean {
  const builtin = AI_MODEL_CATALOG.find((m) => m.id === modelId);
  if (builtin) return builtin.provider === "gemini";
  const custom = customModels.find((c) => c.id === modelId);
  if (custom) return false;
  return modelId.startsWith("gemini-");
}

export interface ResolvedAiModel {
  id: string;
  name: string;
  provider: AiProviderId;
  providerLabel: string;
  protocol: AiProtocol;
  endpointUrl: string;
  apiModelId: string;
  apiKeyUrl: string;
  apiKeyPortalLabel: string;
  keyPlaceholder: string;
  supportsServerProxy: boolean;
  requiresKey: boolean;
  summary: string;
  tutorial: AiProviderTutorial;
  isCustom: boolean;
  customConfig?: CustomAiModelConfig;
}

export function resolveAiModel(
  modelId: string,
  customModels: CustomAiModelConfig[] = []
): ResolvedAiModel {
  const custom = customModels.find((c) => c.id === modelId);
  if (custom) {
    return {
      id: custom.id,
      name: custom.name,
      provider: "custom",
      providerLabel: "Custom Model API",
      protocol: custom.protocol,
      endpointUrl: custom.baseUrl,
      apiModelId: custom.modelId,
      apiKeyUrl: custom.apiKeyUrl || "",
      apiKeyPortalLabel: custom.apiKeyUrl ? "Open Provider Docs" : "No Link Saved",
      keyPlaceholder: "Paste custom endpoint API key (if required)",
      supportsServerProxy: false,
      requiresKey: false,
      summary: `${custom.protocol} · ${custom.modelId}`,
      tutorial: CUSTOM_MODEL_TUTORIAL,
      isCustom: true,
      customConfig: custom,
    };
  }

  const entry = AI_MODEL_CATALOG.find((m) => m.id === modelId) || AI_MODEL_CATALOG[0];
  return {
    id: entry.id,
    name: entry.name,
    provider: entry.provider,
    providerLabel: entry.providerLabel,
    protocol: entry.protocol,
    endpointUrl: entry.endpointUrl,
    apiModelId: entry.id,
    apiKeyUrl: entry.apiKeyUrl,
    apiKeyPortalLabel: entry.apiKeyPortalLabel,
    keyPlaceholder: entry.keyPlaceholder,
    supportsServerProxy: Boolean(entry.supportsServerProxy),
    requiresKey: entry.requiresKey,
    summary: entry.summary,
    tutorial: entry.tutorial,
    isCustom: false,
  };
}

export function getApiKeyForModel(
  modelId: string,
  customModels: CustomAiModelConfig[] = [],
  googleApiKeyFallback: string = "",
  geminiLegacyKeyFallback: string = ""
): string {
  const map = readKeyMap();
  if (typeof map[modelId] === "string" && map[modelId].trim()) {
    return map[modelId].trim();
  }
  const resolved = resolveAiModel(modelId, customModels);
  if (resolved.provider === "gemini") {
    return (geminiLegacyKeyFallback || "").trim();
  }
  if (resolved.provider === "google-cloud") {
    return (googleApiKeyFallback || "").trim();
  }
  // Optional provider-level fallback across models of same third-party provider (e.g. gpt-4o & gpt-4o-mini)
  const providerFallback = map[`__provider__${resolved.provider}`];
  if (!resolved.isCustom && typeof providerFallback === "string" && providerFallback.trim()) {
    return providerFallback.trim();
  }
  return "";
}

export function setApiKeyForModel(
  modelId: string,
  apiKey: string,
  customModels: CustomAiModelConfig[] = []
): void {
  const trimmed = apiKey.trim();
  const map = readKeyMap();
  if (trimmed) {
    map[modelId] = trimmed;
  } else {
    delete map[modelId];
  }
  const resolved = resolveAiModel(modelId, customModels);
  if (!resolved.isCustom && resolved.provider !== "gemini" && resolved.provider !== "google-cloud") {
    if (trimmed) {
      map[`__provider__${resolved.provider}`] = trimmed;
    } else {
      delete map[`__provider__${resolved.provider}`];
    }
  }
  writeKeyMap(map);
}

export function hasSavedKeyForModel(
  modelId: string,
  customModels: CustomAiModelConfig[] = [],
  googleApiKeyFallback: string = "",
  geminiLegacyKeyFallback: string = ""
): boolean {
  return Boolean(getApiKeyForModel(modelId, customModels, googleApiKeyFallback, geminiLegacyKeyFallback));
}

export function validateCustomEndpointUrl(rawUrl: string): { valid: boolean; normalized?: string; error?: string } {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return { valid: false, error: "Endpoint URL is required." };
  }
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, error: "Enter a valid URL starting with https:// (e.g. https://api.together.xyz/v1)." };
  }
  const isHttps = parsed.protocol === "https:";
  const isLocalHttp =
    parsed.protocol === "http:" &&
    (/^(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+)$/i.test(parsed.hostname));

  if (!isHttps && !isLocalHttp) {
    return {
      valid: false,
      error: "Remote custom endpoints must use HTTPS (http:// is only allowed for localhost or LAN IP).",
    };
  }
  return { valid: true, normalized: trimmed.replace(/\/+$/, "") };
}

export function validateOptionalDocsUrl(rawUrl?: string): { valid: boolean; normalized?: string; error?: string } {
  const trimmed = (rawUrl || "").trim();
  if (!trimmed) return { valid: true, normalized: "" };
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return { valid: false, error: "Docs link must use https:// or http://." };
    }
    return { valid: true, normalized: trimmed };
  } catch {
    return { valid: false, error: "Docs link is not a valid URL." };
  }
}

function buildTargetEndpointUrl(resolved: ResolvedAiModel, apiKey: string): string {
  const base = resolved.endpointUrl.replace(/\/+$/, "");
  if (resolved.protocol === "openai-compatible") {
    if (/\/chat\/completions$/i.test(base)) return base;
    return `${base}/chat/completions`;
  }
  if (resolved.protocol === "anthropic") {
    if (/\/messages$/i.test(base)) return base;
    return `${base}/v1/messages`;
  }
  if (resolved.protocol === "gemini") {
    if (/:generateContent/i.test(base)) {
      return apiKey ? `${base}?key=${encodeURIComponent(apiKey)}` : base;
    }
    const cleanBase = base.replace(/\/v1beta$/i, "");
    return `${cleanBase}/v1beta/models/${encodeURIComponent(resolved.apiModelId)}:generateContent${
      apiKey ? `?key=${encodeURIComponent(apiKey)}` : ""
    }`;
  }
  return base;
}

function buildWrappedError(message: string, status?: number): Error & {
  statusCode?: number;
  isRateLimit?: boolean;
  isQuotaExceeded?: boolean;
} {
  const err = new Error(message) as Error & {
    statusCode?: number;
    isRateLimit?: boolean;
    isQuotaExceeded?: boolean;
  };
  if (status) err.statusCode = status;
  if (status === 429 || /429|RESOURCE_EXHAUSTED|quota|rate limit|Too Many Requests/i.test(message)) {
    err.isRateLimit = true;
    err.isQuotaExceeded = true;
    err.statusCode = 429;
  }
  return err;
}

async function callProviderChat(
  resolved: ResolvedAiModel,
  apiKey: string,
  systemInstruction: string,
  userPrompt: string,
  options: {
    signal?: AbortSignal;
    maxTokens?: number;
    jsonMode?: boolean;
  } = {}
): Promise<{ text: string; totalTokenCount?: number }> {
  if (options.signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }

  const controller = new AbortController();
  const onAbort = () => controller.abort();
  options.signal?.addEventListener("abort", onAbort, { once: true });
  const timeoutId = setTimeout(() => controller.abort(), 90000);

  try {
    if (resolved.protocol === "openai-compatible") {
      const targetUrl = buildTargetEndpointUrl(resolved, apiKey);
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (apiKey) {
        headers["Authorization"] = `Bearer ${apiKey}`;
      }
      if (resolved.provider === "openrouter") {
        headers["HTTP-Referer"] = typeof window !== "undefined" ? window.location.origin : "https://urdu-localizer.app";
        headers["X-Title"] = "Urdu Localizer";
      }

      const payload: Record<string, any> = {
        model: resolved.apiModelId,
        messages: [
          ...(systemInstruction ? [{ role: "system", content: systemInstruction }] : []),
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
      };
      if (options.maxTokens) payload.max_tokens = options.maxTokens;
      if (options.jsonMode && resolved.provider === "openai") {
        // OpenAI json_object requires prompt mention of JSON; we do array output via plain prompt safely
      }

      const res = await fetch(targetUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          data?.error?.message ||
          data?.message ||
          `${resolved.providerLabel} error (HTTP ${res.status})`;
        throw buildWrappedError(msg, res.status);
      }

      const text = String(data?.choices?.[0]?.message?.content || "").trim();
      const totalTokenCount = data?.usage?.total_tokens;
      return { text, totalTokenCount };
    }

    if (resolved.protocol === "anthropic") {
      const targetUrl = buildTargetEndpointUrl(resolved, apiKey);
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      };
      if (apiKey) {
        headers["x-api-key"] = apiKey;
      }

      const payload: Record<string, any> = {
        model: resolved.apiModelId,
        max_tokens: options.maxTokens || 4096,
        messages: [{ role: "user", content: userPrompt }],
      };
      if (systemInstruction) {
        payload.system = systemInstruction;
      }

      const res = await fetch(targetUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          data?.error?.message ||
          data?.message ||
          `${resolved.providerLabel} error (HTTP ${res.status})`;
        throw buildWrappedError(msg, res.status);
      }

      const blocks = Array.isArray(data?.content) ? data.content : [];
      const text = blocks
        .map((b: any) => (b?.type === "text" ? b.text : ""))
        .join("")
        .trim();
      const totalTokenCount =
        (data?.usage?.input_tokens || 0) + (data?.usage?.output_tokens || 0) || undefined;
      return { text, totalTokenCount };
    }

    if (resolved.protocol === "gemini") {
      const targetUrl = buildTargetEndpointUrl(resolved, apiKey);
      const body: Record<string, any> = {
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      };
      if (systemInstruction) {
        body.systemInstruction = { parts: [{ text: systemInstruction }] };
      }

      const res = await fetch(targetUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.error?.message || `Custom Gemini endpoint HTTP ${res.status}`;
        throw buildWrappedError(msg, res.status);
      }
      const parts = data?.candidates?.[0]?.content?.parts || [];
      const text = parts.map((p: any) => p?.text || "").join("").trim();
      return { text, totalTokenCount: data?.usageMetadata?.totalTokenCount };
    }

    throw new Error(`Unsupported protocol: ${resolved.protocol}`);
  } catch (err: any) {
    if (options.signal?.aborted || err?.name === "AbortError") {
      throw new DOMException("Aborted", "AbortError");
    }
    if (err instanceof TypeError && /fetch|network|cors/i.test(err.message)) {
      throw new Error(
        `Network/CORS error calling ${resolved.providerLabel} (${resolved.endpointUrl}). Verify internet access and HTTPS endpoint.`
      );
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
    options.signal?.removeEventListener("abort", onAbort);
  }
}

export async function testAiModelConnection(params: {
  modelId: string;
  apiKey: string;
  customModels: CustomAiModelConfig[];
  googleRoutingMode?: GoogleRoutingMode;
  translationSettings?: TranslationSettings;
}): Promise<{ connected: boolean; mode: "direct" | "server" | "web"; message: string }> {
  const { modelId, apiKey, customModels, googleRoutingMode, translationSettings } = params;
  const resolved = resolveAiModel(modelId, customModels);
  const trimmedKey = apiKey.trim();

  if (!resolved.isCustom && resolved.provider === "gemini") {
    const status = await GeminiService.checkServerStatus(trimmedKey);
    return {
      connected: status.connected,
      mode: status.mode || (trimmedKey ? "direct" : "server"),
      message: status.connected
        ? `${resolved.name} connected (${status.mode === "direct" ? "Direct API Key" : "Server Proxy"})`
        : status.error || "Gemini connection failed.",
    };
  }

  if (resolved.protocol === "google-translate") {
    try {
      const probe = await translateTextGoogle(
        "Hello",
        trimmedKey || undefined,
        undefined,
        translationSettings || DEFAULT_TRANSLATION_SETTINGS,
        googleRoutingMode || "hybrid"
      );
      if (probe && probe !== "Translation Error") {
        return {
          connected: true,
          mode: trimmedKey ? "direct" : "web",
          message: trimmedKey
            ? "Google Cloud Translate API key verified!"
            : "Free Google Translate endpoint verified!",
        };
      }
      return { connected: false, mode: "web", message: "Unexpected response from Google Translate." };
    } catch (err: any) {
      return {
        connected: false,
        mode: trimmedKey ? "direct" : "web",
        message: err?.message || "Google Translate check failed.",
      };
    }
  }

  if (resolved.requiresKey && !trimmedKey) {
    return {
      connected: false,
      mode: "direct",
      message: `Enter your ${resolved.providerLabel} API key to connect ${resolved.name}.`,
    };
  }

  try {
    const res = await callProviderChat(
      resolved,
      trimmedKey,
      "Reply briefly with OK.",
      "Reply with OK.",
      { maxTokens: 16 }
    );
    if (!res.text) {
      return {
        connected: false,
        mode: "direct",
        message: `${resolved.name} returned an empty response.`,
      };
    }
    return {
      connected: true,
      mode: "direct",
      message: `${resolved.name} verified & ready!`,
    };
  } catch (err: any) {
    return {
      connected: false,
      mode: "direct",
      message: err?.message || `Failed to verify ${resolved.name}.`,
    };
  }
}

function parseJsonTranslationArray(rawText: string): TranslationResult[] {
  const cleaned = rawText
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  const tryParse = (candidate: string): TranslationResult[] => {
    const data = JSON.parse(candidate);
    const arr = Array.isArray(data)
      ? data
      : Array.isArray(data?.translations)
      ? data.translations
      : Array.isArray(data?.items)
      ? data.items
      : [];
    return arr
      .filter((r: any) => typeof r?.index === "number" && typeof r?.translatedText === "string")
      .map((r: any) => ({ index: r.index, translatedText: r.translatedText.trim() }));
  };

  try {
    const parsed = tryParse(cleaned);
    if (parsed.length > 0) return parsed;
  } catch {
    // Try extracting array bracket block
  }

  const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try {
      const parsed = tryParse(arrayMatch[0]);
      if (parsed.length > 0) return parsed;
    } catch {
      // ignore
    }
  }

  const objMatch = cleaned.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try {
      const parsed = tryParse(objMatch[0]);
      if (parsed.length > 0) return parsed;
    } catch {
      // ignore
    }
  }

  return [];
}

export async function translateBatchUnified(params: {
  modelId: string;
  apiKey: string;
  customModels: CustomAiModelConfig[];
  geminiService: GeminiService | null;
  items: { index: number; text: string }[];
  context: string;
  customPrompt: string;
  signal?: AbortSignal;
  settings?: TranslationSettings;
  googleRoutingMode?: GoogleRoutingMode;
}): Promise<TranslationResult[]> {
  const {
    modelId,
    apiKey,
    customModels,
    geminiService,
    items,
    context,
    customPrompt,
    signal,
    settings,
    googleRoutingMode,
  } = params;

  const resolved = resolveAiModel(modelId, customModels);

  // Built-in Gemini uses GeminiService (supports SDK + server proxy + Google Search grounding)
  if (!resolved.isCustom && resolved.provider === "gemini") {
    const svc = geminiService || new GeminiService(resolved.apiModelId, apiKey);
    svc.updateConfig(resolved.apiModelId, apiKey);
    return await svc.translateBatch(items, context, customPrompt, signal, settings);
  }

  // Google Cloud / Web Neutral Engine selected as primary AI engine
  if (resolved.protocol === "google-translate") {
    const res = await translateBatchGoogle(
      items,
      apiKey || undefined,
      signal,
      geminiService || undefined,
      settings || DEFAULT_TRANSLATION_SETTINGS,
      googleRoutingMode || "hybrid"
    );
    return res.map((r) => ({
      index: r.index,
      translatedText: r.googleTranslateText,
    }));
  }

  const cleanItems = items.map((item) => ({
    index: item.index,
    text: stripFormatting(item.text),
  }));
  const activeSettings = settings || DEFAULT_TRANSLATION_SETTINGS;
  const systemInstruction = buildTranslationSystemInstruction(
    activeSettings,
    context,
    customPrompt
  );

  const userPrompt = `Translate every subtitle item below and output ONLY a valid JSON array (no markdown fences, no commentary) of objects with exact "index" (number) and "translatedText" (string).\nItems:\n${JSON.stringify(
    cleanItems
  )}`;

  const res = await callProviderChat(resolved, apiKey, systemInstruction, userPrompt, {
    signal,
    maxTokens: 4096,
  });

  const parsed = parseJsonTranslationArray(res.text);
  const tokens =
    res.totalTokenCount ||
    Math.round(JSON.stringify(cleanItems).length / 3.8 + JSON.stringify(parsed).length / 2);
  quotaManager.recordRequest(tokens);
  return parsed;
}

export async function generateContextUnified(params: {
  modelId: string;
  apiKey: string;
  customModels: CustomAiModelConfig[];
  geminiService: GeminiService | null;
  subtitlesSample: string;
  signal?: AbortSignal;
}): Promise<string> {
  const { modelId, apiKey, customModels, geminiService, subtitlesSample, signal } = params;
  const resolved = resolveAiModel(modelId, customModels);

  if (!resolved.isCustom && resolved.provider === "gemini") {
    const svc = geminiService || new GeminiService(resolved.apiModelId, apiKey);
    svc.updateConfig(resolved.apiModelId, apiKey);
    return await svc.generateContext(subtitlesSample, signal);
  }

  if (resolved.protocol === "google-translate") {
    // Google Cloud Translate does not perform cultural analysis; use Gemini proxy/key if available or heuristic summary
    if (geminiService) {
      return await geminiService.generateContext(subtitlesSample, signal);
    }
    throw new Error("Cultural context analysis requires an LLM model (Gemini, OpenAI, Claude, DeepSeek, Groq, or Custom LLM).");
  }

  const cleaned = stripFormatting(subtitlesSample || "").trim();
  const prompt = `Analyze these subtitle dialogue lines and provide a concise cultural localization context summary for a subtitle translator:
1) Probable genre, tone, and setting
2) Character names & likely gender/relationships/formality
3) Slang, idioms, humor, or emotional beats to preserve

Subtitles sample:
${cleaned.slice(0, 7500)}`;

  const res = await callProviderChat(
    resolved,
    apiKey,
    "You are an expert audiovisual localization director.",
    prompt,
    { signal, maxTokens: 1200 }
  );
  const text = (res.text || "").trim();
  if (!text) throw new Error("No context text was generated.");
  quotaManager.recordRequest(
    res.totalTokenCount || Math.round(cleaned.slice(0, 7500).length / 3.8 + text.length / 2)
  );
  return text;
}

export async function suggestShortFileNameUnified(params: {
  modelId: string;
  apiKey: string;
  customModels: CustomAiModelConfig[];
  geminiService: GeminiService | null;
  rawFileName?: string;
  context?: string;
  sampleLines?: string;
  signal?: AbortSignal;
}): Promise<{ primary: string; alternatives: string[]; usedSearch: boolean }> {
  const {
    modelId,
    apiKey,
    customModels,
    geminiService,
    rawFileName,
    context,
    sampleLines,
    signal,
  } = params;
  const resolved = resolveAiModel(modelId, customModels);

  if (!resolved.isCustom && resolved.provider === "gemini") {
    const svc = geminiService || new GeminiService(resolved.apiModelId, apiKey);
    svc.updateConfig(resolved.apiModelId, apiKey);
    return await svc.suggestShortFileName({ rawFileName, context, sampleLines }, signal);
  }

  if (resolved.protocol === "google-translate") {
    throw new Error("Filename suggestion requires an LLM model.");
  }

  const sanitize = (s: unknown) =>
    String(s || "")
      .replace(/\.(srt|vtt|ass|ssa|sbv|lrc|txt|json)$/i, "")
      .replace(/[._~+=|`\\/:*?"<>!@#$%^&,;(){}\[\]]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 72);

  const prompt = `Identify the official movie, drama, anime, or TV series title (and release year or season/episode numerals like 2024, S01E02, S1E1, S01, E01, Season 1, Episode 2, or 1 2 3 if present) from the clues below, and suggest 3 clean base filenames (do NOT include .srt extension or language tags). Remove extra dots, underscores, brackets, and symbols, and strip release tags (1080p, BluRay, x265, YTS).

Clues:
- Original File Name: ${rawFileName || "unknown"}
- Cultural Context: ${stripFormatting(context || "").slice(0, 1000) || "none"}
- Sample Dialogue: ${stripFormatting(sampleLines || "").slice(0, 1000) || "none"}

Output ONLY valid JSON: {"primary":"...","alternatives":["...","..."]}`;

  const res = await callProviderChat(resolved, apiKey, "", prompt, { signal, maxTokens: 300 });
  const cleaned = res.text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : cleaned);
  const primary = sanitize(parsed?.primary);
  const altsRaw: unknown[] = Array.isArray(parsed?.alternatives) ? parsed.alternatives : [];
  const alternatives = Array.from(
    new Set(altsRaw.map(sanitize).filter((v) => v && v !== primary))
  ).slice(0, 3);

  if (!primary) throw new Error("No filename suggestion returned.");
  quotaManager.recordRequest(res.totalTokenCount || 250);
  return { primary, alternatives, usedSearch: false };
}
