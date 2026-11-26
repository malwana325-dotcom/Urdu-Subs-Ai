import { SubtitleItem } from './srtParser';
import { TranslationSettings, TARGET_LANGUAGES, DEFAULT_TRANSLATION_SETTINGS } from '../services/translationSettings';

export interface ExportCategoryInfo {
  subFolder: string;
  tagSlug: string;
  displayLabel: string;
}

export interface RefinedSubtitleNameInfo {
  refinedTitle: string;
  baseTitle: string;
  year: string;
  season: string;
  episode: string;
  part: string;
  extension: string;
}

const RELEASE_CLUTTER_REGEX =
  /\b(2160p|1080p|720p|480p|360p|4k|uhd|hdr10\+|hdr10|hdr|dv|dovi|dolby\.?vision|imax|bluray|blu-?ray|bdrip|brrip|web-?dl|webrip|web|hdtv|dvdrip|hdrip|hdcam|camrip|telesync|remux|proper|repack|internal|extended|unrated|directors?\.?cut|theatrical|x264|x265|h\.?264|h\.?265|hevc|xvid|divx|av1|vp9|10bit|8bit|aac\d*(?:\.\d+)?|ac3|eac3|ddp\d*(?:\.\d+)?|dd\+?5\.?1|dts(?:-?hd)?|truehd|atmos|mp3|flac|esub|esubs|subtitles?|subs?|multi|dual(?:\s*audio)?|eng|english|urdu|hin|hindi|yify|yts(?:\.[a-z]+)?|rarbg|psa|ettv|eztv|galaxyrg|tigole|qxr|flux|ntb|cakes|ggez|amzn|nf|netflix|dsnp|hmax|atvp|hulu|pcok)\b/i;

const ROMAN_TO_NUM: Record<string, string> = {
  i: '1',
  ii: '2',
  iii: '3',
  iv: '4',
  v: '5',
  vi: '6',
  vii: '7',
  viii: '8',
  ix: '9',
  x: '10',
  one: '1',
  two: '2',
  three: '3',
  four: '4',
  five: '5',
  six: '6',
  seven: '7',
  eight: '8',
  nine: '9',
  ten: '10',
};

const SMALL_TITLE_WORDS = new Set([
  'a',
  'an',
  'and',
  'as',
  'at',
  'but',
  'by',
  'for',
  'from',
  'in',
  'into',
  'nor',
  'of',
  'on',
  'or',
  'over',
  'per',
  'the',
  'to',
  'vs',
  'with',
]);

function normalizeWordCasing(word: string, index: number, total: number): string {
  if (!word) return '';
  // Keep acronyms/roman numerals or S01E05 codes uppercase
  if (/^S\d{1,2}(?:E\d{1,3}(?:-E?\d{1,3})?)?$/i.test(word)) {
    return word.toUpperCase();
  }
  if (/^Ep\.?\d+$/i.test(word)) {
    return word.replace(/^ep/i, 'Ep');
  }
  if (/^(II|III|IV|VI|VII|VIII|IX|XI|XII)$/i.test(word)) {
    return word.toUpperCase();
  }
  // If the word already uses intentional mixed/uppercase (e.g. McDonald, iPhone, USA), keep if short acronym
  if (word.length <= 4 && word === word.toUpperCase() && /[A-Z]/.test(word)) {
    return word;
  }
  const lower = word.toLowerCase();
  if (index > 0 && index < total - 1 && SMALL_TITLE_WORDS.has(lower)) {
    return lower;
  }
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/**
 * Smartly parses messy movie/series/anime subtitle filenames into clean, full readable names.
 * Removes dots, codecs, resolution clutter, and extra symbols while accurately preserving:
 * - Full title (never aggressively truncated)
 * - Release Year (distinguishing title numbers like "Blade Runner 2049" or "1917" from release years)
 * - Season number & Episode number (e.g., S01E05, 2x08, Season 2 Episode 4)
 * - Part number (e.g., Part 1, Part II, Pt. 2)
 */
export function refineSubtitleName(
  rawFileName: string,
  contextText?: string
): RefinedSubtitleNameInfo {
  const raw = (rawFileName || '').trim();
  const extMatch = raw.match(/\.(srt|vtt|ass|ssa|sbv|lrc|txt|json)$/i);
  const extension = extMatch ? extMatch[1].toLowerCase() : '';

  let working = raw;
  // Strip exported app tags like [Urdu-AI], [Bilingual-Neutral-Clean], etc.
  working = working.replace(
    /\s*\[(?:Urdu|Roman-Urdu|Bilingual|English|Hindi|Arabic|Persian|Turkish|Punjabi|Pashto|Sindhi|Balochi|Saraiki|Kashmiri)[^\]]*\]/gi,
    ' '
  );
  // Strip trailing language suffix before extension (e.g. Movie.2023.en.srt -> Movie.2023)
  working = working.replace(/\.(?:en|eng|ur|urd|urdu|ar|hi|tr|fa|es|fr|auto)?\.(srt|vtt|ass|ssa|sbv|lrc|txt|json)$/i, '');
  working = working.replace(/\.(srt|vtt|ass|ssa|sbv|lrc|txt|json)$/i, '');

  // If cultural context explicitly names the Title/Movie/Series, inspect it as an optional fallback ONLY if raw is unreadable
  const ctx = (contextText || '').trim();
  const ctxTitleMatch = ctx.match(/(?:Title|Movie|Series|Show)\s*[:\-]\s*([^\n\r(|]+)/i);

  // Capture explicit parenthesized or bracketed 4-digit release years before stripping brackets
  const currentMaxYear = new Date().getFullYear() + 2;
  let explicitBracketYear = '';
  working = working.replace(/[\(\[]\s*((?:19[2-9]\d)|(?:20[0-3]\d))\s*[\)\]]/g, (_m, yr) => {
    const n = Number(yr);
    if (n >= 1920 && n <= currentMaxYear) {
      explicitBracketYear = yr;
    }
    return ' ';
  });

  // Remove remaining bracketed release tags like [YTS.MX], [TGx], (WEB-DL)
  working = working.replace(/\[[^\]]*\]/g, ' ').replace(/\([^)]*\)/g, ' ');

  // Normalize dots, underscores, and slashes into spaces while keeping H.264 / AAC5.1 intact for clutter cut
  working = working
    .replace(/(?<![Hh]\.?26)(?<!5\.)[._]+/g, ' ')
    .replace(/[._]+/g, ' ')
    .replace(/[\\/:*?"<>|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Extract Season & Episode BEFORE cutting at clutter (so S01E05 after year isn't lost)
  let season = '';
  let episode = '';
  let episodeCode = '';

  const seMatch = working.match(/\bS(\d{1,2})\s*[-–.]?\s*E(\d{1,3})(?:\s*[-–]\s*E?(\d{1,3}))?\b/i);
  if (seMatch) {
    season = String(Number(seMatch[1])).padStart(2, '0');
    const ep1 = String(Number(seMatch[2])).padStart(2, '0');
    const ep2 = seMatch[3] ? String(Number(seMatch[3])).padStart(2, '0') : '';
    episode = ep2 ? `${ep1}-E${ep2}` : ep1;
    episodeCode = `S${season}E${episode}`;
  } else {
    const wordSeMatch = working.match(
      /\bSeason\s*[-:.]?\s*(\d{1,2})\s*(?:[,.\-–]?\s*(?:Episode|Ep\.?|E)\s*[-:.]?\s*(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?)?\b/i
    );
    if (wordSeMatch) {
      season = String(Number(wordSeMatch[1])).padStart(2, '0');
      if (wordSeMatch[2]) {
        const ep1 = String(Number(wordSeMatch[2])).padStart(2, '0');
        const ep2 = wordSeMatch[3] ? String(Number(wordSeMatch[3])).padStart(2, '0') : '';
        episode = ep2 ? `${ep1}-E${ep2}` : ep1;
        episodeCode = `S${season}E${episode}`;
      } else {
        episodeCode = `Season ${Number(season)}`;
      }
    } else {
      // Check NxNN format (strictly reject resolutions like 1920x1080 or 1280x720)
      const xMatch = working.match(/\b(\d{1,2})x(\d{2,3})\b/i);
      if (xMatch && Number(xMatch[1]) >= 1 && Number(xMatch[1]) <= 40) {
        season = String(Number(xMatch[1])).padStart(2, '0');
        episode = String(Number(xMatch[2])).padStart(2, '0');
        episodeCode = `S${season}E${episode}`;
      } else {
        const epOnlyMatch = working.match(/\b(?:Episode|Ep\.?)\s*[-:.]?\s*(\d{1,3})\b/i);
        if (epOnlyMatch) {
          episode = String(Number(epOnlyMatch[1])).padStart(2, '0');
          episodeCode = `Ep ${episode}`;
        }
      }
    }
  }

  // Extract Part number (Part 1, Pt. 2, Part II, Part Two)
  let part = '';
  const partMatch = working.match(
    /\b(?:Part|Pt\.?)\s*[-:.]?\s*(\d{1,2}|I{1,3}|IV|VI{0,3}|IX|X|One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten)\b/i
  );
  if (partMatch) {
    const rawPart = partMatch[1].toLowerCase();
    const normalizedNum = ROMAN_TO_NUM[rawPart] || String(Number(rawPart) || partMatch[1]);
    part = `Part ${normalizedNum}`;
  }

  // Cut trailing release clutter (1080p, BluRay, WEB-DL, x265, etc.)
  const clutterIdx = working.search(RELEASE_CLUTTER_REGEX);
  let preClutter = clutterIdx > 1 ? working.slice(0, clutterIdx).trim() : working;

  // Remove extracted Season/Episode and Part tokens from preClutter so we isolate pure Title + Year
  if (seMatch) {
    preClutter = preClutter.replace(seMatch[0], ' ');
  }
  const wordSeCleanup = preClutter.match(
    /\bSeason\s*[-:.]?\s*\d{1,2}(?:\s*[,.\-–]?\s*(?:Episode|Ep\.?|E)\s*[-:.]?\s*\d{1,3}(?:\s*[-–]\s*\d{1,3})?)?\b/i
  );
  if (wordSeCleanup) preClutter = preClutter.replace(wordSeCleanup[0], ' ');
  const xCleanup = preClutter.match(/\b\d{1,2}x\d{2,3}\b/i);
  if (xCleanup && Number(xCleanup[0].split(/x/i)[0]) <= 40) {
    preClutter = preClutter.replace(xCleanup[0], ' ');
  }
  const epCleanup = preClutter.match(/\b(?:Episode|Ep\.?)\s*[-:.]?\s*\d{1,3}\b/i);
  if (epCleanup) preClutter = preClutter.replace(epCleanup[0], ' ');
  if (partMatch) {
    preClutter = preClutter.replace(partMatch[0], ' ');
  }

  preClutter = preClutter.replace(/\s+/g, ' ').replace(/[-–—:\s]+$/g, '').trim();

  // Extract Release Year carefully without stealing title numbers like "Blade Runner 2049" or "1917"
  let year = explicitBracketYear;
  if (!year) {
    const tokens = preClutter.split(/\s+/).filter(Boolean);
    const yearIndices: number[] = [];
    tokens.forEach((tok, idx) => {
      const cleanTok = tok.replace(/^[-–]+|[-–]+$/g, '');
      if (/^(?:19[2-9]\d|20[0-3]\d)$/.test(cleanTok)) {
        const n = Number(cleanTok);
        if (n >= 1920 && n <= currentMaxYear) {
          yearIndices.push(idx);
        }
      }
    });
    // Pick the last standalone valid release year if it is NOT the very first token (title like "1917")
    if (yearIndices.length > 0) {
      const candidateIdx = yearIndices[yearIndices.length - 1];
      if (candidateIdx > 0) {
        year = tokens[candidateIdx].replace(/^[-–]+|[-–]+$/g, '');
        tokens.splice(candidateIdx, 1);
        preClutter = tokens.join(' ');
      }
    }
  }

  // Also check right before clutter if year sat right after S01E02 (e.g. "Show S01E02 2024 1080p")
  if (!year && clutterIdx > 1) {
    const postTokens = working.slice(0, clutterIdx).match(/\b((?:19[2-9]\d)|(?:20[0-3]\d))\b/g);
    if (postTokens && postTokens.length > 0) {
      const lastCandidate = Number(postTokens[postTokens.length - 1]);
      if (lastCandidate >= 1920 && lastCandidate <= currentMaxYear && !preClutter.startsWith(String(lastCandidate))) {
        year = String(lastCandidate);
      }
    }
  }

  // Clean stray dashes/symbols and format Title Case while preserving full title words
  let cleanBase = preClutter
    .replace(/\s*[-–—]+\s*$/g, '')
    .replace(/^\s*[-–—]+\s*/g, '')
    .replace(/\s+-\s+-\s+/g, ' - ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleanBase && ctxTitleMatch?.[1]) {
    cleanBase = ctxTitleMatch[1].replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim();
  }
  if (!cleanBase) {
    cleanBase = 'Untitled Subtitles';
  }

  const baseWords = cleanBase.split(/\s+/).filter(Boolean);
  const formattedBase = baseWords
    .map((w, i) => normalizeWordCasing(w, i, baseWords.length))
    .join(' ');

  const parts: string[] = [formattedBase];
  if (year && !formattedBase.includes(`(${year})`)) {
    parts.push(`(${year})`);
  }
  if (episodeCode) {
    parts.push(episodeCode);
  }
  if (part && !formattedBase.toLowerCase().includes(part.toLowerCase())) {
    parts.push(part);
  }

  const refinedTitle = parts.join(' ').replace(/\s+/g, ' ').trim();

  return {
    refinedTitle,
    baseTitle: formattedBase,
    year,
    season,
    episode,
    part,
    extension,
  };
}

/**
 * Resolves the target local storage subfolder and filename tag for an exported subtitle stream.
 */
export function resolveExportCategory(params: {
  streamType: 'ai' | 'google' | 'original';
  translationSettings?: TranslationSettings;
  subtitles?: SubtitleItem[];
}): ExportCategoryInfo {
  const settings = params.translationSettings || DEFAULT_TRANSLATION_SETTINGS;
  const engineTag = params.streamType === 'ai' ? 'AI' : 'Neutral';
  const engineFolder = params.streamType === 'ai' ? 'AI' : 'Neutral';

  if (params.streamType === 'original') {
    const src = (settings.sourceLanguage || 'auto').toLowerCase();
    const langEntry = TARGET_LANGUAGES.find((l) => l.code.toLowerCase() === src);
    if (src === 'en' || src === 'eng' || src === 'english') {
      return { subFolder: 'English', tagSlug: '[English]', displayLabel: 'English' };
    }
    if (langEntry && langEntry.code !== 'ur' && langEntry.code !== 'ur-roman') {
      return {
        subFolder: langEntry.name,
        tagSlug: `[${langEntry.name.replace(/\s+/g, '-')}]`,
        displayLabel: langEntry.name,
      };
    }
    const sample = (params.subtitles || [])
      .slice(0, 12)
      .map((s) => s.text || '')
      .join(' ');
    const hasUrduArabic = /[\u0600-\u06FF]/.test(sample);
    if (!hasUrduArabic && /[a-zA-Z]/.test(sample)) {
      return { subFolder: 'English', tagSlug: '[English]', displayLabel: 'English' };
    }
    if (hasUrduArabic) {
      return { subFolder: 'Urdu (Original)', tagSlug: '[Urdu-Orig]', displayLabel: 'Urdu (Original)' };
    }
    return { subFolder: 'English', tagSlug: '[English]', displayLabel: 'English' };
  }

  const scriptMode = settings.scriptMode || 'urdu-script';
  if (scriptMode.startsWith('bilingual')) {
    return {
      subFolder: 'Bilingual',
      tagSlug: `[Bilingual-${engineTag}]`,
      displayLabel: `Bilingual (${engineFolder})`,
    };
  }

  if (scriptMode === 'roman-urdu' || settings.targetLanguage === 'ur-roman') {
    return {
      subFolder: 'Roman Urdu',
      tagSlug: `[Roman-Urdu-${engineTag}]`,
      displayLabel: `Roman Urdu (${engineFolder})`,
    };
  }

  const targetCode = (settings.targetLanguage || 'ur').toLowerCase();
  if (targetCode === 'ur' || targetCode === 'urdu') {
    return {
      subFolder: `Urdu (${engineFolder})`,
      tagSlug: `[Urdu-${engineTag}]`,
      displayLabel: `Urdu (${engineFolder})`,
    };
  }

  const langObj = TARGET_LANGUAGES.find((l) => l.code.toLowerCase() === targetCode);
  const langName = langObj?.name || targetCode.toUpperCase();
  const safeTag = langName.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '');
  return {
    subFolder: `${langName} (${engineFolder})`,
    tagSlug: `[${safeTag}-${engineTag}]`,
    displayLabel: `${langName} (${engineFolder})`,
  };
}

/**
 * Strips release clutter into a full, refined title keeping Name, Year, Part, Season, and Episode intact.
 */
export function cleanHeuristicShortTitle(rawFileName: string, contextText?: string): string {
  return refineSubtitleName(rawFileName, contextText).refinedTitle;
}

/**
 * Formats the final exported subtitle filename with clean base name, auto tag, and proper extension.
 */
export function buildTaggedExportFileName(params: {
  baseTitle: string;
  tagSlug?: string;
  extension: string;
  includeTag?: boolean;
}): string {
  const cleanExt = params.extension.replace(/^\.+/, '');
  let base = (params.baseTitle || 'Subtitles')
    .replace(/\.(srt|vtt|ass|ssa|sbv|lrc|txt|json)$/i, '')
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!base) base = 'Subtitles';

  if (params.includeTag !== false && params.tagSlug) {
    const cleanTag = params.tagSlug.trim();
    if (!base.toLowerCase().includes(cleanTag.toLowerCase())) {
      base = `${base} ${cleanTag}`;
    }
  }

  return `${base}.${cleanExt}`;
}

export function refineCleanFileName(rawFileName: string, contextText?: string): string {
  return refineSubtitleName(rawFileName, contextText).refinedTitle;
}

export interface AppliedTranslationTagInfo {
  primaryTags: string[];
  oneLineSummary: string;
  filenameTagSlug: string;
  settingsTagSlug: string;
  parameterTags: Array<{ key: string; label: string; value: string }>;
}

export function buildAppliedTranslationTagInfo(params: {
  streamType: 'ai' | 'google' | 'original';
  translationSettings?: TranslationSettings;
  subtitles?: SubtitleItem[];
  selectedModelName?: string;
  aiWorkers?: number;
  aiBatchSize?: number;
  googleWorkers?: number;
  googleBatchSize?: number;
  googleRoutingMode?: string;
}): AppliedTranslationTagInfo {
  const settings = params.translationSettings || DEFAULT_TRANSLATION_SETTINGS;
  const cat = resolveExportCategory({
    streamType: params.streamType,
    translationSettings: settings,
    subtitles: params.subtitles,
  });

  const primaryTags: string[] = [];
  if (params.streamType === 'ai') primaryTags.push('AI');
  else if (params.streamType === 'google') primaryTags.push('Neutral/Google');
  else primaryTags.push('English');

  const scriptMode = settings.scriptMode || 'urdu-script';
  const targetCode = (settings.targetLanguage || 'ur').toLowerCase();
  const targetLangEntry = TARGET_LANGUAGES.find((l) => l.code.toLowerCase() === targetCode);
  const targetLangName =
    targetCode === 'ur' || targetCode === 'ur-roman'
      ? 'Urdu'
      : targetLangEntry?.name || targetCode.toUpperCase();

  if (params.streamType !== 'original') {
    if (scriptMode === 'roman-urdu' || targetCode === 'ur-roman') {
      primaryTags.push('Roman Urdu');
    } else if (scriptMode.startsWith('bilingual')) {
      primaryTags.push(targetCode === 'ur-roman' || scriptMode.includes('roman') ? 'Roman Urdu+English' : `${targetLangName}+English`);
    } else {
      primaryTags.push(targetLangName);
    }
  }

  const parameterTags: Array<{ key: string; label: string; value: string }> = [
    {
      key: 'engine',
      label: 'Engine',
      value: params.streamType === 'ai' ? 'AI Localization' : params.streamType === 'google' ? 'Neutral/Google' : 'Original Source',
    },
    {
      key: 'language',
      label: 'Target Language',
      value: scriptMode === 'roman-urdu' ? 'Roman Urdu' : targetLangName,
    },
    {
      key: 'script',
      label: 'Script Mode',
      value: scriptMode,
    },
    {
      key: 'tone',
      label: 'Tone Register',
      value: settings.toneRegister || 'aam-bolchal',
    },
    {
      key: 'honorifics',
      label: 'Honorifics',
      value: settings.honorificRegister || 'contextual',
    },
    {
      key: 'loanwords',
      label: 'Loanwords',
      value: settings.loanWordMode || 'natural-blend',
    },
    {
      key: 'linebreaks',
      label: 'Line Breaks',
      value: settings.lineBreakMode || 'smart-two-line',
    },
    {
      key: 'cues',
      label: 'Audio Cues',
      value: settings.audioCueMode || 'translate',
    },
  ];

  if (params.selectedModelName && params.streamType === 'ai') {
    parameterTags.push({
      key: 'model',
      label: 'Model',
      value: params.selectedModelName,
    });
  }

  if (params.streamType === 'ai' && (params.aiWorkers || params.aiBatchSize)) {
    parameterTags.push({
      key: 'throughput',
      label: 'Concurrency',
      value: `${params.aiWorkers || 1}w × ${params.aiBatchSize || 20} lines`,
    });
  } else if (params.streamType === 'google' && (params.googleWorkers || params.googleBatchSize)) {
    parameterTags.push({
      key: 'throughput',
      label: 'Concurrency',
      value: `${params.googleWorkers || 1}w × ${params.googleBatchSize || 20} lines${params.googleRoutingMode ? ` (${params.googleRoutingMode})` : ''}`,
    });
  }

  const tonePart = settings.toneRegister || 'aam-bolchal';
  const oneLineSummary =
    params.streamType === 'ai'
      ? `${cat.displayLabel} · ${tonePart} · ${params.selectedModelName || 'AI'}`
      : `${cat.displayLabel}${params.googleRoutingMode ? ` · ${params.googleRoutingMode}` : ''}`;

  const settingsSlugCore = [
    cat.tagSlug.replace(/^\[|\]$/g, ''),
    settings.toneRegister && settings.toneRegister !== 'neutral' ? settings.toneRegister : '',
  ]
    .filter(Boolean)
    .join('-');

  return {
    primaryTags: Array.from(new Set(primaryTags)),
    oneLineSummary,
    filenameTagSlug: cat.tagSlug,
    settingsTagSlug: `[${settingsSlugCore}]`,
    parameterTags,
  };
}

