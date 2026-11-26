import { ProjectDraft, ProjectDraftVersion, ProjectListPlacement, StoredSubtitleFile } from '../services/db';
import { TARGET_LANGUAGES } from '../services/translationSettings';
import { refineSubtitleName } from './exportCategorizer';
import { hasFormatting } from './subtitleFormatter';

export interface OptionTagDescriptor {
  id: string;
  label: string;
  applied: boolean;
}

export interface EvaluatedProjectInfo {
  displayTitle: string;
  aiCount: number;
  gCount: number;
  aiErrorCount: number;
  gErrorCount: number;
  totalCount: number;
  hasTranslation: boolean;
  isEditedOnly: boolean;
  isCompleted: boolean;
  hasStyledLines: boolean;
  hasBilingual: boolean;
  targetLangLabel: string;
  formatLabel: string;
  optionTags: OptionTagDescriptor[];
  filterTags: string[];
}

export function getDisplayProjectTitle(draft: Pick<ProjectDraft, 'title' | 'fileName' | 'context' | 'isRenamedTitle'>): string {
  const raw = (draft.title || draft.fileName || 'Untitled Subtitles').trim();
  if (draft.isRenamedTitle) {
    return raw.replace(/\s+/g, ' ').trim();
  }
  return refineSubtitleName(raw, draft.context).refinedTitle;
}

export function getDisplayStoredFileTitle(file: Pick<StoredSubtitleFile, 'displayName' | 'name'>): string {
  const raw = (file.displayName || file.name || 'Untitled Subtitles').trim();
  if (file.displayName && !/[._]{2,}|\b(?:1080p|720p|2160p|x264|x265|hevc|web-?dl|bluray)\b/i.test(file.displayName)) {
    return raw.replace(/\s+/g, ' ').trim();
  }
  return refineSubtitleName(raw).refinedTitle;
}

export function evaluateProjectTagsAndCompletion(draft: ProjectDraft): EvaluatedProjectInfo {
  const subs = draft.subtitles || [];
  const totalCount = draft.subtitleCount || subs.length;

  let aiCount = 0;
  let aiErrorCount = 0;
  let gCount = 0;
  let gErrorCount = 0;
  let hasUrduScript = false;
  let hasLatinTrans = false;
  let hasBilingualText = false;
  let hasStyledLines = false;

  for (const s of subs) {
    const ai = (s.translatedText || '').trim();
    const g = (s.googleTranslateText || '').trim();
    const orig = (s.text || '').trim();

    if (ai) {
      if (ai === 'Translation Error') {
        aiErrorCount++;
      } else {
        aiCount++;
      }
    }
    if (g) {
      if (g === 'Translation Error') {
        gErrorCount++;
      } else {
        gCount++;
      }
    }

    const combinedTrans = `${ai} ${g}`.trim();
    if (/[\u0600-\u06FF]/.test(combinedTrans)) {
      hasUrduScript = true;
    }
    if (combinedTrans && /[a-zA-Z]/.test(combinedTrans) && !/[\u0600-\u06FF]/.test(combinedTrans)) {
      hasLatinTrans = true;
    }
    if (ai && ai.includes('\n') && /[a-zA-Z]/.test(ai) && /[\u0600-\u06FF]/.test(ai)) {
      hasBilingualText = true;
    }
    if (hasFormatting(ai) || hasFormatting(orig) || hasFormatting(g)) {
      hasStyledLines = true;
    }
  }

  // Fallback to stored summary counts when lightweight drafts omit inline subtitle text
  if (subs.length === 0) {
    aiCount = draft.translatedCount || 0;
    gCount = draft.googleCount || 0;
  }

  const hasTranslation = aiCount > 0 || gCount > 0;
  const scriptMode = draft.translationSettings?.scriptMode || 'urdu-script';
  const wantsBilingual = Boolean(scriptMode.startsWith('bilingual'));
  const wantsRoman = scriptMode === 'roman-urdu' || draft.translationSettings?.targetLanguage === 'ur-roman';
  const targetCode = (draft.translationSettings?.targetLanguage || 'ur').toLowerCase();
  const langEntry = TARGET_LANGUAGES.find((l) => l.code.toLowerCase() === targetCode);
  const targetLangLabel =
    targetCode === 'ur' || targetCode === 'ur-roman'
      ? 'Urdu'
      : langEntry?.name || targetCode.toUpperCase();

  const hasBilingual =
    hasBilingualText ||
    (wantsBilingual && aiCount > 0 && subs.some((s) => (s.translatedText || '').includes('\n'))) ||
    (wantsBilingual && aiCount > 0 && gCount > 0);

  const styledApplied = hasStyledLines || Boolean(draft.hasAppliedCustomStyle);
  const isEditedOnly = !hasTranslation && (Boolean(draft.editedInApp) || styledApplied);

  // Strict completion check:
  // - Never mark complete for Google/Neutral-only translation.
  // - Show Incomplete whenever AI translation is not started or incomplete.
  // - Show Completed ONLY when AI translation is 100% done (and if Neutral is also present, BOTH AI + Neutral are 100% done)
  //   AND all selected translation options (bilingual / custom styling) are fulfilled.
  let allTranslationsDone = false;
  if (totalCount > 0 && aiCount > 0) {
    const aiStreamDone = aiCount >= totalCount && aiErrorCount === 0;
    const hasNeutralStarted = gCount > 0 || gErrorCount > 0;
    const gStreamDone = gCount >= totalCount && gErrorCount === 0;
    allTranslationsDone = hasNeutralStarted ? aiStreamDone && gStreamDone : aiStreamDone;
  }

  const bilingualOptionOk =
    !wantsBilingual ||
    hasBilingual ||
    (subs.length === 0 && Boolean(draft.isCompleted));

  const stylingOptionOk =
    !draft.hasAppliedCustomStyle ||
    hasStyledLines ||
    subs.length === 0;

  const isCompleted =
    totalCount > 0 &&
    allTranslationsDone &&
    bilingualOptionOk &&
    stylingOptionOk &&
    (subs.length > 0 ? true : Boolean(draft.isCompleted));

  const formatLabel = (draft.detectedFormat || 'SRT')
    .split(' ')[0]
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase() || 'SRT';

  const optionTags: OptionTagDescriptor[] = [
    { id: 'ai', label: 'AI', applied: aiCount > 0 },
    { id: 'neutral', label: 'Neutral', applied: gCount > 0 },
    {
      id: 'target-lang',
      label: targetLangLabel,
      applied:
        hasTranslation &&
        (targetCode === 'ur' ? hasUrduScript || !wantsRoman : !wantsRoman),
    },
    {
      id: 'roman',
      label: 'Roman',
      applied: hasTranslation && (wantsRoman || (hasLatinTrans && !hasUrduScript)),
    },
    {
      id: 'bilingual',
      label: 'Bilingual',
      applied: hasTranslation && (hasBilingual || wantsBilingual),
    },
    { id: 'styled', label: 'Styled', applied: styledApplied },
    { id: 'format', label: formatLabel, applied: true },
  ];

  if (draft.editedInApp || isEditedOnly) {
    optionTags.splice(5, 0, {
      id: 'edited',
      label: 'Edited',
      applied: Boolean(draft.editedInApp || isEditedOnly),
    });
  }

  const filterTags: string[] = [
    isCompleted ? 'Completed' : 'Incomplete',
    ...optionTags.filter((t) => t.applied).map((t) => t.label),
  ];

  return {
    displayTitle: getDisplayProjectTitle(draft),
    aiCount,
    gCount,
    aiErrorCount,
    gErrorCount,
    totalCount,
    hasTranslation,
    isEditedOnly,
    isCompleted,
    hasStyledLines: styledApplied,
    hasBilingual,
    targetLangLabel,
    formatLabel,
    optionTags,
    filterTags,
  };
}

export function getDraftPlacements(
  draft: ProjectDraft,
  info: EvaluatedProjectInfo
): {
  inTranslated: boolean;
  inDrafts: boolean;
  inMySubtitles: boolean;
} {
  const placement: ProjectListPlacement = draft.categoryPlacement || 'auto';
  if (placement === 'translated') {
    return { inTranslated: true, inDrafts: false, inMySubtitles: false };
  }
  if (placement === 'drafts') {
    return { inTranslated: false, inDrafts: true, inMySubtitles: false };
  }
  if (placement === 'my-subtitles') {
    return { inTranslated: false, inDrafts: false, inMySubtitles: true };
  }

  // Strictly mutually exclusive placement — never show the same file with the same tags in more than one list:
  // - Translated files -> Translated Subtitles only
  // - Untranslated app-edited files -> My Subtitles only
  // - Plain/other saved snapshots -> Saved Drafts only
  if (info.hasTranslation) {
    return { inTranslated: true, inDrafts: false, inMySubtitles: false };
  }
  if (info.isEditedOnly) {
    return { inTranslated: false, inDrafts: false, inMySubtitles: true };
  }
  return { inTranslated: false, inDrafts: true, inMySubtitles: false };
}

export function getSortedDraftVersions(draft: ProjectDraft): ProjectDraftVersion[] {
  if (Array.isArray(draft.versions) && draft.versions.length > 0) {
    return [...draft.versions].sort((a, b) => b.versionNumber - a.versionNumber);
  }
  return [
    {
      versionNumber: 1,
      savedAt: draft.updatedAt,
      summary: `${draft.translatedCount || 0}/${draft.subtitleCount || draft.subtitles?.length || 0} AI`,
      subtitleCount: draft.subtitleCount || draft.subtitles?.length || 0,
      translatedCount: draft.translatedCount || 0,
      googleCount: draft.googleCount || 0,
      isCompleted: draft.isCompleted,
      editedInApp: draft.editedInApp,
      hasAppliedCustomStyle: draft.hasAppliedCustomStyle,
      subtitles: draft.subtitles || [],
      context: draft.context || '',
      customPrompt: draft.customPrompt || '',
      translationSettings: draft.translationSettings,
      activeStylingConfig: draft.activeStylingConfig,
    },
  ];
}

export function deriveStoredFileTags(file: StoredSubtitleFile): string[] {
  const tags = new Set<string>();
  if (file.sourceKind === 'exported') tags.add('Exported');
  else if (file.sourceKind === 'edited') tags.add('Edited');
  else tags.add('Local');

  if (file.isCompleted === true) tags.add('Completed');
  else if (file.isCompleted === false) tags.add('Incomplete');

  if (file.subFolder) tags.add(file.subFolder);
  if (Array.isArray(file.tags)) {
    file.tags.forEach((t) => {
      if (t && t.trim()) tags.add(t.trim());
    });
  }
  if (file.format) tags.add(file.format.toUpperCase());
  return Array.from(tags);
}
