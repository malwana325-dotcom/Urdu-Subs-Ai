import React, { useState } from 'react';
import {
  Film,
  Sparkles,
  X,
  Search,
  BookOpen,
  Star,
  Users,
  HelpCircle,
  Languages,
  Copy,
  Check,
  Download,
  Loader2,
  Clapperboard,
  Send,
} from 'lucide-react';
import { GeminiService } from '../services/gemini';
import { cn } from '../utils/cn';
import { InfoPopover } from './InfoPopover';

interface AiCinemaDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  geminiService: GeminiService | null;
  isGeminiConnected: boolean;
  onApplyContext: (contextText: string) => void;
  onAddLog: (msg: string, type: 'info' | 'success' | 'warning' | 'error') => void;
  onAddNotification: (msg: string, type: 'success' | 'error') => void;
}

const PRESET_MOVIES = [
  'Oppenheimer (2023)',
  'Interstellar (2014)',
  'The Legend of Maula Jatt (2022)',
  'Dune: Part Two (2024)',
  'Breaking Bad',
  'Succession',
];

const PRESET_ACTIONS = [
  { id: 'story' as const, label: 'Story', labelUrdu: 'آسان کہانی', icon: BookOpen },
  { id: 'plot' as const, label: 'Plot', labelUrdu: 'پلاٹ تجزیہ', icon: Film },
  { id: 'review' as const, label: 'Review', labelUrdu: 'تنقیدی جائزہ', icon: Star },
  { id: 'characters' as const, label: 'Characters', labelUrdu: 'کردار', icon: Users },
  { id: 'ending' as const, label: 'Ending', labelUrdu: 'اختتام', icon: HelpCircle },
  { id: 'context' as const, label: 'Sub Context', labelUrdu: 'مکالماتی سیاق', icon: Languages },
];

export const AiCinemaDrawer: React.FC<AiCinemaDrawerProps> = ({
  isOpen,
  onClose,
  geminiService,
  isGeminiConnected,
  onApplyContext,
  onAddLog,
  onAddNotification,
}) => {
  const [movieQuery, setMovieQuery] = useState('');
  const [selectedAction, setSelectedAction] = useState<'story' | 'plot' | 'review' | 'characters' | 'ending' | 'context' | 'all'>('story');
  const [language, setLanguage] = useState<'ur' | 'en' | 'bilingual'>('ur');
  const [isLoading, setIsLoading] = useState(false);
  const [resultText, setResultText] = useState('');
  const [activeMovieTitle, setActiveMovieTitle] = useState('');
  const [copied, setCopied] = useState(false);

  const handleGenerate = async (overrideQuery?: string, overrideAction?: typeof selectedAction) => {
    const q = (overrideQuery || movieQuery).trim();
    if (!q) {
      onAddNotification('Enter a movie or series title first.', 'error');
      return;
    }
    const action = overrideAction || selectedAction;
    setIsLoading(true);
    setActiveMovieTitle(q);

    try {
      if (geminiService && isGeminiConnected) {
        onAddLog(`AI Cinema analyzing "${q}" (${action}, ${language})...`, 'info');
        const insight = await geminiService.generateCinemaInsights(q, action, language);
        setResultText(insight);
        onAddLog(`AI Cinema report generated for "${q}".`, 'success');
        onAddNotification(`Generated breakdown for "${q}"`, 'success');
      } else {
        const dummyUrdu = `## ${q}\n\nکہانی کا خلاصہ اور کرداروں کا سیاق و سباق۔ لائیو تجزیہ کے لیے مینو سے Gemini API key منسلک کریں۔`;
        const dummyEn = `## ${q}\n\nStoryline overview & dialogue tone notes. Connect your Gemini key in Menu for full live analysis.`;
        setResultText(language === 'ur' ? dummyUrdu : language === 'en' ? dummyEn : `${dummyEn}\n\n---\n\n${dummyUrdu}`);
        onAddNotification(`Generated offline template for "${q}"`, 'success');
      }
    } catch (err: any) {
      onAddLog(`AI Cinema error: ${err.message}`, 'error');
      onAddNotification(`Cinema error: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!resultText) return;
    navigator.clipboard.writeText(resultText);
    setCopied(true);
    onAddNotification('Copied to clipboard', 'success');
    setTimeout(() => setCopied(false), 1800);
  };

  const handleApplyToSubtitleContext = () => {
    if (!resultText) return;
    onApplyContext(resultText);
    onAddLog(`Applied cinema context for "${activeMovieTitle}".`, 'success');
    onAddNotification('Applied as Subtitle Cultural Context', 'success');
  };

  const handleDownloadTxt = () => {
    if (!resultText) return;
    const blob = new Blob(['\ufeff' + resultText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(activeMovieTitle || 'cinema').replace(/[^a-z0-9]/gi, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 10000);
    onAddNotification('Downloaded .txt', 'success');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[125] flex items-center justify-center p-2.5 sm:p-4 bg-black/75 backdrop-blur-sm">
      <div
        className="border rounded-xl shadow-2xl max-w-[calc(100vw-20px)] sm:max-w-2xl w-full max-h-[calc(100dvh-20px)] flex flex-col overflow-hidden text-xs"
        style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
      >
        {/* Header */}
        <div
          className="px-3.5 py-2.5 border-b flex items-center justify-between gap-2 shrink-0"
          style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Clapperboard size={15} style={{ color: 'var(--theme-accent)' }} />
            <h2 className="font-semibold text-sm truncate">AI Cinema Studio</h2>
            <InfoPopover
              title="AI Cinema Studio"
              description="Generate story summaries, character arcs, and dialogue localization context for any movie or TV series, then inject it directly into Translator Context."
            />
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg opacity-60 hover:opacity-100 cursor-pointer">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
          <div className="flex gap-1.5">
            <div className="relative flex-1">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 opacity-50" />
              <input
                type="text"
                value={movieQuery}
                onChange={(e) => setMovieQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                placeholder="Movie or TV series title..."
                className="w-full pl-8 pr-7 py-2 border rounded-lg text-xs"
                style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
              />
              {movieQuery && (
                <button
                  type="button"
                  onClick={() => setMovieQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100 cursor-pointer"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => handleGenerate()}
              disabled={isLoading || !movieQuery.trim()}
              className="px-3.5 py-2 text-white rounded-lg font-semibold flex items-center gap-1.5 disabled:opacity-45 cursor-pointer shrink-0"
              style={{ backgroundColor: 'var(--theme-accent)' }}
            >
              {isLoading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
              <span>Analyze</span>
            </button>
          </div>

          <div className="flex flex-wrap gap-1">
            {PRESET_MOVIES.map((movie) => (
              <button
                key={movie}
                type="button"
                onClick={() => {
                  setMovieQuery(movie);
                  handleGenerate(movie);
                }}
                className="px-2 py-1 rounded-md border text-[10px] font-medium cursor-pointer"
                style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
              >
                {movie}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2.5 rounded-xl border" style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}>
            <div className="flex gap-1">
              {[
                { id: 'ur' as const, label: 'اردو' },
                { id: 'en' as const, label: 'English' },
                { id: 'bilingual' as const, label: 'Both' },
              ].map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setLanguage(l.id)}
                  className={cn('flex-1 py-1.5 px-2 rounded-lg text-[10.5px] font-semibold border cursor-pointer', language === l.id ? 'text-white border-transparent' : 'opacity-75')}
                  style={language === l.id ? { backgroundColor: 'var(--theme-accent)' } : { backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
                >
                  {l.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-1">
              {PRESET_ACTIONS.map((action) => {
                const Icon = action.icon;
                const active = selectedAction === action.id;
                return (
                  <button
                    key={action.id}
                    type="button"
                    onClick={() => {
                      setSelectedAction(action.id);
                      if (movieQuery.trim()) handleGenerate(movieQuery, action.id);
                    }}
                    className={cn('px-2 py-1 rounded-lg border text-[10px] font-semibold flex items-center justify-center gap-1 cursor-pointer', active ? 'text-white border-transparent' : 'opacity-75')}
                    style={active ? { backgroundColor: 'var(--theme-accent)' } : { backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
                  >
                    <Icon size={11} />
                    <span className="truncate">{action.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[11px] flex items-center gap-1">
                <Clapperboard size={12} style={{ color: 'var(--theme-accent)' }} />
                <span>Output</span>
                {activeMovieTitle && <span className="opacity-60 font-mono text-[10px]">({activeMovieTitle})</span>}
              </span>
              {resultText && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="px-2 py-1 rounded border text-[10px] font-medium flex items-center gap-1 cursor-pointer"
                    style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
                  >
                    {copied ? <Check size={11} /> : <Copy size={11} />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadTxt}
                    className="px-2 py-1 rounded border text-[10px] font-medium flex items-center gap-1 cursor-pointer"
                    style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
                  >
                    <Download size={11} />
                    <span>.txt</span>
                  </button>
                </div>
              )}
            </div>

            <div className="p-3 rounded-xl border min-h-[180px] max-h-[300px] overflow-y-auto" style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}>
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-36 gap-2 opacity-75">
                  <Loader2 size={20} className="animate-spin" style={{ color: 'var(--theme-accent)' }} />
                  <span className="text-[11px] font-medium">Analyzing &ldquo;{activeMovieTitle}&rdquo;...</span>
                </div>
              ) : resultText ? (
                <div
                  className={cn('whitespace-pre-wrap select-text text-xs', language === 'ur' ? 'font-urdu text-right leading-[2.2]' : 'leading-relaxed')}
                  dir={language === 'ur' ? 'rtl' : 'ltr'}
                >
                  {resultText}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-36 gap-1.5 opacity-55 text-center">
                  <Film size={24} />
                  <p className="text-[11px]">Enter a title above to generate story context</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="px-3.5 py-2.5 border-t flex items-center justify-end gap-2 shrink-0"
          style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
        >
          <button
            type="button"
            onClick={handleApplyToSubtitleContext}
            disabled={!resultText}
            className="px-3.5 py-1.5 text-white rounded-lg font-semibold text-xs flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
            style={{ backgroundColor: 'var(--theme-accent)' }}
          >
            <Send size={12} />
            <span>Use as Context</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg border font-medium text-xs cursor-pointer"
            style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
