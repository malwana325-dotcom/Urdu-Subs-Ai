import { GoogleGenAI, Type } from "@google/genai";
import { quotaManager } from "./quota";
import {
  TranslationSettings,
  DEFAULT_TRANSLATION_SETTINGS,
  TARGET_LANGUAGES,
  buildTranslationSystemInstruction,
} from "./translationSettings";
import type { GoogleRoutingMode } from "./appPreferences";
import { stripFormatting } from "../utils/subtitleFormatter";

const PRIMARY_MODEL = "gemini-4-hydrogen";
const FALLBACK_MODEL = "gemini-3.1-flash-lite";
const GEMINI_KEY_STORAGE_KEY = "urdu_localizer_gemini_api_key";

export function getStoredGeminiApiKey(): string {
  try {
    return (localStorage.getItem(GEMINI_KEY_STORAGE_KEY) || "").trim();
  } catch {
    return "";
  }
}

export function setStoredGeminiApiKey(key: string): void {
  try {
    const trimmed = key.trim();
    if (trimmed) {
      localStorage.setItem(GEMINI_KEY_STORAGE_KEY, trimmed);
    } else {
      localStorage.removeItem(GEMINI_KEY_STORAGE_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

export function clearStoredGeminiApiKey(): void {
  try {
    localStorage.removeItem(GEMINI_KEY_STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}

function normalizeClientModel(model?: string): string {
  const m = String(model || "").trim();
  if (
    !m ||
    m === "gemini-3.8-flash" ||
    m === "gemini-flash-latest" ||
    m === "gemini-pro" ||
    m.startsWith("gemini-1.5") ||
    m.startsWith("gemini-2.0")
  ) {
    return PRIMARY_MODEL;
  }
  return m;
}

export interface TranslationResult {
  index: number;
  translatedText: string;
}

export interface ServerGeminiStatus {
  connected: boolean;
  defaultModel: string;
  mode?: "direct" | "server";
  error?: string;
}

export class GeminiService {
  private primaryModel: string = PRIMARY_MODEL;
  private localApiKey: string = "";

  constructor(model?: string, localApiKey?: string) {
    if (model) this.primaryModel = normalizeClientModel(model);
    this.localApiKey = (localApiKey ?? getStoredGeminiApiKey()).trim();
  }

  updateConfig(model: string, localApiKey?: string) {
    this.primaryModel = normalizeClientModel(model || PRIMARY_MODEL);
    if (localApiKey !== undefined) {
      this.localApiKey = localApiKey.trim();
    } else {
      this.localApiKey = getStoredGeminiApiKey();
    }
  }

  private getEffectiveLocalKey(): string {
    return (this.localApiKey || getStoredGeminiApiKey()).trim();
  }

  static async checkServerStatus(localApiKey?: string): Promise<ServerGeminiStatus> {
    const effectiveKey = (localApiKey ?? getStoredGeminiApiKey()).trim();

    // Standalone APK / User Key Mode: verify directly against generativelanguage.googleapis.com
    if (effectiveKey) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(effectiveKey)}`,
          {
            signal:
              typeof AbortSignal !== "undefined" && AbortSignal.timeout
                ? AbortSignal.timeout(9000)
                : undefined,
          }
        );
        if (res.ok) {
          return {
            connected: true,
            defaultModel: PRIMARY_MODEL,
            mode: "direct",
          };
        }
        const errData = await res.json().catch(() => ({}));
        return {
          connected: false,
          defaultModel: PRIMARY_MODEL,
          mode: "direct",
          error:
            errData?.error?.message ||
            `Direct Gemini API key check failed (HTTP ${res.status}).`,
        };
      } catch (err: any) {
        return {
          connected: false,
          defaultModel: PRIMARY_MODEL,
          mode: "direct",
          error: err?.message || "Cannot reach generativelanguage.googleapis.com.",
        };
      }
    }

    // Shared Web App Mode: check server proxy
    try {
      const res = await fetch("/api/gemini/status", {
        signal:
          typeof AbortSignal !== "undefined" && AbortSignal.timeout
            ? AbortSignal.timeout(8000)
            : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.connected) {
        return {
          connected: false,
          defaultModel: data?.defaultModel || PRIMARY_MODEL,
          mode: "server",
          error:
            data?.error ||
            "No local Gemini API key saved and server returned unavailable. Add your Gemini API key in Menu > Language, Script & AI Engines.",
        };
      }
      return {
        connected: true,
        defaultModel: data.defaultModel || PRIMARY_MODEL,
        mode: "server",
      };
    } catch {
      return {
        connected: false,
        defaultModel: PRIMARY_MODEL,
        mode: "server",
        error:
          "Standalone mode: enter your Gemini API key in Menu > Language, Script & AI Engines to connect directly.",
      };
    }
  }

  /**
   * Executes Gemini content generation directly using @google/genai SDK with a direct HTTPS REST fetch fallback.
   * Zero dependency on window.aistudio or cookies so it executes natively in Capacitor Android APKs & all browsers.
   */
  private async directGenerateContent(
    apiKey: string,
    model: string,
    contents: string,
    options: {
      systemInstruction?: string;
      responseMimeType?: string;
      responseSchema?: any;
      useGoogleSearch?: boolean;
      signal?: AbortSignal;
    } = {}
  ): Promise<{ text: string; totalTokenCount?: number }> {
    const resolvedModel = normalizeClientModel(model);
    if (options.signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }

    const handleDirectError = (err: any): never => {
      if (options.signal?.aborted || err?.name === "AbortError") {
        throw new DOMException("Aborted", "AbortError");
      }
      const msg = String(err?.message || err || "Gemini API error");
      const wrapped = new Error(msg) as Error & {
        isRateLimit?: boolean;
        isQuotaExceeded?: boolean;
        statusCode?: number;
      };
      if (/429|RESOURCE_EXHAUSTED|quota|rate limit|Too Many Requests/i.test(msg)) {
        wrapped.isRateLimit = true;
        wrapped.isQuotaExceeded = true;
        wrapped.statusCode = 429;
      } else if (/401|403|API_KEY_INVALID|permission/i.test(msg)) {
        wrapped.statusCode = 403;
      }
      throw wrapped;
    };

    const runWithModel = async (targetModel: string): Promise<{ text: string; totalTokenCount?: number }> => {
      // 1. Primary path: @google/genai SDK directly over HTTPS
      try {
        const ai = new GoogleGenAI({ apiKey });
        const config: Record<string, any> = {};
        if (options.systemInstruction) config.systemInstruction = options.systemInstruction;
        if (options.responseMimeType) config.responseMimeType = options.responseMimeType;
        if (options.responseSchema) config.responseSchema = options.responseSchema;
        if (options.useGoogleSearch) config.tools = [{ googleSearch: {} }];

        const response = await ai.models.generateContent({
          model: targetModel,
          contents,
          config: Object.keys(config).length > 0 ? config : undefined,
        });

        const text = (response?.text || "").trim();
        if (text) {
          return {
            text,
            totalTokenCount: response?.usageMetadata?.totalTokenCount,
          };
        }
      } catch (sdkErr: any) {
        if (options.signal?.aborted || sdkErr?.name === "AbortError") {
          throw sdkErr;
        }
        // Proceed to direct REST fetch fallback below (handles WebView/CORS edge cases)
      }

      // 2. Direct REST fetch fallback against generativelanguage.googleapis.com
      const body: Record<string, any> = {
        contents: [{ role: "user", parts: [{ text: contents }] }],
      };
      if (options.systemInstruction) {
        body.systemInstruction = { parts: [{ text: options.systemInstruction }] };
      }
      const generationConfig: Record<string, any> = {};
      if (options.responseMimeType) generationConfig.responseMimeType = options.responseMimeType;
      if (Object.keys(generationConfig).length > 0) {
        body.generationConfig = generationConfig;
      }
      if (options.useGoogleSearch) {
        body.tools = [{ google_search: {} }];
      }

      const controller = new AbortController();
      const onCallerAbort = () => controller.abort();
      options.signal?.addEventListener("abort", onCallerAbort, { once: true });
      const timeoutId = setTimeout(() => controller.abort(), 90000);

      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
            targetModel
          )}:generateContent?key=${encodeURIComponent(apiKey)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            signal: controller.signal,
          }
        );

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const errMsg = data?.error?.message || `Gemini HTTP ${res.status}`;
          const restErr = new Error(errMsg) as Error & { statusCode?: number; isRateLimit?: boolean };
          restErr.statusCode = res.status;
          if (res.status === 429) restErr.isRateLimit = true;
          throw restErr;
        }

        const parts = data?.candidates?.[0]?.content?.parts || [];
        const text = parts
          .map((p: any) => p?.text || "")
          .join("")
          .trim();

        return {
          text,
          totalTokenCount: data?.usageMetadata?.totalTokenCount,
        };
      } finally {
        clearTimeout(timeoutId);
        options.signal?.removeEventListener("abort", onCallerAbort);
      }
    };

    try {
      return await runWithModel(resolvedModel);
    } catch (primaryErr: any) {
      if (
        resolvedModel !== FALLBACK_MODEL &&
        !options.signal?.aborted &&
        !/API_KEY_INVALID/i.test(primaryErr?.message || "")
      ) {
        try {
          return await runWithModel(FALLBACK_MODEL);
        } catch (fallbackErr) {
          return handleDirectError(fallbackErr);
        }
      }
      return handleDirectError(primaryErr);
    }
  }

  private async postJson<T>(
    url: string,
    payload: Record<string, any>,
    signal?: AbortSignal
  ): Promise<T> {
    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }

    const controller = new AbortController();
    let timedOut = false;
    const onCallerAbort = () => controller.abort();
    signal?.addEventListener("abort", onCallerAbort, { once: true });
    const timeoutId = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 120000);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.error || `HTTP ${res.status}`;
        const err = new Error(msg) as Error & {
          isRateLimit?: boolean;
          isQuotaExceeded?: boolean;
          statusCode?: number;
        };
        err.statusCode = res.status;
        if (
          res.status === 429 ||
          data?.isRateLimit ||
          /429|RESOURCE_EXHAUSTED|quota|rate limit|Too Many Requests/i.test(msg)
        ) {
          err.isRateLimit = true;
          err.isQuotaExceeded = true;
        }
        throw err;
      }

      return data as T;
    } catch (err: any) {
      if (signal?.aborted) {
        throw new DOMException("Aborted", "AbortError");
      }
      if (timedOut) {
        throw new Error("Server request timed out after 120s. Please try again.");
      }
      if (err instanceof TypeError && /fetch|network/i.test(err.message)) {
        throw new Error(
          "No backend server reachable. Add your Gemini API key in Menu > Language, Script & AI Engines for standalone mode."
        );
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
      signal?.removeEventListener("abort", onCallerAbort);
    }
  }

  /**
   * Generates context for the subtitles using direct HTTPS Gemini (when key saved) or server proxy.
   */
  async generateContext(subtitles: string, signal?: AbortSignal): Promise<string> {
    const cleaned = stripFormatting(subtitles || "").trim();
    if (!cleaned) {
      throw new Error("No subtitle text found to analyze.");
    }

    const localKey = this.getEffectiveLocalKey();
    if (localKey) {
      const prompt = `Analyze these subtitle dialogue lines and provide a concise cultural localization context summary for a subtitle translator:
1) Probable genre, tone, and setting
2) Character names & likely gender/relationships/formality
3) Slang, idioms, humor, or emotional beats to preserve

Subtitles sample:
${cleaned.slice(0, 7500)}`;

      let res: { text: string; totalTokenCount?: number };
      try {
        res = await this.directGenerateContent(localKey, this.primaryModel, prompt, {
          useGoogleSearch: true,
          signal,
        });
      } catch {
        res = await this.directGenerateContent(localKey, this.primaryModel, prompt, {
          useGoogleSearch: false,
          signal,
        });
      }
      const text = (res.text || "").trim();
      if (!text) {
        throw new Error("No context text was generated by the AI model. Please try again.");
      }
      const tokens =
        res.totalTokenCount ||
        Math.round(cleaned.slice(0, 8000).length / 3.8 + text.length / 2);
      quotaManager.recordRequest(tokens);
      return text;
    }

    const data = await this.postJson<{
      text?: string;
      usageMetadata?: { totalTokenCount?: number };
    }>(
      "/api/gemini/context",
      {
        subtitles: cleaned,
        model: this.primaryModel,
      },
      signal
    );

    const text = (data.text || "").trim();
    if (!text || text === "No context generated.") {
      throw new Error("No context text was generated by the AI model. Please try again.");
    }

    const tokens =
      data.usageMetadata?.totalTokenCount ||
      Math.round(cleaned.slice(0, 8000).length / 3.8 + text.length / 2);
    quotaManager.recordRequest(tokens);

    return text;
  }

  /**
   * AI Cinema: Explains movie/series, breakdowns plot, provides simple story, generates reviews in Urdu and English.
   */
  async generateCinemaInsights(
    title: string,
    action: "story" | "plot" | "review" | "characters" | "ending" | "context" | "all" = "all",
    language: "ur" | "en" | "bilingual" = "ur",
    signal?: AbortSignal
  ): Promise<string> {
    const localKey = this.getEffectiveLocalKey();
    if (localKey) {
      const langInstruction =
        language === "ur"
          ? "Write your entire response in natural, engaging Urdu (اردو رسم الخط)."
          : language === "en"
          ? "Write your response in clear English."
          : "Provide bilingual sections in both Urdu and English.";

      const actionFocus =
        action === "all"
          ? "Complete breakdown: Story summary, plot beats, main characters & relationships, ending analysis, and audience review."
          : `Focus deeply on: ${action}`;

      const prompt = `Movie/Series Title: "${title}"
Task: ${actionFocus}
${langInstruction}`;

      try {
        const res = await this.directGenerateContent(localKey, this.primaryModel, prompt, {
          useGoogleSearch: true,
          signal,
        });
        if (res.text) return res.text;
      } catch {
        const res = await this.directGenerateContent(localKey, this.primaryModel, prompt, {
          useGoogleSearch: false,
          signal,
        });
        if (res.text) return res.text;
      }
      return "No cinema insight generated.";
    }

    const data = await this.postJson<{
      text?: string;
      usageMetadata?: { totalTokenCount?: number };
    }>(
      "/api/gemini/cinema",
      {
        title,
        action,
        language,
        model: this.primaryModel,
      },
      signal
    );

    return data.text || "No cinema insight generated.";
  }

  /**
   * Translates a batch of subtitle texts directly via HTTPS (when local key exists) or server proxy.
   */
  async translateBatch(
    items: { index: number; text: string }[],
    context: string,
    customPrompt: string,
    signal?: AbortSignal,
    settings?: TranslationSettings
  ): Promise<TranslationResult[]> {
    const cleanItems = items.map((item) => ({
      index: item.index,
      text: stripFormatting(item.text),
    }));

    const localKey = this.getEffectiveLocalKey();
    if (localKey) {
      const activeSettings = settings || DEFAULT_TRANSLATION_SETTINGS;
      const systemInstruction = buildTranslationSystemInstruction(
        activeSettings,
        context,
        customPrompt
      );
      const userPrompt = `Translate every subtitle item below and return a JSON array of objects with exact "index" (number) and "translatedText" (string).\nItems:\n${JSON.stringify(
        cleanItems
      )}`;

      const res = await this.directGenerateContent(localKey, this.primaryModel, userPrompt, {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              index: { type: Type.INTEGER },
              translatedText: { type: Type.STRING },
            },
            required: ["index", "translatedText"],
          },
        },
        signal,
      });

      let parsed: TranslationResult[] = [];
      try {
        const cleanedJson = res.text
          .replace(/^```json\s*/i, "")
          .replace(/```$/i, "")
          .trim();
        const rawArr = JSON.parse(cleanedJson);
        if (Array.isArray(rawArr)) {
          parsed = rawArr
            .filter((r) => typeof r?.index === "number" && typeof r?.translatedText === "string")
            .map((r) => ({ index: r.index, translatedText: r.translatedText.trim() }));
        }
      } catch {
        parsed = [];
      }

      const tokens =
        res.totalTokenCount ||
        Math.round(
          JSON.stringify(cleanItems).length / 3.8 + JSON.stringify(parsed).length / 2
        );
      quotaManager.recordRequest(tokens);
      return parsed;
    }

    const data = await this.postJson<{
      results?: TranslationResult[];
      usageMetadata?: { totalTokenCount?: number };
    }>(
      "/api/gemini/translate-batch",
      {
        items: cleanItems,
        context,
        customPrompt,
        settings: settings || DEFAULT_TRANSLATION_SETTINGS,
        model: this.primaryModel,
      },
      signal
    );

    const results = Array.isArray(data.results) ? data.results : [];
    const tokens =
      data.usageMetadata?.totalTokenCount ||
      Math.round(
        JSON.stringify(items).length / 3.8 + JSON.stringify(results).length / 2
      );
    quotaManager.recordRequest(tokens);

    return results;
  }

  /**
   * Provides a "neutral" translation for comparison (simulating Google Translate style).
   */
  async getNeutralTranslation(
    text: string,
    signal?: AbortSignal,
    settings?: TranslationSettings
  ): Promise<string> {
    const cleanText = stripFormatting(text);
    const localKey = this.getEffectiveLocalKey();

    if (localKey) {
      const activeSettings = settings || DEFAULT_TRANSLATION_SETTINGS;
      const targetLangName =
        TARGET_LANGUAGES.find((l) => l.code === activeSettings.targetLanguage)?.name ||
        "Urdu";
      const scriptNote =
        activeSettings.scriptMode === "roman-urdu"
          ? "using Roman Urdu Latin script"
          : "using native script";
      const res = await this.directGenerateContent(
        localKey,
        FALLBACK_MODEL,
        `Translate neutrally and literally into ${targetLangName} (${scriptNote}). Return only the translated text:\n\n${cleanText}`,
        { signal }
      );
      return res.text.trim();
    }

    const data = await this.postJson<{ text?: string }>(
      "/api/gemini/neutral",
      {
        text: cleanText,
        settings: settings || DEFAULT_TRANSLATION_SETTINGS,
      },
      signal
    );

    return data.text?.trim() || "";
  }

  /**
   * Translates a batch neutrally via local key (when present) or server proxy.
   */
  async translateBatchNeutral(
    items: { index: number; text: string }[],
    _googleApiKey?: string,
    signal?: AbortSignal,
    settings?: TranslationSettings
  ): Promise<{ index: number; googleTranslateText: string }[]> {
    const cleanItems = items.map((item) => ({
      index: item.index,
      text: stripFormatting(item.text),
    }));

    const localKey = this.getEffectiveLocalKey();
    if (localKey) {
      const activeSettings = settings || DEFAULT_TRANSLATION_SETTINGS;
      const targetLangName =
        TARGET_LANGUAGES.find((l) => l.code === activeSettings.targetLanguage)?.name ||
        "Urdu";
      const scriptNote =
        activeSettings.scriptMode === "roman-urdu"
          ? "in Roman Urdu (Latin script)"
          : "in native script";
      const res = await this.directGenerateContent(
        localKey,
        FALLBACK_MODEL,
        `Translate each subtitle text faithfully and neutrally into ${targetLangName} ${scriptNote}. Return JSON array of {index, googleTranslateText}:\n${JSON.stringify(
          cleanItems
        )}`,
        {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                index: { type: Type.INTEGER },
                googleTranslateText: { type: Type.STRING },
              },
              required: ["index", "googleTranslateText"],
            },
          },
          signal,
        }
      );

      try {
        const cleanedJson = res.text
          .replace(/^```json\s*/i, "")
          .replace(/```$/i, "")
          .trim();
        const arr = JSON.parse(cleanedJson);
        if (Array.isArray(arr)) {
          return arr.map((r: any) => ({
            index: Number(r.index),
            googleTranslateText: String(r.googleTranslateText || ""),
          }));
        }
      } catch {
        return [];
      }
      return [];
    }

    const data = await this.postJson<{
      results?: { index: number; googleTranslateText: string }[];
    }>(
      "/api/gemini/neutral-batch",
      {
        items: cleanItems,
        settings: settings || DEFAULT_TRANSLATION_SETTINGS,
      },
      signal
    );

    return Array.isArray(data.results) ? data.results : [];
  }
}

/**
 * High-speed batched Google / Machine Translation with routing mode ('hybrid' | 'web' | 'cloud'), abort signal & Gemini fallback.
 */
export async function translateBatchGoogle(
  items: { index: number; text: string }[],
  apiKey?: string,
  signal?: AbortSignal,
  geminiFallback?: GeminiService,
  settings?: TranslationSettings,
  routingMode: GoogleRoutingMode = "hybrid"
): Promise<
  { index: number; googleTranslateText: string; isFallback?: boolean; error403?: boolean }[]
> {
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

  const cleanItems = items.map((item) => ({
    index: item.index,
    text: stripFormatting(item.text),
  }));

  let got403 = false;
  const sourceCode =
    settings?.sourceLanguage && settings.sourceLanguage !== "auto"
      ? settings.sourceLanguage
      : "auto";
  const targetCode =
    settings?.targetLanguage === "ur-roman"
      ? "ur"
      : settings?.targetLanguage || "ur";

  const tryCloud = Boolean(apiKey && routingMode !== "web");
  const tryWeb = routingMode !== "cloud";

  if (tryCloud && apiKey) {
    try {
      const params = new URLSearchParams();
      params.append("key", apiKey);
      if (sourceCode !== "auto") params.append("source", sourceCode);
      params.append("target", targetCode);
      params.append("format", "text");
      cleanItems.forEach((item) => params.append("q", item.text));

      const response = await fetch(
        `https://translation.googleapis.com/language/translate/v2`,
        {
          method: "POST",
          body: params,
          signal: signal || AbortSignal.timeout(10000),
        }
      );

      if (response.status === 403) {
        got403 = true;
        console.warn("Google Cloud API returned 403 Forbidden. Using fallback translator.");
      } else {
        const data = await response.json();
        if (data.data?.translations) {
          return cleanItems.map((item, i) => ({
            index: item.index,
            googleTranslateText: data.data.translations[i].translatedText,
          }));
        }
        if (
          data.error?.code === 403 ||
          /forbidden|permission|key/i.test(data.error?.message || "")
        ) {
          got403 = true;
        }
      }
    } catch (e: any) {
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
      if (e?.status === 403 || /403/i.test(e?.message || "")) got403 = true;
      console.error("Batched Google Cloud API failed:", e);
    }
  }

  // Free Google Translate endpoint (gtx)
  if (tryWeb && !got403) {
    try {
      const separator = " [|] ";
      const combinedText = cleanItems.map((item) => item.text).join(separator);
      const translatedCombined = await translateTextGoogle(
        combinedText,
        undefined,
        signal,
        settings,
        "web"
      );

      if (
        translatedCombined &&
        translatedCombined !== "Translation Error" &&
        !translatedCombined.startsWith("403")
      ) {
        const parts = translatedCombined.split(/ \s*\[\s*\|\s*\]\s* /);
        if (parts.length === cleanItems.length) {
          return cleanItems.map((item, i) => ({
            index: item.index,
            googleTranslateText: parts[i].trim(),
          }));
        }
      }
    } catch (e: any) {
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
      if (e?.status === 403 || /403/i.test(e?.message || "")) got403 = true;
    }

    // Try parallel individual requests
    try {
      const results = await Promise.all(
        cleanItems.map(async (item) => ({
          index: item.index,
          googleTranslateText: await translateTextGoogle(
            item.text,
            routingMode === "hybrid" ? apiKey : undefined,
            signal,
            settings,
            routingMode
          ),
        }))
      );

      const hasValid = results.some(
        (r) => r.googleTranslateText && r.googleTranslateText !== "Translation Error"
      );
      if (hasValid) {
        return results;
      }
    } catch (e: any) {
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
      if (e?.status === 403 || /403/i.test(e?.message || "")) got403 = true;
    }
  }

  // Seamless Fallback: Gemini Neutral Machine Translation
  if (geminiFallback) {
    try {
      const fallbackResults = await geminiFallback.translateBatchNeutral(
        cleanItems,
        undefined,
        signal,
        settings
      );
      return fallbackResults.map((r) => ({
        index: r.index,
        googleTranslateText: r.googleTranslateText,
        isFallback: true,
        error403: got403,
      }));
    } catch (fbErr) {
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
      console.error("Gemini neutral fallback failed:", fbErr);
    }
  }

  return cleanItems.map((item) => ({
    index: item.index,
    googleTranslateText: got403
      ? "Google 403 (Check API Key)"
      : "Translation Error",
    error403: got403,
  }));
}

/**
 * Standalone Google Translate implementation with routingMode & abort signal support.
 */
export async function translateTextGoogle(
  text: string,
  apiKey?: string,
  signal?: AbortSignal,
  settings?: TranslationSettings,
  routingMode: GoogleRoutingMode = "hybrid"
): Promise<string> {
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

  const cleanText = stripFormatting(text);

  const sourceCode =
    settings?.sourceLanguage && settings.sourceLanguage !== "auto"
      ? settings.sourceLanguage
      : "auto";
  const targetCode =
    settings?.targetLanguage === "ur-roman"
      ? "ur"
      : settings?.targetLanguage || "ur";

  if (apiKey && routingMode !== "web") {
    try {
      const response = await fetch(
        `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: signal || AbortSignal.timeout(10000),
          body: JSON.stringify({
            q: cleanText,
            source: sourceCode !== "auto" ? sourceCode : undefined,
            target: targetCode,
            format: "text",
          }),
        }
      );
      if (response.status === 403) {
        throw new Error(
          "403 Forbidden: Google Cloud Translation API key invalid or lacks permissions."
        );
      }
      const data = await response.json();
      if (data.data?.translations?.[0]?.translatedText) {
        return data.data.translations[0].translatedText;
      }
      if (data.error) {
        if (data.error.code === 403)
          throw new Error("403 Forbidden: " + data.error.message);
        console.error("Google Cloud API Error:", data.error.message);
      }
    } catch (e) {
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
      console.error("Google Cloud Translate API failed:", e);
      if (routingMode === "cloud") throw e;
    }
  }

  if (routingMode === "cloud") {
    throw new Error("Cloud-Only mode selected, but no valid Google Cloud API key is set.");
  }

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(
      sourceCode
    )}&tl=${encodeURIComponent(targetCode)}&dt=t&q=${encodeURIComponent(
      cleanText
    )}`;
    const response = await fetch(url, {
      signal: signal || AbortSignal.timeout(9000),
    });
    if (response.status === 403)
      throw new Error("403 Forbidden on public endpoint");
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    if (data && data[0] && data[0][0] && data[0][0][0]) {
      return data[0].map((x: any) => x[0]).join("");
    }
  } catch (e) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    console.error("Built-in Google Translate failed:", e);
    throw e;
  }

  return "Translation Error";
}
