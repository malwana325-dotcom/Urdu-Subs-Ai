import React, { useState, useMemo } from 'react';
import {
  Languages,
  Check,
  Search,
  Globe,
  BookOpen,
  Award,
  Split,
  Shield,
  Type,
} from 'lucide-react';
import {
  TranslationSettings,
  TARGET_LANGUAGES,
  SCRIPT_MODES,
  TONE_REGISTERS,
  HONORIFIC_OPTIONS,
  LOAN_WORD_OPTIONS,
  IDIOM_OPTIONS,
  LINE_BREAK_MODES,
  CONTENT_FILTERS,
  AUDIO_CUE_OPTIONS,
  NUMBER_FORMAT_OPTIONS,
  PUNCTUATION_OPTIONS,
} from '../services/translationSettings';
import { InfoPopover } from './InfoPopover';
import { cn } from '../utils/cn';

const SOURCE_LANGUAGES = [
  { code: 'auto', name: 'Auto-Detect', nativeName: 'Auto' },
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fa', name: 'Persian', nativeName: 'فارسی' },
];

interface InlineLanguageScriptSettingsProps {
  settings: TranslationSettings;
  onChange: (next: TranslationSettings) => void;
}

export const InlineLanguageScriptSettings: React.FC<InlineLanguageScriptSettingsProps> = ({
  settings,
  onChange,
}) => {
  const [subTab, setSubTab] = useState<'script' | 'language' | 'tone' | 'cultural' | 'format' | 'safety'>('script');
  const [langSearch, setLangSearch] = useState('');

  const filteredLanguages = useMemo(() => {
    if (!langSearch.trim()) return TARGET_LANGUAGES;
    const q = langSearch.toLowerCase();
    return TARGET_LANGUAGES.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.nativeName.toLowerCase().includes(q) ||
        l.code.toLowerCase().includes(q) ||
        (l.region && l.region.toLowerCase().includes(q))
    );
  }, [langSearch]);

  const update = (patch: Partial<TranslationSettings>) => {
    onChange({ ...settings, ...patch });
  };

  const currentLang = TARGET_LANGUAGES.find((l) => l.code === settings.targetLanguage) || TARGET_LANGUAGES[0];
  const currentScript = SCRIPT_MODES.find((s) => s.id === settings.scriptMode) || SCRIPT_MODES[0];

  return (
    <div className="space-y-3 text-xs">
      {/* Active Summary Strip */}
      <div
        className="p-2.5 rounded-xl border flex items-center justify-between gap-2 flex-wrap"
        style={{
          backgroundColor: 'var(--theme-elevated)',
          borderColor: 'var(--theme-border)',
        }}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold">Active Profile:</span>
          <span
            className="px-2 py-0.5 rounded-md font-bold text-[11px]"
            style={{ backgroundColor: 'var(--theme-accent-soft)', color: 'var(--theme-accent-text)' }}
          >
            {currentLang.name} ({currentLang.nativeName})
          </span>
          <span className="px-2 py-0.5 rounded-md font-mono text-[10px] border" style={{ borderColor: 'var(--theme-border)' }}>
            {currentScript.label}
          </span>
        </div>
        <InfoPopover
          title="Language & Script Profile"
          description="Changes apply immediately to Gemini AI and Google Translate runs across the Translator and Workspace tabs."
          align="right"
        />
      </div>

      {/* Sub-Menu Navigation */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {(
          [
            { id: 'script', label: 'Script & Bilingual', icon: Type },
            { id: 'language', label: 'Languages', icon: Languages },
            { id: 'tone', label: 'Tone', icon: BookOpen },
            { id: 'cultural', label: 'Honorifics', icon: Award },
            { id: 'format', label: 'Lines & Digits', icon: Split },
            { id: 'safety', label: 'Filter & Audio Cues', icon: Shield },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const active = subTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubTab(tab.id)}
              className={cn(
                "px-2.5 py-1.5 rounded-lg border text-[11px] font-bold flex items-center gap-1.5 whitespace-nowrap cursor-pointer",
                active ? "text-white" : ""
              )}
              style={
                active
                  ? { backgroundColor: 'var(--theme-accent)', borderColor: 'var(--theme-accent)' }
                  : { backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }
              }
            >
              <Icon size={12} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Script & Bilingual */}
      {subTab === 'script' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {SCRIPT_MODES.map((mode) => {
            const selected = settings.scriptMode === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => update({ scriptMode: mode.id })}
                className={cn(
                  "p-3 rounded-xl border text-left space-y-1.5 cursor-pointer transition-all",
                  selected && "ring-2 ring-[var(--theme-accent)]"
                )}
                style={{
                  backgroundColor: selected ? 'var(--theme-accent-soft)' : 'var(--theme-elevated)',
                  borderColor: selected ? 'var(--theme-accent)' : 'var(--theme-border)',
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-xs">{mode.label}</span>
                  {selected && <Check size={14} style={{ color: 'var(--theme-accent)' }} />}
                </div>
                <p className="font-urdu text-[11px] font-bold" style={{ color: 'var(--theme-accent-text)' }} dir="rtl">
                  {mode.urduLabel}
                </p>
                <p className="text-[11px] opacity-75">{mode.description}</p>
              </button>
            );
          })}
        </div>
      )}

      {/* Languages */}
      {subTab === 'language' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-[11px] opacity-80">
              <Globe size={13} />
              <span>Source Video Language</span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
              {SOURCE_LANGUAGES.map((sl) => {
                const selected = (settings.sourceLanguage || 'auto') === sl.code;
                return (
                  <button
                    key={sl.code}
                    type="button"
                    onClick={() => update({ sourceLanguage: sl.code })}
                    className={cn(
                      "p-2 rounded-xl border text-left cursor-pointer",
                      selected && "ring-2 ring-[var(--theme-accent)]"
                    )}
                    style={{
                      backgroundColor: selected ? 'var(--theme-accent-soft)' : 'var(--theme-elevated)',
                      borderColor: selected ? 'var(--theme-accent)' : 'var(--theme-border)',
                    }}
                  >
                    <p className="font-bold text-[11px] truncate">{sl.name}</p>
                    <p className="text-[10px] opacity-65 truncate">{sl.nativeName}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="font-bold text-[11px] opacity-80">Target Language ({TARGET_LANGUAGES.length})</span>
              <div className="relative min-w-[180px]">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 opacity-50" />
                <input
                  type="text"
                  value={langSearch}
                  onChange={(e) => setLangSearch(e.target.value)}
                  placeholder="Filter languages..."
                  className="w-full pl-7 pr-2.5 py-1 rounded-lg border text-[11px]"
                  style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-60 overflow-y-auto pr-1">
              {filteredLanguages.map((lang) => {
                const selected = settings.targetLanguage === lang.code;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => update({ targetLanguage: lang.code })}
                    className={cn(
                      "p-2.5 rounded-xl border text-left cursor-pointer",
                      selected && "ring-2 ring-[var(--theme-accent)]"
                    )}
                    style={{
                      backgroundColor: selected ? 'var(--theme-accent-soft)' : 'var(--theme-elevated)',
                      borderColor: selected ? 'var(--theme-accent)' : 'var(--theme-border)',
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[11px] truncate">{lang.name}</span>
                      {selected && <Check size={12} style={{ color: 'var(--theme-accent)' }} />}
                    </div>
                    <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--theme-accent-text)' }} dir={lang.direction}>
                      {lang.nativeName}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tone */}
      {subTab === 'tone' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {TONE_REGISTERS.map((tone) => {
            const selected = settings.toneRegister === tone.id;
            return (
              <button
                key={tone.id}
                type="button"
                onClick={() => update({ toneRegister: tone.id })}
                className={cn(
                  "p-3 rounded-xl border text-left space-y-1 cursor-pointer",
                  selected && "ring-2 ring-[var(--theme-accent)]"
                )}
                style={{
                  backgroundColor: selected ? 'var(--theme-accent-soft)' : 'var(--theme-elevated)',
                  borderColor: selected ? 'var(--theme-accent)' : 'var(--theme-border)',
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold">{tone.label}</span>
                  {selected && <Check size={13} style={{ color: 'var(--theme-accent)' }} />}
                </div>
                <p className="font-urdu text-[11px]" style={{ color: 'var(--theme-accent-text)' }} dir="rtl">
                  {tone.urduLabel}
                </p>
                <p className="text-[10.5px] opacity-75">{tone.description}</p>
              </button>
            );
          })}
        </div>
      )}

      {/* Cultural & Honorifics */}
      {subTab === 'cultural' && (
        <div className="space-y-3">
          <div>
            <p className="font-bold text-[11px] mb-1.5 opacity-80">Honorifics (Aap / Tum / Tu)</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {HONORIFIC_OPTIONS.map((hon) => {
                const selected = settings.honorificRegister === hon.id;
                return (
                  <button
                    key={hon.id}
                    type="button"
                    onClick={() => update({ honorificRegister: hon.id })}
                    className={cn("p-2.5 rounded-xl border text-left cursor-pointer", selected && "ring-2 ring-[var(--theme-accent)]")}
                    style={{
                      backgroundColor: selected ? 'var(--theme-accent-soft)' : 'var(--theme-elevated)',
                      borderColor: selected ? 'var(--theme-accent)' : 'var(--theme-border)',
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold">{hon.label}</span>
                      <span className="font-urdu text-[11px]" style={{ color: 'var(--theme-accent-text)' }}>{hon.urduLabel}</span>
                    </div>
                    <p className="text-[10px] opacity-75 mt-1">{hon.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="font-bold text-[11px] mb-1.5 opacity-80">Modern Loan Words & Code-Switching</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {LOAN_WORD_OPTIONS.map((lw) => {
                const selected = settings.loanWordMode === lw.id;
                return (
                  <button
                    key={lw.id}
                    type="button"
                    onClick={() => update({ loanWordMode: lw.id })}
                    className={cn("p-2.5 rounded-xl border text-left cursor-pointer", selected && "ring-2 ring-[var(--theme-accent)]")}
                    style={{
                      backgroundColor: selected ? 'var(--theme-accent-soft)' : 'var(--theme-elevated)',
                      borderColor: selected ? 'var(--theme-accent)' : 'var(--theme-border)',
                    }}
                  >
                    <span className="font-bold block">{lw.label}</span>
                    <p className="text-[10px] opacity-75 mt-0.5">{lw.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="font-bold text-[11px] mb-1.5 opacity-80">Idioms</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {IDIOM_OPTIONS.map((idm) => {
                const selected = settings.idiomMode === idm.id;
                return (
                  <button
                    key={idm.id}
                    type="button"
                    onClick={() => update({ idiomMode: idm.id })}
                    className={cn("p-2.5 rounded-xl border text-left cursor-pointer", selected && "ring-2 ring-[var(--theme-accent)]")}
                    style={{
                      backgroundColor: selected ? 'var(--theme-accent-soft)' : 'var(--theme-elevated)',
                      borderColor: selected ? 'var(--theme-accent)' : 'var(--theme-border)',
                    }}
                  >
                    <span className="font-bold block">{idm.label}</span>
                    <p className="text-[10px] opacity-75 mt-0.5">{idm.description}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Lines & Digits */}
      {subTab === 'format' && (
        <div className="space-y-3">
          <div>
            <p className="font-bold text-[11px] mb-1.5 opacity-80">Line Layout</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {LINE_BREAK_MODES.map((m) => {
                const selected = settings.lineBreakMode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => update({ lineBreakMode: m.id })}
                    className={cn("p-2.5 rounded-xl border text-left cursor-pointer", selected && "ring-2 ring-[var(--theme-accent)]")}
                    style={{
                      backgroundColor: selected ? 'var(--theme-accent-soft)' : 'var(--theme-elevated)',
                      borderColor: selected ? 'var(--theme-accent)' : 'var(--theme-border)',
                    }}
                  >
                    <span className="font-bold block">{m.label}</span>
                    <p className="text-[10px] opacity-75 mt-0.5">{m.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <p className="font-bold text-[11px] mb-1.5 opacity-80">Numerals</p>
              <div className="space-y-1.5">
                {NUMBER_FORMAT_OPTIONS.map((nf) => {
                  const selected = settings.numberFormatMode === nf.id;
                  return (
                    <button
                      key={nf.id}
                      type="button"
                      onClick={() => update({ numberFormatMode: nf.id })}
                      className={cn("w-full p-2 rounded-xl border text-left flex items-center justify-between cursor-pointer", selected && "ring-2 ring-[var(--theme-accent)]")}
                      style={{
                        backgroundColor: selected ? 'var(--theme-accent-soft)' : 'var(--theme-elevated)',
                        borderColor: selected ? 'var(--theme-accent)' : 'var(--theme-border)',
                      }}
                    >
                      <span className="font-bold text-[11px]">{nf.label}</span>
                      <span className="text-[10px] opacity-75">{nf.sample}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="font-bold text-[11px] mb-1.5 opacity-80">Punctuation</p>
              <div className="space-y-1.5">
                {PUNCTUATION_OPTIONS.map((po) => {
                  const selected = settings.punctuationMode === po.id;
                  return (
                    <button
                      key={po.id}
                      type="button"
                      onClick={() => update({ punctuationMode: po.id })}
                      className={cn("w-full p-2 rounded-xl border text-left cursor-pointer", selected && "ring-2 ring-[var(--theme-accent)]")}
                      style={{
                        backgroundColor: selected ? 'var(--theme-accent-soft)' : 'var(--theme-elevated)',
                        borderColor: selected ? 'var(--theme-accent)' : 'var(--theme-border)',
                      }}
                    >
                      <span className="font-bold text-[11px] block">{po.label}</span>
                      <span className="text-[10px] opacity-75">{po.description}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Safety & Audio Cues */}
      {subTab === 'safety' && (
        <div className="space-y-3">
          <div>
            <p className="font-bold text-[11px] mb-1.5 opacity-80">Content Moderation</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {CONTENT_FILTERS.map((f) => {
                const selected = settings.contentFilter === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => update({ contentFilter: f.id })}
                    className={cn("p-2.5 rounded-xl border text-left cursor-pointer", selected && "ring-2 ring-[var(--theme-accent)]")}
                    style={{
                      backgroundColor: selected ? 'var(--theme-accent-soft)' : 'var(--theme-elevated)',
                      borderColor: selected ? 'var(--theme-accent)' : 'var(--theme-border)',
                    }}
                  >
                    <span className="font-bold block">{f.label}</span>
                    <p className="text-[10px] opacity-75 mt-0.5">{f.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="font-bold text-[11px] mb-1.5 opacity-80">Audio Cues [SFX]</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {AUDIO_CUE_OPTIONS.map((c) => {
                const selected = settings.audioCueMode === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => update({ audioCueMode: c.id })}
                    className={cn("p-2.5 rounded-xl border text-left cursor-pointer", selected && "ring-2 ring-[var(--theme-accent)]")}
                    style={{
                      backgroundColor: selected ? 'var(--theme-accent-soft)' : 'var(--theme-elevated)',
                      borderColor: selected ? 'var(--theme-accent)' : 'var(--theme-border)',
                    }}
                  >
                    <span className="font-bold block">{c.title}</span>
                    <p className="text-[10px] opacity-75 mt-0.5">{c.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
