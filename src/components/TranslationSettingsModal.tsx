import React, { useState, useMemo, useEffect } from 'react';
import {
  Languages,
  BookOpen,
  X,
  Check,
  Sliders,
  Shield,
  Split,
  Type,
  Search,
  Award,
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
import { URDU_FONT_OPTIONS, ENGLISH_FONT_OPTIONS } from '../constants/fonts';
import { cn } from '../utils/cn';
import { InfoPopover } from './InfoPopover';

interface TranslationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: TranslationSettings;
  onSave: (newSettings: TranslationSettings) => void;
  urduFont: string;
  onUpdateUrduFont: (font: string) => void;
  originalFont: string;
  onUpdateOriginalFont: (font: string) => void;
  onAddLog: (msg: string, type: 'info' | 'success' | 'warning' | 'error') => void;
}

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

export const TranslationSettingsModal: React.FC<TranslationSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
  urduFont,
  onUpdateUrduFont,
  originalFont,
  onUpdateOriginalFont,
  onAddLog,
}) => {
  const [localSettings, setLocalSettings] = useState<TranslationSettings>({ ...settings });
  const [activeTab, setActiveTab] = useState<'script' | 'language' | 'tone' | 'cultural' | 'formatting' | 'moderation' | 'fonts'>('script');
  const [langSearch, setLangSearch] = useState('');

  useEffect(() => {
    if (isOpen) setLocalSettings({ ...settings });
  }, [isOpen, settings]);

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

  if (!isOpen) return null;

  const currentScriptObj = SCRIPT_MODES.find((s) => s.id === localSettings.scriptMode) || SCRIPT_MODES[0];
  const currentLangObj = TARGET_LANGUAGES.find((l) => l.code === localSettings.targetLanguage) || TARGET_LANGUAGES[0];
  const currentToneObj = TONE_REGISTERS.find((t) => t.id === localSettings.toneRegister) || TONE_REGISTERS[0];

  const handleApply = () => {
    onSave(localSettings);
    onAddLog(`Translation settings updated: ${currentLangObj.name} • ${currentScriptObj.label} • ${currentToneObj.label}.`, 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2.5 sm:p-4 bg-black/58 backdrop-touch-lock">
      <div
        className="border rounded-xl shadow-2xl max-w-[calc(100vw-20px)] sm:max-w-4xl w-full max-h-[calc(100dvh-20px)] flex flex-col overflow-hidden text-xs anim-pop-in mc-popup mc-role-ai"
        style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
      >
        {/* Header */}
        <div
          className="px-3.5 py-2.5 border-b flex items-center justify-between gap-2 shrink-0 mc-popup-header"
          style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Sliders size={15} style={{ color: 'var(--theme-accent)' }} className="mc-popup-title" />
            <h2 className="text-sm font-semibold truncate mc-popup-title">Translation Studio</h2>
            <InfoPopover
              title="Translation Engine Settings"
              description="Configure output script (Urdu, Roman Urdu, Dual-Stream), languages, honorifics (Aap/Tum/Tu), tone, line layout, moderation, and typography."
            />
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg opacity-60 hover:opacity-100 cursor-pointer">
            <X size={16} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div
          className="flex items-center gap-1 p-1.5 border-b overflow-x-auto shrink-0"
          style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
        >
          {[
            { id: 'script' as const, label: 'Script', icon: Type },
            { id: 'language' as const, label: 'Languages', icon: Languages },
            { id: 'tone' as const, label: 'Tone', icon: BookOpen },
            { id: 'cultural' as const, label: 'Honorifics', icon: Award },
            { id: 'formatting' as const, label: 'Layout', icon: Split },
            { id: 'moderation' as const, label: 'Cues', icon: Shield },
            { id: 'fonts' as const, label: 'Fonts', icon: Type },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap cursor-pointer border',
                  isActive ? 'text-white border-transparent' : 'opacity-70 hover:opacity-100'
                )}
                style={
                  isActive
                    ? { backgroundColor: 'var(--theme-accent)' }
                    : { backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }
                }
              >
                <Icon size={12} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="p-3.5 sm:p-4 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'script' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {SCRIPT_MODES.map((mode) => {
                const isSelected = localSettings.scriptMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setLocalSettings((prev) => ({ ...prev, scriptMode: mode.id }))}
                    className="p-3 rounded-xl border text-left flex flex-col justify-between gap-2 cursor-pointer"
                    style={{
                      backgroundColor: isSelected ? 'color-mix(in srgb, var(--theme-accent) 10%, var(--theme-surface))' : 'var(--theme-elevated)',
                      borderColor: isSelected ? 'var(--theme-accent)' : 'var(--theme-border)',
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-xs">{mode.label}</span>
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border" style={{ borderColor: 'var(--theme-border)' }}>
                            {mode.badge}
                          </span>
                        </div>
                        <div className="text-[11px] font-urdu mt-0.5 font-semibold" style={{ color: 'var(--theme-accent)' }} dir="rtl">
                          {mode.urduLabel}
                        </div>
                      </div>
                      {isSelected && <Check size={14} style={{ color: 'var(--theme-accent)' }} />}
                    </div>
                    <div className="p-2 rounded-lg bg-zinc-950 text-zinc-200 font-sans text-[10.5px] whitespace-pre-line">
                      {mode.sample}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {activeTab === 'language' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-xs font-semibold">Source Language</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                  {SOURCE_LANGUAGES.map((sl) => {
                    const isSelected = (localSettings.sourceLanguage || 'auto') === sl.code;
                    return (
                      <button
                        key={sl.code}
                        type="button"
                        onClick={() => setLocalSettings((prev) => ({ ...prev, sourceLanguage: sl.code }))}
                        className={cn('p-2 rounded-lg border text-left cursor-pointer', isSelected ? 'text-white border-transparent' : 'opacity-85')}
                        style={
                          isSelected
                            ? { backgroundColor: 'var(--theme-accent)' }
                            : { backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }
                        }
                      >
                        <div className="font-semibold text-[11px]">{sl.name}</div>
                        <div className="text-[9.5px] opacity-75">{sl.nativeName}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2 pt-3 border-t" style={{ borderColor: 'var(--theme-border)' }}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-xs font-semibold">Target Language</h3>
                  <div className="relative min-w-[180px]">
                    <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 opacity-50" />
                    <input
                      type="text"
                      value={langSearch}
                      onChange={(e) => setLangSearch(e.target.value)}
                      placeholder="Filter language..."
                      className="w-full pl-7 pr-2.5 py-1.5 border rounded-lg text-xs"
                      style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-[280px] overflow-y-auto pr-0.5">
                  {filteredLanguages.map((lang) => {
                    const isSelected = localSettings.targetLanguage === lang.code;
                    return (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => setLocalSettings((prev) => ({ ...prev, targetLanguage: lang.code }))}
                        className="p-2.5 rounded-lg border text-left flex flex-col justify-between gap-1 cursor-pointer"
                        style={{
                          backgroundColor: isSelected ? 'color-mix(in srgb, var(--theme-accent) 12%, var(--theme-surface))' : 'var(--theme-elevated)',
                          borderColor: isSelected ? 'var(--theme-accent)' : 'var(--theme-border)',
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-[11px] truncate">{lang.name}</span>
                          {isSelected && <Check size={12} style={{ color: 'var(--theme-accent)' }} />}
                        </div>
                        <div className="text-xs font-medium" style={{ color: 'var(--theme-accent)' }} dir={lang.direction}>
                          {lang.nativeName}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tone' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {TONE_REGISTERS.map((tone) => {
                const isSelected = localSettings.toneRegister === tone.id;
                return (
                  <button
                    key={tone.id}
                    type="button"
                    onClick={() => setLocalSettings((prev) => ({ ...prev, toneRegister: tone.id }))}
                    className="p-3 rounded-xl border text-left flex items-center justify-between gap-2 cursor-pointer"
                    style={{
                      backgroundColor: isSelected ? 'color-mix(in srgb, var(--theme-accent) 10%, var(--theme-surface))' : 'var(--theme-elevated)',
                      borderColor: isSelected ? 'var(--theme-accent)' : 'var(--theme-border)',
                    }}
                  >
                    <div>
                      <div className="font-semibold text-xs">{tone.label}</div>
                      <span className="text-xs font-urdu font-semibold block mt-0.5" style={{ color: 'var(--theme-accent)' }} dir="rtl">
                        {tone.urduLabel}
                      </span>
                    </div>
                    {isSelected && <Check size={14} style={{ color: 'var(--theme-accent)' }} />}
                  </button>
                );
              })}
            </div>
          )}

          {activeTab === 'cultural' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-xs font-semibold">Honorifics (Aap / Tum / Tu)</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {HONORIFIC_OPTIONS.map((hon) => {
                    const isSelected = localSettings.honorificRegister === hon.id;
                    return (
                      <button
                        key={hon.id}
                        type="button"
                        onClick={() => setLocalSettings((prev) => ({ ...prev, honorificRegister: hon.id }))}
                        className="p-2.5 rounded-lg border text-left flex items-center justify-between gap-2 cursor-pointer"
                        style={{
                          backgroundColor: isSelected ? 'color-mix(in srgb, var(--theme-accent) 10%, var(--theme-surface))' : 'var(--theme-elevated)',
                          borderColor: isSelected ? 'var(--theme-accent)' : 'var(--theme-border)',
                        }}
                      >
                        <span className="font-semibold text-xs">{hon.label}</span>
                        <span className="text-xs font-urdu font-semibold" style={{ color: 'var(--theme-accent)' }}>
                          {hon.urduLabel}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2 pt-3 border-t" style={{ borderColor: 'var(--theme-border)' }}>
                <h3 className="text-xs font-semibold">Modern English Loan Words</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {LOAN_WORD_OPTIONS.map((lw) => {
                    const isSelected = localSettings.loanWordMode === lw.id;
                    return (
                      <button
                        key={lw.id}
                        type="button"
                        onClick={() => setLocalSettings((prev) => ({ ...prev, loanWordMode: lw.id }))}
                        className="p-2.5 rounded-lg border text-left flex items-center justify-between cursor-pointer"
                        style={{
                          backgroundColor: isSelected ? 'color-mix(in srgb, var(--theme-accent) 10%, var(--theme-surface))' : 'var(--theme-elevated)',
                          borderColor: isSelected ? 'var(--theme-accent)' : 'var(--theme-border)',
                        }}
                      >
                        <span className="font-semibold text-xs">{lw.label}</span>
                        {isSelected && <Check size={13} style={{ color: 'var(--theme-accent)' }} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2 pt-3 border-t" style={{ borderColor: 'var(--theme-border)' }}>
                <h3 className="text-xs font-semibold">Idiom Adaptation</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {IDIOM_OPTIONS.map((idm) => {
                    const isSelected = localSettings.idiomMode === idm.id;
                    return (
                      <button
                        key={idm.id}
                        type="button"
                        onClick={() => setLocalSettings((prev) => ({ ...prev, idiomMode: idm.id }))}
                        className="p-2.5 rounded-lg border text-left flex items-center justify-between cursor-pointer"
                        style={{
                          backgroundColor: isSelected ? 'color-mix(in srgb, var(--theme-accent) 10%, var(--theme-surface))' : 'var(--theme-elevated)',
                          borderColor: isSelected ? 'var(--theme-accent)' : 'var(--theme-border)',
                        }}
                      >
                        <span className="font-semibold text-xs">{idm.label}</span>
                        {isSelected && <Check size={13} style={{ color: 'var(--theme-accent)' }} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'formatting' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-xs font-semibold">Line Layout</h3>
                <div className="space-y-1.5">
                  {LINE_BREAK_MODES.map((mode) => {
                    const isSelected = localSettings.lineBreakMode === mode.id;
                    return (
                      <label
                        key={mode.id}
                        className="flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer"
                        style={{
                          backgroundColor: isSelected ? 'color-mix(in srgb, var(--theme-accent) 10%, var(--theme-surface))' : 'var(--theme-elevated)',
                          borderColor: isSelected ? 'var(--theme-accent)' : 'var(--theme-border)',
                        }}
                      >
                        <input
                          type="radio"
                          name="lineBreakMode"
                          checked={isSelected}
                          onChange={() => setLocalSettings((prev) => ({ ...prev, lineBreakMode: mode.id }))}
                          style={{ accentColor: 'var(--theme-accent)' }}
                        />
                        <span className="font-semibold text-xs">{mode.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2 pt-3 border-t" style={{ borderColor: 'var(--theme-border)' }}>
                <h3 className="text-xs font-semibold">Digits & Numerals</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {NUMBER_FORMAT_OPTIONS.map((nf) => {
                    const isSelected = localSettings.numberFormatMode === nf.id;
                    return (
                      <button
                        key={nf.id}
                        type="button"
                        onClick={() => setLocalSettings((prev) => ({ ...prev, numberFormatMode: nf.id }))}
                        className="p-2.5 rounded-lg border text-left flex items-center justify-between cursor-pointer"
                        style={{
                          backgroundColor: isSelected ? 'color-mix(in srgb, var(--theme-accent) 10%, var(--theme-surface))' : 'var(--theme-elevated)',
                          borderColor: isSelected ? 'var(--theme-accent)' : 'var(--theme-border)',
                        }}
                      >
                        <span className="font-semibold text-xs">{nf.label}</span>
                        <span className="text-[10px] opacity-65 font-urdu">{nf.sample}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2 pt-3 border-t" style={{ borderColor: 'var(--theme-border)' }}>
                <h3 className="text-xs font-semibold">Punctuation</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {PUNCTUATION_OPTIONS.map((po) => {
                    const isSelected = localSettings.punctuationMode === po.id;
                    return (
                      <button
                        key={po.id}
                        type="button"
                        onClick={() => setLocalSettings((prev) => ({ ...prev, punctuationMode: po.id }))}
                        className="p-2.5 rounded-lg border text-left flex items-center justify-between cursor-pointer"
                        style={{
                          backgroundColor: isSelected ? 'color-mix(in srgb, var(--theme-accent) 10%, var(--theme-surface))' : 'var(--theme-elevated)',
                          borderColor: isSelected ? 'var(--theme-accent)' : 'var(--theme-border)',
                        }}
                      >
                        <span className="font-semibold text-xs">{po.label}</span>
                        {isSelected && <Check size={13} style={{ color: 'var(--theme-accent)' }} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'moderation' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-xs font-semibold">Content Moderation</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {CONTENT_FILTERS.map((filter) => {
                    const isSelected = localSettings.contentFilter === filter.id;
                    return (
                      <button
                        key={filter.id}
                        type="button"
                        onClick={() => setLocalSettings((prev) => ({ ...prev, contentFilter: filter.id }))}
                        className="p-2.5 rounded-lg border text-left flex items-center justify-between cursor-pointer"
                        style={{
                          backgroundColor: isSelected ? 'color-mix(in srgb, var(--theme-accent) 10%, var(--theme-surface))' : 'var(--theme-elevated)',
                          borderColor: isSelected ? 'var(--theme-accent)' : 'var(--theme-border)',
                        }}
                      >
                        <span className="font-semibold text-xs">{filter.label}</span>
                        {isSelected && <Check size={13} style={{ color: 'var(--theme-accent)' }} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2 pt-3 border-t" style={{ borderColor: 'var(--theme-border)' }}>
                <h3 className="text-xs font-semibold">Audio Cues [SFX]</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {AUDIO_CUE_OPTIONS.map((cue) => {
                    const isSelected = localSettings.audioCueMode === cue.id;
                    return (
                      <button
                        key={cue.id}
                        type="button"
                        onClick={() => setLocalSettings((prev) => ({ ...prev, audioCueMode: cue.id }))}
                        className="p-2.5 rounded-lg border text-left flex items-center justify-between cursor-pointer"
                        style={{
                          backgroundColor: isSelected ? 'color-mix(in srgb, var(--theme-accent) 10%, var(--theme-surface))' : 'var(--theme-elevated)',
                          borderColor: isSelected ? 'var(--theme-accent)' : 'var(--theme-border)',
                        }}
                      >
                        <span className="font-semibold text-xs">{cue.title}</span>
                        {isSelected && <Check size={13} style={{ color: 'var(--theme-accent)' }} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'fonts' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-xs font-semibold">Target Font</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                  {URDU_FONT_OPTIONS.map((font) => (
                    <button
                      key={font.name}
                      type="button"
                      onClick={() => onUpdateUrduFont(font.value)}
                      className="p-2.5 rounded-lg border text-left flex items-center justify-between cursor-pointer"
                      style={{
                        backgroundColor: urduFont === font.value ? 'color-mix(in srgb, var(--theme-accent) 10%, var(--theme-surface))' : 'var(--theme-elevated)',
                        borderColor: urduFont === font.value ? 'var(--theme-accent)' : 'var(--theme-border)',
                      }}
                    >
                      <span className="text-xs font-semibold" style={{ fontFamily: font.value }}>
                        {font.name}
                      </span>
                      {urduFont === font.value && <Check size={13} style={{ color: 'var(--theme-accent)' }} />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 pt-3 border-t" style={{ borderColor: 'var(--theme-border)' }}>
                <h3 className="text-xs font-semibold">Original Font</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                  {ENGLISH_FONT_OPTIONS.map((font) => (
                    <button
                      key={font.name}
                      type="button"
                      onClick={() => onUpdateOriginalFont(font.value)}
                      className="p-2.5 rounded-lg border text-left flex items-center justify-between cursor-pointer"
                      style={{
                        backgroundColor: originalFont === font.value ? 'color-mix(in srgb, var(--theme-accent) 10%, var(--theme-surface))' : 'var(--theme-elevated)',
                        borderColor: originalFont === font.value ? 'var(--theme-accent)' : 'var(--theme-border)',
                      }}
                    >
                      <span className="text-xs font-semibold" style={{ fontFamily: font.value }}>
                        {font.name}
                      </span>
                      {originalFont === font.value && <Check size={13} style={{ color: 'var(--theme-accent)' }} />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-3.5 py-2.5 border-t flex items-center justify-between gap-2 shrink-0 mc-popup-footer"
          style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
        >
          <span className="text-[10.5px] font-mono opacity-75 truncate">
            {currentLangObj.name} · {currentScriptObj.label} · {currentToneObj.label}
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border font-medium cursor-pointer"
              style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-4 py-1.5 rounded-lg text-white font-semibold flex items-center gap-1 cursor-pointer"
              style={{ backgroundColor: 'var(--theme-accent)' }}
            >
              <Check size={13} />
              <span>Apply</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
