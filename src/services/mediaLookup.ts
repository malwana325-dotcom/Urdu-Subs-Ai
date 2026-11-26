import { refineCleanFileName } from "../utils/exportCategorizer";
import { getStoredGeminiApiKey } from "./gemini";

export type MediaLookupSource = "google" | "imdb" | "custom";

export interface MediaLookupResult {
  title: string;
  year: string;
  seasonOrEpisode: string;
  genres: string;
  cast: string;
  plotSummary: string;
  sourceLabel: string;
  sourceUrl: string;
  refinedFileName: string;
  formattedContext: string;
}

function buildRefinedTitle(title: string, year: string, seasonOrEpisode: string): string {
  const parts = [title];
  if (year && !title.includes(year)) {
    parts.push(year);
  }
  if (seasonOrEpisode && !title.toLowerCase().includes(seasonOrEpisode.toLowerCase())) {
    parts.push(seasonOrEpisode);
  }
  return refineCleanFileName(parts.filter(Boolean).join(" "));
}

function buildFormattedContext(data: {
  title: string;
  year: string;
  seasonOrEpisode: string;
  genres: string;
  cast: string;
  plotSummary: string;
  sourceLabel: string;
}): string {
  const lines: string[] = [];
  const header = [data.title, data.year ? `(${data.year})` : "", data.seasonOrEpisode]
    .filter(Boolean)
    .join(" ");
  if (header) lines.push(`Title: ${header}`);
  if (data.genres) lines.push(`Genres: ${data.genres}`);
  if (data.cast) lines.push(`Cast & Characters: ${data.cast}`);
  if (data.plotSummary) lines.push(`\nPlot & Tone Context:\n${data.plotSummary}`);
  if (data.sourceLabel) lines.push(`\nSource: ${data.sourceLabel}`);
  return lines.join("\n").trim();
}

function validatePublicCustomAddress(rawUrl: string): { valid: boolean; normalized?: string; error?: string } {
  const trimmed = rawUrl.trim();
  if (!trimmed) return { valid: false, error: "Enter a custom web address (URL)." };
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, error: "Enter a valid URL starting with https:// or http://." };
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return { valid: false, error: "Only https:// or http:// links are supported." };
  }
  const host = parsed.hostname.toLowerCase();
  if (
    !host ||
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    /^10\.|^192\.168\.|^169\.254\.|^172\.(1[6-9]|2\d|3[01])\./.test(host)
  ) {
    return { valid: false, error: "Private or local network URLs are not allowed for web lookup." };
  }
  return { valid: true, normalized: parsed.toString() };
}

async function directGeminiGoogleSearchLookup(params: {
  apiKey: string;
  source: "google" | "imdb";
  query: string;
  seasonEpisode?: string;
  model?: string;
}): Promise<MediaLookupResult> {
  const targetModel = params.model?.startsWith("gemini-") ? params.model : "gemini-4-hydrogen";
  const targetQuery = [params.query, params.seasonEpisode].filter(Boolean).join(" ").trim();
  const scope =
    params.source === "imdb"
      ? `Look up the official IMDb details for "${targetQuery}".`
      : `Look up official movie, series, or season/episode details on Google for "${targetQuery}".`;

  const prompt = `${scope}
Return ONLY valid JSON:
{
  "title": "Official clean title without extra dots or symbols",
  "year": "4-digit release year or empty string",
  "seasonOrEpisode": "Season or episode code (e.g. Season 2, S01E03) or empty string",
  "genres": "Comma-separated genres",
  "cast": "Main cast / characters",
  "plotSummary": "Concise 2-4 sentence synopsis, tone, and character relationship notes for Urdu subtitle translation",
  "sourceUrl": "Official reference URL if known"
}`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      targetModel
    )}:generateContent?key=${encodeURIComponent(params.apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        tools: [{ google_search: {} }],
      }),
    }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error?.message || `Gemini HTTP ${res.status}`);
  }
  const raw = (data?.candidates?.[0]?.content?.parts || [])
    .map((p: any) => p?.text || "")
    .join("")
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  const match = raw.match(/\{[\s\S]*\}/);
  const parsed = JSON.parse(match ? match[0] : raw);

  const title = refineCleanFileName(String(parsed?.title || params.query).trim());
  const year = String(parsed?.year || "").trim();
  const seasonOrEpisode = String(parsed?.seasonOrEpisode || params.seasonEpisode || "").trim();
  const genres = String(parsed?.genres || "").trim();
  const cast = String(parsed?.cast || "").trim();
  const plotSummary = String(parsed?.plotSummary || "").trim();
  const sourceLabel = params.source === "imdb" ? "IMDb via Google Search" : "Google Search + Gemini";
  const sourceUrl = String(parsed?.sourceUrl || "").trim();

  return {
    title,
    year,
    seasonOrEpisode,
    genres,
    cast,
    plotSummary,
    sourceLabel,
    sourceUrl,
    refinedFileName: buildRefinedTitle(title, year, seasonOrEpisode),
    formattedContext: buildFormattedContext({
      title,
      year,
      seasonOrEpisode,
      genres,
      cast,
      plotSummary,
      sourceLabel,
    }),
  };
}

export async function lookupMediaDetails(params: {
  source: MediaLookupSource;
  query: string;
  customUrl?: string;
  seasonEpisode?: string;
  geminiApiKey?: string;
  selectedModel?: string;
}): Promise<MediaLookupResult> {
  const cleanQuery = params.query.trim();
  const cleanSeasonEp = (params.seasonEpisode || "").trim();
  const cleanCustomUrl = (params.customUrl || "").trim();

  if (params.source === "custom") {
    const check = validatePublicCustomAddress(cleanCustomUrl);
    if (!check.valid) {
      throw new Error(check.error || "Invalid custom address.");
    }
  } else if (!cleanQuery && !cleanCustomUrl) {
    throw new Error("Enter a movie/series title or IMDb link first.");
  }

  // 1. Try server proxy endpoint (/api/media/lookup) when available
  try {
    const resp = await fetch("/api/media/lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: params.source,
        query: cleanQuery,
        customUrl: cleanCustomUrl,
        seasonEpisode: cleanSeasonEp,
        model: params.selectedModel?.startsWith("gemini-") ? params.selectedModel : "gemini-4-hydrogen",
      }),
    });

    const contentType = resp.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data?.error || `Lookup failed (HTTP ${resp.status})`);
      }
      const title = refineCleanFileName(String(data.title || cleanQuery || "Subtitles"));
      const year = String(data.year || "").trim();
      const seasonOrEpisode = String(data.seasonOrEpisode || cleanSeasonEp).trim();
      const genres = String(data.genres || "").trim();
      const cast = String(data.cast || "").trim();
      const plotSummary = String(data.plotSummary || "").trim();
      const sourceLabel = String(data.sourceLabel || params.source.toUpperCase());
      const sourceUrl = String(data.sourceUrl || "").trim();

      return {
        title,
        year,
        seasonOrEpisode,
        genres,
        cast,
        plotSummary,
        sourceLabel,
        sourceUrl,
        refinedFileName: buildRefinedTitle(title, year, seasonOrEpisode),
        formattedContext: buildFormattedContext({
          title,
          year,
          seasonOrEpisode,
          genres,
          cast,
          plotSummary,
          sourceLabel,
        }),
      };
    }
  } catch (serverErr: any) {
    // If server returned an explicit 4xx validation error, surface it immediately
    if (/blocked|Invalid|HTTP 4\d\d|private|URL/i.test(serverErr?.message || "")) {
      throw serverErr;
    }
    // Otherwise proceed to standalone/APK direct fallback below
  }

  // 2. Standalone APK / Direct Client Fallback
  if (params.source === "custom") {
    const check = validatePublicCustomAddress(cleanCustomUrl);
    if (!check.valid || !check.normalized) {
      throw new Error(check.error || "Invalid custom address.");
    }
    const resp = await fetch(check.normalized);
    if (!resp.ok) throw new Error(`Custom URL returned HTTP ${resp.status}.`);
    const htmlOrJson = await resp.text();
    const titleMatch = htmlOrJson.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const descMatch = htmlOrJson.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
    const title = refineCleanFileName(titleMatch?.[1] || cleanQuery || "Subtitles");
    const year = (titleMatch?.[1] || "").match(/\b(19\d{2}|20[0-3]\d)\b/)?.[1] || "";
    const plotSummary = (descMatch?.[1] || "").trim();
    return {
      title,
      year,
      seasonOrEpisode: cleanSeasonEp,
      genres: "",
      cast: "",
      plotSummary,
      sourceLabel: "Custom Address",
      sourceUrl: check.normalized,
      refinedFileName: buildRefinedTitle(title, year, cleanSeasonEp),
      formattedContext: buildFormattedContext({
        title,
        year,
        seasonOrEpisode: cleanSeasonEp,
        genres: "",
        cast: "",
        plotSummary,
        sourceLabel: "Custom Address",
      }),
    };
  }

  if (params.source === "imdb") {
    const qSlug = encodeURIComponent(cleanQuery.toLowerCase());
    const firstChar = cleanQuery.toLowerCase().replace(/[^a-z0-9]/g, "")[0] || "x";
    try {
      const sugRes = await fetch(`https://v3.sg.media-imdb.com/suggestion/${firstChar}/${qSlug}.json`);
      if (sugRes.ok) {
        const sugData = await sugRes.json();
        const hit = Array.isArray(sugData?.d)
          ? sugData.d.find((i: any) => typeof i?.id === "string" && i.id.startsWith("tt")) || sugData.d[0]
          : null;
        if (hit) {
          const title = refineCleanFileName(String(hit.l || cleanQuery));
          const year = hit.y ? String(hit.y) : "";
          const cast = String(hit.s || "");
          const genres = String(hit.q || hit.qid || "");
          const imdbId = String(hit.id || "");
          const plotSummary = `IMDb ${imdbId}${cast ? ` featuring ${cast}` : ""}.`;
          return {
            title,
            year,
            seasonOrEpisode: cleanSeasonEp,
            genres,
            cast,
            plotSummary,
            sourceLabel: `IMDb (${imdbId})`,
            sourceUrl: imdbId ? `https://www.imdb.com/title/${imdbId}/` : "",
            refinedFileName: buildRefinedTitle(title, year, cleanSeasonEp),
            formattedContext: buildFormattedContext({
              title,
              year,
              seasonOrEpisode: cleanSeasonEp,
              genres,
              cast,
              plotSummary,
              sourceLabel: `IMDb (${imdbId})`,
            }),
          };
        }
      }
    } catch {
      // fall through to Gemini direct key search
    }
  }

  const clientKey = (params.geminiApiKey || getStoredGeminiApiKey()).trim();
  if (!clientKey) {
    throw new Error(
      "Could not reach server lookup. Add your Gemini API key in the Translation Studio drawer for standalone Google/IMDb lookup."
    );
  }

  return await directGeminiGoogleSearchLookup({
    apiKey: clientKey,
    source: params.source === "imdb" ? "imdb" : "google",
    query: cleanQuery,
    seasonEpisode: cleanSeasonEp,
    model: params.selectedModel,
  });
}
