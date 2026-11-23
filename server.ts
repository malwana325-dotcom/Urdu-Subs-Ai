import "dotenv/config";
import express from "express";
import type { NextFunction, Request, Response } from "express";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import {
  DEFAULT_TRANSLATION_SETTINGS,
  TARGET_LANGUAGES,
  buildTranslationSystemInstruction,
} from "./src/services/translationSettings.ts";
import type { TranslationSettings } from "./src/services/translationSettings.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const PRIMARY_MODEL = "gemini-4-hydrogen";
const FALLBACK_MODEL = "gemini-3.1-flash-lite";

function normalizeServerModel(model?: string): string {
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

function getAiClient(): GoogleGenAI {
  const apiKey = (process.env.GEMINI_API_KEY || "").trim();
  if (!apiKey) {
    const err = new Error(
      "GEMINI_API_KEY is not configured on the server. Please set it in Settings > Secrets."
    ) as Error & { statusCode?: number };
    err.statusCode = 503;
    throw err;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

function stripFormattingServer(text: string): string {
  if (!text) return "";
  return text
    .replace(/\{\\[^}]+\}/g, "")
    .replace(/<[^>]+>/g, "")
    .trim();
}

function createRequestAbortSignal(res: Response): AbortSignal {
  const controller = new AbortController();
  res.on("close", () => {
    if (!res.writableFinished) {
      controller.abort();
    }
  });
  return controller.signal;
}

async function raceWithAbort<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return promise;
  if (signal.aborted) {
    const abortErr = new Error("Aborted");
    abortErr.name = "AbortError";
    throw abortErr;
  }

  let listener: (() => void) | undefined;
  const abortPromise = new Promise<never>((_, reject) => {
    listener = () => {
      const abortErr = new Error("Aborted");
      abortErr.name = "AbortError";
      reject(abortErr);
    };
    signal.addEventListener("abort", listener, { once: true });
  });

  try {
    return await Promise.race([promise, abortPromise]);
  } finally {
    if (listener) signal.removeEventListener("abort", listener);
  }
}

function createSubTimeoutSignal(
  parentSignal: AbortSignal,
  timeoutMs: number
): { signal: AbortSignal; cleanup: () => void } {
  const controller = new AbortController();
  const onParentAbort = () => controller.abort(parentSignal.reason);
  if (parentSignal.aborted) {
    controller.abort(parentSignal.reason);
  } else {
    parentSignal.addEventListener("abort", onParentAbort, { once: true });
  }
  const timer = setTimeout(() => {
    controller.abort(new Error(`Sub-operation timed out after ${timeoutMs}ms`));
  }, timeoutMs);
  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timer);
      parentSignal.removeEventListener("abort", onParentAbort);
    },
  };
}

async function callWithRetry<T>(
  primaryModel: string,
  fn: (model: string, attemptSignal: AbortSignal) => Promise<T>,
  retries = 3,
  delayMs = 800,
  clientSignal?: AbortSignal,
  primaryTimeoutMs = 15000,
  fallbackTimeoutMs = 60000
): Promise<T> {
  let lastError: any;
  let currentModel = normalizeServerModel(primaryModel);
  const maxAttempts = currentModel !== FALLBACK_MODEL ? Math.max(retries, 3) : retries;

  for (let i = 0; i < maxAttempts; i++) {
    if (clientSignal?.aborted) {
      const abortErr = new Error("Aborted");
      abortErr.name = "AbortError";
      throw abortErr;
    }

    const attemptController = new AbortController();
    let timedOut = false;
    const timeoutMs = currentModel !== FALLBACK_MODEL ? primaryTimeoutMs : fallbackTimeoutMs;

    const onClientAbort = () => {
      const abortErr = new Error("Aborted");
      abortErr.name = "AbortError";
      attemptController.abort(abortErr);
    };
    clientSignal?.addEventListener("abort", onClientAbort, { once: true });

    const timeoutHandle = setTimeout(() => {
      timedOut = true;
      const timeoutErr = new Error(`Model ${currentModel} timed out after ${Math.round(timeoutMs / 1000)}s`) as Error & { isAttemptTimeout?: boolean };
      timeoutErr.isAttemptTimeout = true;
      attemptController.abort(timeoutErr);
    }, timeoutMs);

    try {
      return await fn(currentModel, attemptController.signal);
    } catch (err: any) {
      lastError = err;
      const msg = String(err?.message || "");
      console.warn(`Server Gemini API attempt ${i + 1} with model ${currentModel} failed:`, timedOut ? `timeout (${timeoutMs}ms)` : msg);

      if (clientSignal?.aborted || (err?.name === "AbortError" && !timedOut && !err?.isAttemptTimeout)) {
        const abortErr = new Error("Aborted");
        abortErr.name = "AbortError";
        throw abortErr;
      }

      const isRateLimit = /429|RESOURCE_EXHAUSTED|quota|rate limit|Too Many Requests|exceeded your current quota/i.test(msg);
      if (isRateLimit) {
        if (currentModel !== FALLBACK_MODEL) {
          console.warn(`Rate/quota limit on ${currentModel}. Switching to ${FALLBACK_MODEL}.`);
          currentModel = FALLBACK_MODEL;
          continue;
        }
        err.statusCode = 429;
        err.isRateLimit = true;
        err.isQuotaExceeded = true;
        throw err;
      }

      const shouldFallback =
        timedOut ||
        Boolean(err?.isAttemptTimeout) ||
        /403|404|500|502|503|504|PERMISSION_DENIED|not found|unsupported|unregistered callers|timed out/i.test(msg);

      if (shouldFallback && currentModel !== FALLBACK_MODEL) {
        console.warn(`Switching from ${currentModel} to ${FALLBACK_MODEL} due to: ${timedOut ? "upstream timeout" : msg}`);
        currentModel = FALLBACK_MODEL;
        continue;
      }

      if (i < maxAttempts - 1) {
        const backoff = delayMs * Math.pow(1.5, i);
        await new Promise<void>((resolve, reject) => {
          if (clientSignal?.aborted) {
            const abortErr = new Error("Aborted");
            abortErr.name = "AbortError";
            return reject(abortErr);
          }
          const t = setTimeout(resolve, backoff);
          clientSignal?.addEventListener(
            "abort",
            () => {
              clearTimeout(t);
              const abortErr = new Error("Aborted");
              abortErr.name = "AbortError";
              reject(abortErr);
            },
            { once: true }
          );
        });
      }
    } finally {
      clearTimeout(timeoutHandle);
      clientSignal?.removeEventListener("abort", onClientAbort);
    }
  }

  const finalMsg = String(lastError?.message || "Unknown error");
  if (/403|PERMISSION_DENIED/i.test(finalMsg)) {
    const err = new Error(
      "403 Forbidden: API key lacks permission or model requires a paid tier. Please check your key in Settings > Secrets or switch to Gemini 3.1 Flash Lite."
    ) as Error & { statusCode?: number };
    err.statusCode = 403;
    throw err;
  }

  if (/400|API_KEY_INVALID/i.test(finalMsg)) {
    const err = new Error(
      `Invalid API key or request: ${finalMsg}. Please verify GEMINI_API_KEY in Settings > Secrets.`
    ) as Error & { statusCode?: number };
    err.statusCode = 400;
    throw err;
  }

  const err = new Error(`Gemini API failed after ${maxAttempts} attempts: ${finalMsg}`) as Error & { statusCode?: number };
  err.statusCode = lastError?.statusCode || 502;
  throw err;
}

function sendApiError(res: Response, err: any) {
  if (res.headersSent) return;
  if (err?.name === "AbortError") {
    res.status(499).json({ error: "Request aborted" });
    return;
  }
  let msg = String(err?.message || "Gemini server request failed");
  if (msg.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(msg);
      if (parsed?.error?.message) {
        msg = String(parsed.error.message);
      }
    } catch {
      // keep raw msg
    }
  }
  const isRateLimit = Boolean(
    err?.isRateLimit || /429|RESOURCE_EXHAUSTED|quota|rate limit|Too Many Requests/i.test(msg)
  );
  const statusCode =
    err?.statusCode ||
    (isRateLimit ? 429 : /403|PERMISSION_DENIED/i.test(msg) ? 403 : /404|NOT_FOUND/i.test(msg) ? 404 : 500);

  res.status(statusCode).json({
    error: msg,
    isRateLimit,
    isQuotaExceeded: isRateLimit,
  });
}

function buildNeutralPrompt(cleanText: string, settings?: TranslationSettings): string {
  let promptInstruction = `Translate the following text to Urdu literally and neutrally, like a standard machine translation: "${cleanText}"`;
  const langObj = TARGET_LANGUAGES.find((l) => l.code === settings?.targetLanguage);
  const langName = langObj ? langObj.name : "Urdu";

  if (settings?.scriptMode === "roman-urdu") {
    promptInstruction = `Translate the following dialogue into standard phonetic Roman Urdu (Latin English alphabet, e.g. "Aap yahan kya kar rahe hain?"). Output ONLY the Roman Urdu translation without quotes: "${cleanText}"`;
  } else if (settings?.scriptMode === "bilingual-en-ur") {
    promptInstruction = `Provide a bilingual subtitle (Line 1: Original English, Line 2: Literal Urdu script translation). Output exactly those 2 lines separated by a newline: "${cleanText}"`;
  } else if (settings?.scriptMode === "bilingual-en-roman") {
    promptInstruction = `Provide a bilingual subtitle (Line 1: Original English, Line 2: Phonetic Roman Urdu). Output exactly those 2 lines separated by a newline: "${cleanText}"`;
  } else if (settings?.scriptMode === "bilingual-ur-roman") {
    promptInstruction = `Provide a bilingual subtitle (Line 1: Authentic Urdu script translation, Line 2: Phonetic Roman Urdu pronunciation). Output exactly those 2 lines separated by a newline: "${cleanText}"`;
  } else if (settings?.scriptMode === "bilingual-ur-en") {
    promptInstruction = `Provide a bilingual subtitle (Line 1: Authentic Urdu script translation, Line 2: Original English dialogue). Output exactly those 2 lines separated by a newline: "${cleanText}"`;
  } else if (settings?.scriptMode === "bilingual-side-by-side") {
    promptInstruction = `Provide a single-line inline bilingual subtitle: "${cleanText} (Urdu translation)". Output on 1 line: "${cleanText}"`;
  } else if (settings?.targetLanguage && settings.targetLanguage !== "ur" && settings.targetLanguage !== "ur-roman") {
    promptInstruction = `Translate the following text to ${langName} literally and neutrally: "${cleanText}"`;
  }

  return promptInstruction;
}

async function startServer() {
  const app = express();

  app.use("/api", (req: Request, res: Response, next: NextFunction) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }
    next();
  });

  app.use(express.json({ limit: "10mb" }));

  // Handle malformed JSON / oversized payload cleanly as JSON instead of HTML error pages
  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    if (err?.type === "entity.too.large") {
      res.status(413).json({ error: "Request payload exceeds 10MB limit." });
      return;
    }
    if (err instanceof SyntaxError && "body" in err) {
      res.status(400).json({ error: "Malformed JSON request body." });
      return;
    }
    next(err);
  });

  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({
      ok: true,
      uptime: Math.round(process.uptime()),
      nodeVersion: process.version,
    });
  });

  // Safe remote subtitle fetcher to bypass browser CORS when importing online subtitle URLs
  app.post("/api/fetch-subtitles", async (req: Request, res: Response) => {
    try {
      const rawUrl = String(req.body?.url || "").trim();
      if (!rawUrl) {
        res.status(400).json({ error: "Subtitle URL is required." });
        return;
      }
      let parsed: URL;
      try {
        parsed = new URL(rawUrl);
      } catch {
        res.status(400).json({ error: "Invalid subtitle URL." });
        return;
      }
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        res.status(400).json({ error: "Only HTTP/HTTPS URLs are supported." });
        return;
      }
      const host = parsed.hostname.toLowerCase();
      if (
        host === "localhost" ||
        host === "127.0.0.1" ||
        host === "::1" ||
        host === "0.0.0.0" ||
        host.endsWith(".local") ||
        /^10\./.test(host) ||
        /^192\.168\./.test(host) ||
        /^169\.254\./.test(host) ||
        /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
      ) {
        res.status(403).json({ error: "Private or local network URLs are not allowed." });
        return;
      }

      const upstream = await fetch(parsed.toString(), {
        signal: AbortSignal.timeout(15000),
        headers: { "User-Agent": "UrduSubtitlesLocalizer/1.0" },
      });
      if (!upstream.ok) {
        res.status(upstream.status).json({
          error: `Remote server returned HTTP ${upstream.status} ${upstream.statusText}`,
        });
        return;
      }
      const content = await upstream.text();
      if (Buffer.byteLength(content, "utf8") > 5 * 1024 * 1024) {
        res.status(413).json({ error: "Remote subtitle file exceeds 5MB limit." });
        return;
      }
      res.json({ content });
    } catch (err: any) {
      res.status(502).json({
        error: err?.message || "Failed to fetch remote subtitle URL.",
      });
    }
  });

  // Health & Gemini server configuration status (never exposes secret key)
  app.get("/api/gemini/status", (_req: Request, res: Response) => {
    const configured = Boolean((process.env.GEMINI_API_KEY || "").trim());
    if (!configured) {
      res.status(503).json({
        connected: false,
        defaultModel: PRIMARY_MODEL,
        error: "GEMINI_API_KEY is not configured on the server. Add it in Settings > Secrets.",
      });
      return;
    }
    res.json({
      connected: true,
      defaultModel: PRIMARY_MODEL,
    });
  });

  // Cultural Context Analysis (fast LOW thinking + Google Search grounding + graceful fallback)
  app.post("/api/gemini/context", async (req: Request, res: Response) => {
    const signal = createRequestAbortSignal(res);
    try {
      const { subtitles = "", model = PRIMARY_MODEL } = req.body || {};
      const cleanedSubtitles = stripFormattingServer(String(subtitles || "")).slice(0, 8000);
      if (!cleanedSubtitles) {
        res.status(400).json({ error: "No subtitle dialogue text found to analyze." });
        return;
      }

      const ai = getAiClient();

      const result = await callWithRetry(
        model,
        async (activeModel, attemptSignal) => {
          const prompt = `Analyze these subtitles for accurate Urdu localization.

Include concisely:
1. CHARACTERS: Main characters, roles, and GENDERS (critical for Urdu grammar).
2. TONES & SCENARIOS: Scene mood (emotional, action, comedy, formal, casual).
3. HUMOR & SARCASM: Idioms, jokes, or sarcasm and how to adapt them naturally for Urdu speakers.
4. RELATIONSHIPS: Formality level (Aap / Tum / Tu).

Subtitles Sample:
${cleanedSubtitles}`;

          const thinkingConfig = /^gemini-(3|4)/i.test(activeModel)
            ? { thinkingLevel: ThinkingLevel.LOW }
            : undefined;

          let response;
          const searchSub = createSubTimeoutSignal(attemptSignal, 7000);
          try {
            response = await raceWithAbort(
              ai.models.generateContent({
                model: activeModel,
                contents: prompt,
                config: {
                  ...(thinkingConfig ? { thinkingConfig } : {}),
                  tools: [{ googleSearch: {} }],
                  abortSignal: searchSub.signal,
                },
              }),
              searchSub.signal
            );
          } catch (searchErr: any) {
            if (signal.aborted || attemptSignal.aborted || searchErr?.isAttemptTimeout) {
              throw searchErr;
            }
            console.warn("Search grounding returned error/timeout, falling back to direct context generation:", searchErr?.message);
          } finally {
            searchSub.cleanup();
          }

          if (!response?.text?.trim()) {
            if (attemptSignal.aborted) {
              throw new Error("Attempt timed out");
            }
            response = await raceWithAbort(
              ai.models.generateContent({
                model: activeModel,
                contents: prompt,
                config: {
                  ...(thinkingConfig ? { thinkingConfig } : {}),
                  abortSignal: attemptSignal,
                },
              }),
              attemptSignal
            );
          }

          const finalText = response?.text?.trim();
          if (!finalText) {
            throw new Error("AI model returned empty analysis text. Please try again.");
          }

          return {
            text: finalText,
            usageMetadata: response.usageMetadata,
          };
        },
        3,
        800,
        signal,
        12000,
        45000
      );

      res.json(result);
    } catch (err) {
      sendApiError(res, err);
    }
  });

  // AI Cinema Studio Insights (with Google Search grounding + graceful fallback)
  app.post("/api/gemini/cinema", async (req: Request, res: Response) => {
    const signal = createRequestAbortSignal(res);
    try {
      const { title = "", action = "all", language = "ur", model = PRIMARY_MODEL } = req.body || {};
      if (!String(title).trim()) {
        res.status(400).json({ error: "Movie or series title is required." });
        return;
      }

      const ai = getAiClient();

      const langInstructions =
        language === "ur"
          ? "Respond in rich, natural, culturally resonant Urdu (اردو) using beautiful Nastaliq phrasing, with English character/actor names in parentheses where appropriate."
          : language === "en"
          ? "Respond in fluent, articulate, engaging English with vivid storytelling and cinematic insight."
          : "Provide a Bilingual response: For every major section, provide both English and Urdu (اردو) breakdown.";

      let actionPrompt = "";
      if (action === "story") {
        actionPrompt =
          "Focus on providing a simple, easy to understand story explanation (آسان کہانی اور خلاصہ) that anyone can grasp immediately, capturing the core emotional heart of the film/series.";
      } else if (action === "plot") {
        actionPrompt =
          "Provide an in-depth, scene-by-scene / act-by-act plot breakdown (تفصیلی پلاٹ اور منظر بہ منظر وضاحت) covering Act 1 Setup, Act 2 Conflict & Escalation, Act 3 Climax, and Resolution.";
      } else if (action === "review") {
        actionPrompt =
          "Generate a comprehensive cinematic review & critical analysis (جامع تنقیدی جائزہ اور ریٹنگز) covering direction, cinematography, performances, pacing, emotional impact, strengths, weaknesses, and a final rating out of 10.";
      } else if (action === "characters") {
        actionPrompt =
          "Analyze all major characters, their psychology, motivations, relationships, and moral transformations throughout the narrative (کرداروں کا نفسیاتی تجزیہ اور تعلقات).";
      } else if (action === "ending") {
        actionPrompt =
          "Explain the ending in full detail, resolving ambiguous plot points, explaining symbolic themes, hidden metaphors, and Easter eggs (اختتام کی تفصیلی تشریح اور پوشیدہ نکات).";
      } else if (action === "context") {
        actionPrompt =
          "Provide a high-value Cultural & Dialogue Subtitle Context Aid (مکالمات اور ترجمہ کے لیے سیاق و سباق) explaining slang, period terminology, character gender nuances, and tone hints for subtitle localization.";
      } else {
        actionPrompt =
          "Provide a complete comprehensive cinema package: 1. Overview & Simple Story, 2. In-depth Plot Breakdown, 3. Character Arcs, 4. Critical Review & Rating (out of 10), 5. Ending Explanation, and 6. Subtitle Localization Notes.";
      }

      const prompt = `You are an elite cinema scholar, film critic, and master storyteller with deep knowledge of global cinema and TV series.
Movie / Series Query: "${title}"
Goal: ${actionPrompt}
Language Requirement: ${langInstructions}

Use Google Search grounding to retrieve accurate release year, cast, director, awards, and verified plot points.
Structure your response with clear, elegant markdown headers, bullet points, and highlight quotes.`;

      const result = await callWithRetry(
        model,
        async (activeModel, attemptSignal) => {
          const thinkingConfig = /^gemini-(3|4)/i.test(activeModel)
            ? { thinkingLevel: ThinkingLevel.LOW }
            : undefined;

          let response;
          const searchSub = createSubTimeoutSignal(attemptSignal, 7000);
          try {
            response = await raceWithAbort(
              ai.models.generateContent({
                model: activeModel,
                contents: prompt,
                config: {
                  ...(thinkingConfig ? { thinkingConfig } : {}),
                  tools: [{ googleSearch: {} }],
                  abortSignal: searchSub.signal,
                },
              }),
              searchSub.signal
            );
          } catch (searchErr: any) {
            if (signal.aborted || attemptSignal.aborted || searchErr?.isAttemptTimeout) {
              throw searchErr;
            }
          } finally {
            searchSub.cleanup();
          }

          if (!response?.text?.trim()) {
            if (attemptSignal.aborted) {
              throw new Error("Attempt timed out");
            }
            response = await raceWithAbort(
              ai.models.generateContent({
                model: activeModel,
                contents: prompt,
                config: {
                  ...(thinkingConfig ? { thinkingConfig } : {}),
                  abortSignal: attemptSignal,
                },
              }),
              attemptSignal
            );
          }

          const finalText = response?.text?.trim();
          if (!finalText) {
            throw new Error("No cinema insight generated. Please try again.");
          }

          return {
            text: finalText,
            usageMetadata: response.usageMetadata,
          };
        },
        3,
        800,
        signal,
        15000,
        60000
      );

      res.json(result);
    } catch (err) {
      sendApiError(res, err);
    }
  });

  // Streaming SSE endpoint for Cinema Insights (if requested)
  app.post("/api/gemini/cinema/stream", async (req: Request, res: Response) => {
    const signal = createRequestAbortSignal(res);
    try {
      const { prompt = "", model = PRIMARY_MODEL } = req.body || {};
      const ai = getAiClient();

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const streamWithModel = async (targetModel: string, timeoutMs: number) => {
        const controller = new AbortController();
        const onAbort = () => controller.abort();
        signal.addEventListener("abort", onAbort, { once: true });
        let timedOut = false;
        const timer = setTimeout(() => {
          timedOut = true;
          controller.abort();
        }, timeoutMs);

        try {
          const streamResponse = await ai.models.generateContentStream({
            model: targetModel,
            contents: String(prompt),
            config: { abortSignal: controller.signal },
          });
          let sentAny = false;
          for await (const chunk of streamResponse) {
            if (signal.aborted) break;
            if (chunk.text) {
              if (!sentAny) {
                clearTimeout(timer);
                sentAny = true;
              }
              res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
            }
          }
          if (!sentAny && timedOut) {
            throw new Error(`Stream timed out on ${targetModel}`);
          }
        } finally {
          clearTimeout(timer);
          signal.removeEventListener("abort", onAbort);
        }
      };

      try {
        await streamWithModel(model, model !== FALLBACK_MODEL ? 12000 : 45000);
      } catch (err: any) {
        if (signal.aborted || model === FALLBACK_MODEL) throw err;
        console.warn(`Stream failed on ${model}, falling back to ${FALLBACK_MODEL}:`, err?.message);
        await streamWithModel(FALLBACK_MODEL, 45000);
      }

      if (!signal.aborted) {
        res.write("data: [DONE]\n\n");
      }
      res.end();
    } catch (err) {
      if (!res.headersSent) {
        sendApiError(res, err);
      } else {
        res.write(`data: ${JSON.stringify({ error: (err as any)?.message || "Stream failed" })}\n\n`);
        res.end();
      }
    }
  });

  // Batch Subtitle Translation (Structured JSON Schema)
  app.post("/api/gemini/translate-batch", async (req: Request, res: Response) => {
    const signal = createRequestAbortSignal(res);
    try {
      const {
        items = [],
        context = "",
        customPrompt = "",
        settings,
        model = PRIMARY_MODEL,
      } = req.body || {};

      if (!Array.isArray(items) || items.length === 0) {
        res.json({ results: [], usageMetadata: { totalTokenCount: 0 } });
        return;
      }

      const ai = getAiClient();
      const cleanItems = items.map((item: any) => ({
        index: Number(item.index),
        text: stripFormattingServer(String(item.text || "")),
      }));

      const systemInstruction = buildTranslationSystemInstruction(
        settings || DEFAULT_TRANSLATION_SETTINGS,
        context,
        customPrompt
      );

      const data = await callWithRetry(
        model,
        async (activeModel, attemptSignal) => {
          const thinkingConfig = /^gemini-(3|4)/i.test(activeModel)
            ? { thinkingLevel: ThinkingLevel.LOW }
            : undefined;
          const response = await raceWithAbort(
            ai.models.generateContent({
              model: activeModel,
              contents: JSON.stringify(cleanItems),
              config: {
                systemInstruction,
                ...(thinkingConfig ? { thinkingConfig } : {}),
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
                abortSignal: attemptSignal,
              },
            }),
            attemptSignal
          );

          const text = response.text || "[]";
          const cleanedText = text.replace(/```json\n?|```/g, "").trim();
          let results: { index: number; translatedText: string }[] | null = null;

          try {
            const parsed = JSON.parse(cleanedText);
            if (Array.isArray(parsed)) {
              results = parsed.map((item: any) => ({
                index: Number(item.index),
                translatedText: String(item.translatedText || ""),
              }));
            } else if (typeof parsed === "object" && parsed !== null) {
              const possibleArray = Object.values(parsed).find((v) => Array.isArray(v));
              if (possibleArray) {
                results = (possibleArray as any[]).map((item: any) => ({
                  index: Number(item.index),
                  translatedText: String(item.translatedText || ""),
                }));
              }
            }
          } catch {
            const match = text.match(/\[[\s\S]*\]/);
            if (match) {
              const parsed = JSON.parse(match[0]);
              results = parsed.map((item: any) => ({
                index: Number(item.index),
                translatedText: String(item.translatedText || ""),
              }));
            }
          }

          if (!results) {
            throw new Error("Invalid JSON response from model: " + text.slice(0, 100));
          }

          return {
            results,
            usageMetadata: response.usageMetadata,
          };
        },
        3,
        800,
        signal,
        12000,
        60000
      );

      res.json(data);
    } catch (err) {
      sendApiError(res, err);
    }
  });

  // Neutral Machine Translation (Single Item)
  app.post("/api/gemini/neutral", async (req: Request, res: Response) => {
    const signal = createRequestAbortSignal(res);
    try {
      const { text = "", settings } = req.body || {};
      const cleanText = stripFormattingServer(String(text));
      const ai = getAiClient();

      const data = await callWithRetry(
        FALLBACK_MODEL,
        async (activeModel, attemptSignal) => {
          const promptInstruction = buildNeutralPrompt(cleanText, settings);
          const response = await raceWithAbort(
            ai.models.generateContent({
              model: activeModel,
              contents: promptInstruction,
              config: {
                thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
                abortSignal: attemptSignal,
              },
            }),
            attemptSignal
          );
          return {
            text: response.text?.trim() || "",
            usageMetadata: response.usageMetadata,
          };
        },
        3,
        600,
        signal,
        15000,
        15000
      );

      res.json(data);
    } catch (err) {
      sendApiError(res, err);
    }
  });

  // Neutral Machine Translation (Batch) - single structured JSON batch with bounded fallback
  app.post("/api/gemini/neutral-batch", async (req: Request, res: Response) => {
    const signal = createRequestAbortSignal(res);
    try {
      const { items = [], settings } = req.body || {};
      if (!Array.isArray(items) || items.length === 0) {
        res.json({ results: [] });
        return;
      }

      const ai = getAiClient();
      const cleanItems = items.map((item: any) => ({
        index: Number(item.index),
        text: stripFormattingServer(String(item.text || "")),
      }));

      const langObj = TARGET_LANGUAGES.find((l) => l.code === settings?.targetLanguage);
      const langName = langObj ? langObj.name : "Urdu";
      const targetDesc =
        settings?.scriptMode === "roman-urdu"
          ? "phonetic Roman Urdu (Latin script)"
          : settings?.scriptMode === "bilingual-en-ur"
          ? "bilingual (Line 1: Original English, Line 2: literal Urdu translation)"
          : settings?.scriptMode === "bilingual-en-roman"
          ? "bilingual (Line 1: Original English, Line 2: phonetic Roman Urdu)"
          : settings?.scriptMode === "bilingual-ur-roman"
          ? "bilingual (Line 1: Urdu script, Line 2: phonetic Roman Urdu)"
          : settings?.scriptMode === "bilingual-ur-en"
          ? "bilingual (Line 1: Urdu script, Line 2: Original English)"
          : settings?.scriptMode === "bilingual-side-by-side"
          ? "single-line inline bilingual: Original (Urdu translation)"
          : langName;

      // Fast structured JSON batch first (1 request instead of N parallel requests)
      try {
        const batchData = await callWithRetry(
          FALLBACK_MODEL,
          async (activeModel, attemptSignal) => {
            const response = await raceWithAbort(
              ai.models.generateContent({
                model: activeModel,
                contents: JSON.stringify(cleanItems),
                config: {
                  systemInstruction: `Translate each subtitle item literally and neutrally into ${targetDesc}. Preserve exact index numbers.`,
                  thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
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
                  abortSignal: attemptSignal,
                },
              }),
              attemptSignal
            );
            const raw = (response.text || "[]").replace(/```json\n?|```/g, "").trim();
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed) || parsed.length === 0) {
              throw new Error("Empty JSON array from neutral-batch");
            }
            const byIndex = new Map<number, string>();
            for (const row of parsed) {
              if (row && typeof row.index !== "undefined") {
                byIndex.set(Number(row.index), String(row.googleTranslateText || "").trim());
              }
            }
            return cleanItems.map((it) => ({
              index: it.index,
              googleTranslateText: byIndex.get(it.index) || "",
            }));
          },
          2,
          600,
          signal,
          20000,
          20000
        );
        if (batchData.some((r) => r.googleTranslateText)) {
          res.json({ results: batchData });
          return;
        }
      } catch (batchErr: any) {
        if (signal.aborted || batchErr?.isRateLimit || batchErr?.statusCode === 503) {
          throw batchErr;
        }
        console.warn("Structured neutral-batch failed, falling back to bounded concurrency:", batchErr?.message);
      }

      // Bounded concurrency fallback (max 3 concurrent) with graceful per-item recovery
      const results: { index: number; googleTranslateText: string }[] = new Array(cleanItems.length);
      let cursor = 0;
      const workerCount = Math.min(3, cleanItems.length);
      await Promise.all(
        Array.from({ length: workerCount }, async () => {
          while (cursor < cleanItems.length && !signal.aborted) {
            const pos = cursor++;
            const item = cleanItems[pos];
            try {
              const promptInstruction = buildNeutralPrompt(item.text, settings);
              const response = await callWithRetry(
                FALLBACK_MODEL,
                async (activeModel, attemptSignal) =>
                  raceWithAbort(
                    ai.models.generateContent({
                      model: activeModel,
                      contents: promptInstruction,
                      config: {
                        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
                        abortSignal: attemptSignal,
                      },
                    }),
                    attemptSignal
                  ),
                2,
                600,
                signal,
                15000,
                15000
              );
              results[pos] = {
                index: item.index,
                googleTranslateText: response.text?.trim() || "",
              };
            } catch {
              results[pos] = {
                index: item.index,
                googleTranslateText: "",
              };
            }
          }
        })
      );

      res.json({ results: results.filter(Boolean) });
    } catch (err) {
      sendApiError(res, err);
    }
  });

  // Catch-all JSON 404 for unknown API routes so SPA fallback never returns HTML
  app.all("/api/*", (_req: Request, res: Response) => {
    res.status(404).json({ error: "API endpoint not found." });
  });

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(__dirname, "dist");
    app.use(express.static(distDir));
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, "index.html"));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });

  const shutdown = () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 3000).unref();
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Promise Rejection:", reason);
});

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
