import React, { useState, useEffect } from 'react';
import {
  X,
  Search,
  Film,
  Globe,
  Link2,
  Loader2,
  Check,
  Sparkles,
  FileText,
  ExternalLink,
} from 'lucide-react';
import {
  MediaLookupResult,
  MediaLookupSource,
  lookupMediaDetails,
} from '../services/mediaLookup';
import { cleanHeuristicShortTitle } from '../utils/exportCategorizer';
import { registerBackHandler } from '../utils/backNavigation';
import { useBodyScrollLock } from '../utils/scrollLock';
import { cn } from '../utils/cn';

interface MediaDetailsLoaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialFileName?: string;
  geminiApiKey?: string;
  selectedModel?: string;
  onApplyFileName?: (cleanName: string) => void;
  onApplyContext?: (contextText: string) => void;
  onAddLog?: (msg: string, type: 'info' | 'success' | 'warning' | 'error') => void;
  onAddNotification?: (msg: string, type: 'success' | 'error') => void;
}

export const MediaDetailsLoaderModal: React.FC<MediaDetailsLoaderModalProps> = ({
  isOpen,
  onClose,
  initialFileName = '',
  geminiApiKey = '',
  selectedModel = 'gemini-4-hydrogen',
  onApplyFileName,
  onApplyContext,
  onAddLog,
  onAddNotification,
}) => {
  const [source, setSource] = useState<MediaLookupSource>('google');
  const [query, setQuery] = useState('');
  const [seasonEpisode, setSeasonEpisode] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<MediaLookupResult | null>(null);

  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) return;
    const cleaned = cleanHeuristicShortTitle(initialFileName);
    if (!query && cleaned && cleaned !== 'Subtitles') {
      const epMatch = cleaned.match(/\b(S\d{1,2}\s*E\d{1,3}|Season\s*\d{1,3}|Episode\s*\d{1,3}|S\d{1,2}|E\d{1,3})\b/i);
      if (epMatch) {
        setSeasonEpisode(epMatch[1].trim());
        setQuery(cleaned.replace(epMatch[0], '').replace(/\s+/g, ' ').trim());
      } else {
        setQuery(cleaned);
      }
    }
    setErrorMsg(null);
  }, [isOpen, initialFileName]);

  useEffect(() => {
    if (!isOpen) return;
    return registerBackHandler(() => {
      onClose();
      return true;
    });
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleFetch = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);
    try {
      const data = await lookupMediaDetails({
        source,
        query,
        customUrl,
        seasonEpisode,
        geminiApiKey,
        selectedModel,
      });
      setResult(data);
      onAddLog?.(`Loaded media details (${data.sourceLabel}): ${data.refinedFileName}`, 'success');
    } catch (err: any) {
      const msg = err?.message || 'Could not load movie or season details.';
      setErrorMsg(msg);
      onAddLog?.(`Media lookup error: ${msg}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyBoth = () => {
    if (!result) return;
    onApplyFileName?.(result.refinedFileName);
    onApplyContext?.(result.formattedContext);
    onAddNotification?.(`Applied "${result.refinedFileName}" & context`, 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[125] flex items-center justify-center p-2.5 sm:p-4 bg-black/58 backdrop-touch-lock">
      <div
        className="border rounded-xl shadow-2xl max-w-[calc(100vw-20px)] sm:max-w-lg w-full max-h-[calc(100dvh-20px)] overflow-hidden text-xs flex flex-col anim-pop-in mc-popup mc-role-ai"
        style={{
          backgroundColor: 'var(--theme-surface)',
          borderColor: 'var(--theme-border)',
          color: 'var(--theme-text)',
        }}
      >
        <div
          className="px-3.5 py-2.5 border-b flex items-center justify-between shrink-0 mc-popup-header"
          style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Film size={15} style={{ color: 'var(--theme-accent)' }} className="shrink-0 mc-popup-title" />
            <h2 className="font-semibold text-sm truncate mc-popup-title">
              Load Movie / Season Details
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-lg flex items-center justify-center opacity-70 hover:opacity-100 cursor-pointer"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-3.5 space-y-3 overflow-y-auto flex-1">
          {/* Source Selector Tabs */}
          <div
            className="grid grid-cols-3 gap-1.5 p-1 rounded-xl border"
            style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
          >
            {[
              { id: 'google' as const, label: 'Google', icon: Search },
              { id: 'imdb' as const, label: 'IMDb', icon: Film },
              { id: 'custom' as const, label: 'Custom Address', icon: Link2 },
            ].map((item) => {
              const Icon = item.icon;
              const active = source === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setSource(item.id);
                    setErrorMsg(null);
                  }}
                  className={cn(
                    'min-h-[38px] px-2 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors',
                    active ? 'text-white' : 'opacity-75 hover:opacity-100'
                  )}
                  style={active ? { backgroundColor: 'var(--theme-accent)' } : undefined}
                >
                  <Icon size={13} className="shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Search / URL Form */}
          <form onSubmit={handleFetch} className="space-y-2">
            {source === 'custom' ? (
              <div className="space-y-1.5">
                <label className="text-[10.5px] font-semibold opacity-80 block">
                  Custom Movie / Season Web Address (HTTPS URL)
                </label>
                <input
                  type="url"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="https://www.imdb.com/title/tt... or Wikipedia / TMDB URL"
                  className="w-full min-h-[40px] px-3 rounded-lg border text-xs font-mono"
                  style={{
                    backgroundColor: 'var(--theme-elevated)',
                    borderColor: 'var(--theme-border)',
                    color: 'var(--theme-text)',
                  }}
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="text-[10.5px] font-semibold opacity-80 block">
                  {source === 'imdb'
                    ? 'IMDb Title, Year, or IMDb Link / ID (tt...)'
                    : 'Movie or Series Title & Year'}
                </label>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={
                    source === 'imdb'
                      ? 'e.g. Interstellar 2014 or tt0816692'
                      : 'e.g. Blades of the Guardians 2026'
                  }
                  className="w-full min-h-[40px] px-3 rounded-lg border text-xs"
                  style={{
                    backgroundColor: 'var(--theme-elevated)',
                    borderColor: 'var(--theme-border)',
                    color: 'var(--theme-text)',
                  }}
                />
              </div>
            )}

            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-1">
                <label className="text-[10.5px] font-semibold opacity-75 block">
                  Season / Episode Numerals (Optional)
                </label>
                <input
                  type="text"
                  value={seasonEpisode}
                  onChange={(e) => setSeasonEpisode(e.target.value)}
                  placeholder="e.g. S01E02, Season 2, Ep 1"
                  className="w-full min-h-[40px] px-3 rounded-lg border text-xs"
                  style={{
                    backgroundColor: 'var(--theme-elevated)',
                    borderColor: 'var(--theme-border)',
                    color: 'var(--theme-text)',
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="min-h-[40px] px-4 rounded-lg text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-60"
                style={{ backgroundColor: 'var(--theme-accent)' }}
              >
                {isLoading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Globe size={14} />
                )}
                <span>{isLoading ? 'Loading...' : 'Load Details'}</span>
              </button>
            </div>
          </form>

          {errorMsg && (
            <div className="p-2.5 rounded-lg border border-red-500/40 bg-red-500/10 text-red-400 text-[11px]">
              {errorMsg}
            </div>
          )}

          {/* Fetched Movie / Season Result Preview */}
          {result && (
            <div
              className="rounded-xl border p-3 space-y-2.5"
              style={{
                backgroundColor: 'var(--theme-elevated)',
                borderColor: 'var(--theme-accent)',
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-xs font-bold truncate">
                    {result.title}
                    {result.year ? ` (${result.year})` : ''}
                    {result.seasonOrEpisode ? ` · ${result.seasonOrEpisode}` : ''}
                  </h3>
                  <p className="text-[10px] opacity-70 truncate">
                    {result.sourceLabel}
                    {result.genres ? ` · ${result.genres}` : ''}
                  </p>
                </div>
                {result.sourceUrl && (
                  <a
                    href={result.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10.5px] font-semibold inline-flex items-center gap-1 hover:underline shrink-0"
                    style={{ color: 'var(--theme-accent-text)' }}
                  >
                    <span>Source</span>
                    <ExternalLink size={11} />
                  </a>
                )}
              </div>

              <div
                className="px-2.5 py-2 rounded-lg border text-[11px] flex items-center justify-between gap-2"
                style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
              >
                <span className="opacity-65 shrink-0">Refined Name</span>
                <span className="font-mono font-semibold truncate text-right">
                  {result.refinedFileName}
                </span>
              </div>

              {result.cast && (
                <p className="text-[11px] opacity-85">
                  <span className="font-semibold">Cast:</span> {result.cast}
                </p>
              )}

              {result.plotSummary && (
                <p className="text-[11px] opacity-85 leading-relaxed whitespace-pre-wrap">
                  {result.plotSummary}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {onApplyFileName && (
                  <button
                    type="button"
                    onClick={() => {
                      onApplyFileName(result.refinedFileName);
                      onAddNotification?.(`Filename updated: ${result.refinedFileName}`, 'success');
                    }}
                    className="min-h-[36px] px-3 rounded-lg border text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                    style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
                  >
                    <FileText size={12} style={{ color: 'var(--theme-accent)' }} />
                    <span>Apply Filename</span>
                  </button>
                )}

                {onApplyContext && (
                  <button
                    type="button"
                    onClick={() => {
                      onApplyContext(result.formattedContext);
                      onAddNotification?.('Applied details to Cultural Context', 'success');
                    }}
                    className="min-h-[36px] px-3 rounded-lg border text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                    style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
                  >
                    <Sparkles size={12} style={{ color: 'var(--theme-accent)' }} />
                    <span>Apply Context</span>
                  </button>
                )}

                {onApplyFileName && onApplyContext && (
                  <button
                    type="button"
                    onClick={handleApplyBoth}
                    className="min-h-[36px] px-3.5 rounded-lg text-white text-[11px] font-semibold flex items-center gap-1 cursor-pointer ml-auto"
                    style={{ backgroundColor: 'var(--theme-accent)' }}
                  >
                    <Check size={12} />
                    <span>Apply Both</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
