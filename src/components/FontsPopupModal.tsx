import React from 'react';
import { Languages, X, Check, Upload, Trash2, RotateCcw, Plus } from 'lucide-react';
import { URDU_FONT_OPTIONS, ENGLISH_FONT_OPTIONS, CustomFontItem } from '../constants/fonts';
import { InfoPopover } from './InfoPopover';
import { useBodyScrollLock } from '../utils/scrollLock';
import { cn } from '../utils/cn';

interface FontsPopupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: () => void;
  onResetDraft: () => void;
  isDirty: boolean;
  draftFontTarget: 'global' | 'original' | 'ai' | 'google';
  onChangeDraftFontTarget: (target: 'global' | 'original' | 'ai' | 'google') => void;
  fontsActiveTab: 'english' | 'urdu' | 'local';
  onChangeFontsActiveTab: (tab: 'english' | 'urdu' | 'local') => void;
  draftOriginalFont: string;
  draftUrduFont: string;
  draftGoogleFont: string;
  draftGlobalFont: string;
  draftIsGlobalFontActive: boolean;
  onSelectFont: (name: string, value: string) => void;
  localFonts: CustomFontItem[];
  customFontInputName: string;
  onChangeCustomFontInputName: (val: string) => void;
  onAddNamedFont: () => void;
  onUploadFontFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDeleteLocalFont: (id: string, e: React.MouseEvent) => void;
  isUploadingFont: boolean;
  previewSource: { plain: string };
  previewAi: { plain: string };
  previewGoogle: { plain: string };
}

export const FontsPopupModal: React.FC<FontsPopupModalProps> = ({
  isOpen,
  onClose,
  onApply,
  onResetDraft,
  isDirty,
  draftFontTarget,
  onChangeDraftFontTarget,
  fontsActiveTab,
  onChangeFontsActiveTab,
  draftOriginalFont,
  draftUrduFont,
  draftGoogleFont,
  draftGlobalFont,
  draftIsGlobalFontActive,
  onSelectFont,
  localFonts,
  customFontInputName,
  onChangeCustomFontInputName,
  onAddNamedFont,
  onUploadFontFile,
  onDeleteLocalFont,
  isUploadingFont,
  previewSource,
  previewAi,
  previewGoogle,
}) => {
  useBodyScrollLock(isOpen);
  if (!isOpen) return null;

  const effectiveOriginalFont = draftIsGlobalFontActive ? draftGlobalFont : draftOriginalFont;
  const effectiveAiFont = draftIsGlobalFontActive ? draftGlobalFont : draftUrduFont;
  const effectiveGoogleFont = draftIsGlobalFontActive ? draftGlobalFont : draftGoogleFont;

  const getFontLabel = (val: string) => {
    const urdu = URDU_FONT_OPTIONS.find((f) => f.value === val);
    if (urdu) return urdu.name;
    const eng = ENGLISH_FONT_OPTIONS.find((f) => f.value === val);
    if (eng) return eng.name;
    const loc = localFonts.find((f) => f.value === val);
    if (loc) return loc.name;
    return val.split(',')[0].replace(/['"]/g, '').trim() || 'Custom';
  };

  const isFontActive = (val: string) => {
    if (draftFontTarget === 'global') return draftIsGlobalFontActive && draftGlobalFont === val;
    if (draftFontTarget === 'original') return !draftIsGlobalFontActive && draftOriginalFont === val;
    if (draftFontTarget === 'ai') return !draftIsGlobalFontActive && draftUrduFont === val;
    if (draftFontTarget === 'google') return !draftIsGlobalFontActive && draftGoogleFont === val;
    return false;
  };

  const activePreview =
    draftFontTarget === 'original'
      ? {
          tag: `Original · ${getFontLabel(effectiveOriginalFont)}`,
          font: effectiveOriginalFont,
          text: previewSource.plain,
          rtl: false,
        }
      : draftFontTarget === 'google'
      ? {
          tag: `Google · ${getFontLabel(effectiveGoogleFont)}`,
          font: effectiveGoogleFont,
          text: previewGoogle.plain,
          rtl: true,
        }
      : {
          tag: `${draftFontTarget === 'global' ? 'All Streams' : 'AI Urdu'} · ${getFontLabel(effectiveAiFont)}`,
          font: effectiveAiFont,
          text: previewAi.plain,
          rtl: true,
        };

  return (
    <div
      className="fixed inset-0 z-[150] bg-black/55 backdrop-blur-[2px] flex items-center justify-center p-3 backdrop-touch-lock"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
      onTouchMove={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="border rounded-xl shadow-2xl w-full max-w-[min(450px,calc(100vw-24px))] max-h-[calc(100dvh-24px)] flex flex-col overflow-hidden text-xs overscroll-contain"
        style={{
          backgroundColor: 'var(--theme-surface)',
          borderColor: 'var(--theme-border)',
          color: 'var(--theme-text)',
        }}
      >
        {/* Header */}
        <div
          className="px-3.5 py-2.5 border-b flex items-center justify-between gap-2 shrink-0"
          style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Languages size={15} style={{ color: 'var(--theme-accent)' }} className="shrink-0" />
            <h3 className="font-semibold text-xs truncate">Fonts</h3>
            {isDirty && <span className="text-[10px] font-semibold text-amber-500">· Draft</span>}
            <InfoPopover
              title="Stream Typeface Picker"
              description="Pick a stream (All, Original, AI, Google), choose an Urdu, English, or uploaded custom font, and tap Apply."
              align="left"
            />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center opacity-70 hover:opacity-100 cursor-pointer"
            aria-label="Close fonts menu"
          >
            <X size={15} />
          </button>
        </div>

        {/* Stream Selector + Single Clean Preview Strip */}
        <div className="px-3.5 pt-3 pb-2 space-y-2.5 border-b shrink-0" style={{ borderColor: 'var(--theme-border)' }}>
          <div
            className="grid grid-cols-4 gap-1 p-1 rounded-xl border"
            style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
          >
            {[
              { id: 'global' as const, label: 'All' },
              { id: 'original' as const, label: 'Original' },
              { id: 'ai' as const, label: 'AI' },
              { id: 'google' as const, label: 'Google' },
            ].map((target) => {
              const active = draftFontTarget === target.id;
              return (
                <button
                  key={target.id}
                  type="button"
                  onClick={() => onChangeDraftFontTarget(target.id)}
                  className={cn(
                    'min-h-[32px] rounded-lg text-[11px] font-semibold cursor-pointer transition-colors',
                    active ? 'text-white' : 'opacity-70 hover:opacity-100'
                  )}
                  style={active ? { backgroundColor: 'var(--theme-accent)' } : undefined}
                >
                  {target.label}
                </button>
              );
            })}
          </div>

          <div
            className="rounded-xl border px-3 py-2 space-y-1"
            style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
          >
            <div className="text-[10px] font-mono opacity-60 truncate">{activePreview.tag}</div>
            <div
              dir={activePreview.rtl ? 'rtl' : 'ltr'}
              className={cn('truncate text-sm', activePreview.rtl ? 'font-urdu text-right' : 'text-left')}
              style={{ fontFamily: activePreview.font }}
            >
              {activePreview.text}
            </div>
          </div>

          {/* Font Category Tabs */}
          <div className="flex border-b -mb-2" style={{ borderColor: 'var(--theme-border)' }}>
            {[
              { id: 'urdu' as const, label: `Urdu (${URDU_FONT_OPTIONS.length})` },
              { id: 'english' as const, label: `English (${ENGLISH_FONT_OPTIONS.length})` },
              { id: 'local' as const, label: `Local (${localFonts.length})` },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => onChangeFontsActiveTab(t.id)}
                className={cn(
                  'flex-1 py-2 text-[11px] font-semibold border-b-2 text-center cursor-pointer transition-colors',
                  fontsActiveTab === t.id ? '' : 'border-transparent opacity-60 hover:opacity-90'
                )}
                style={
                  fontsActiveTab === t.id
                    ? { borderBottomColor: 'var(--theme-accent)', color: 'var(--theme-accent-text)' }
                    : undefined
                }
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Font Options List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 min-h-0">
          {fontsActiveTab === 'urdu' &&
            URDU_FONT_OPTIONS.map((f) => {
              const active = isFontActive(f.value);
              return (
                <button
                  key={f.name}
                  type="button"
                  onClick={() => onSelectFont(f.name, f.value)}
                  className="w-full text-left px-3 py-2 rounded-xl border flex items-center justify-between gap-3 cursor-pointer touch-tactile"
                  style={{
                    backgroundColor: active ? 'var(--theme-accent-soft)' : 'var(--theme-elevated)',
                    borderColor: active ? 'var(--theme-accent)' : 'var(--theme-border)',
                  }}
                >
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-semibold truncate">{f.name}</span>
                      {active && <Check size={12} style={{ color: 'var(--theme-accent)' }} className="shrink-0" />}
                    </div>
                    <div className="text-right text-sm font-urdu truncate" style={{ fontFamily: f.value }} dir="rtl">
                      {f.previewText || 'ہر بات میں ایک گہرا احساس چھپا ہے'}
                    </div>
                  </div>
                </button>
              );
            })}

          {fontsActiveTab === 'english' &&
            ENGLISH_FONT_OPTIONS.map((f) => {
              const active = isFontActive(f.value);
              return (
                <button
                  key={f.name}
                  type="button"
                  onClick={() => onSelectFont(f.name, f.value)}
                  className="w-full text-left px-3 py-2 rounded-xl border flex items-center justify-between gap-3 cursor-pointer touch-tactile"
                  style={{
                    backgroundColor: active ? 'var(--theme-accent-soft)' : 'var(--theme-elevated)',
                    borderColor: active ? 'var(--theme-accent)' : 'var(--theme-border)',
                  }}
                >
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-semibold truncate">{f.name}</span>
                      {active && <Check size={12} style={{ color: 'var(--theme-accent)' }} className="shrink-0" />}
                    </div>
                    <div className="text-left text-xs truncate opacity-85" style={{ fontFamily: f.value }}>
                      {f.previewText || 'Cinematic Dialogue & Narrative Flow'}
                    </div>
                  </div>
                </button>
              );
            })}

          {fontsActiveTab === 'local' && (
            <div className="space-y-2">
              <div
                className="p-2.5 rounded-xl border space-y-2"
                style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
              >
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    placeholder="Add system font name..."
                    value={customFontInputName}
                    onChange={(e) => onChangeCustomFontInputName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') onAddNamedFont();
                    }}
                    className="flex-1 min-w-0 min-h-[34px] px-2.5 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-[var(--theme-accent)]"
                    style={{
                      backgroundColor: 'var(--theme-surface)',
                      borderColor: 'var(--theme-border)',
                      color: 'var(--theme-text)',
                    }}
                  />
                  <button
                    type="button"
                    onClick={onAddNamedFont}
                    className="min-h-[34px] px-2.5 rounded-lg text-white font-semibold text-[11px] flex items-center gap-1 cursor-pointer shrink-0"
                    style={{ backgroundColor: 'var(--theme-accent)' }}
                  >
                    <Plus size={12} />
                    <span>Add</span>
                  </button>
                </div>

                <label
                  className="flex items-center justify-center gap-1.5 w-full min-h-[36px] px-3 rounded-lg border border-dashed font-semibold text-[11px] cursor-pointer"
                  style={{ borderColor: 'var(--theme-accent)', color: 'var(--theme-accent-text)' }}
                >
                  <Upload size={12} />
                  <span>{isUploadingFont ? 'Loading font...' : 'Upload .ttf / .otf / .woff'}</span>
                  <input
                    type="file"
                    accept=".ttf,.otf,.woff,.woff2,font/*"
                    onChange={onUploadFontFile}
                    className="hidden"
                    disabled={isUploadingFont}
                  />
                </label>
              </div>

              {localFonts.length === 0 ? (
                <p className="text-center py-4 opacity-55 text-xs">No custom local fonts added yet.</p>
              ) : (
                localFonts.map((f) => {
                  const active = isFontActive(f.value);
                  return (
                    <div
                      key={f.id}
                      className="px-3 py-2 rounded-xl border flex items-center justify-between gap-2"
                      style={{
                        backgroundColor: active ? 'var(--theme-accent-soft)' : 'var(--theme-elevated)',
                        borderColor: active ? 'var(--theme-accent)' : 'var(--theme-border)',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => onSelectFont(f.name, f.value)}
                        className="flex-1 min-w-0 text-left flex items-center gap-1.5 cursor-pointer"
                      >
                        <span className="text-xs font-semibold truncate">{f.name}</span>
                        {active && <Check size={12} style={{ color: 'var(--theme-accent)' }} className="shrink-0" />}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => onDeleteLocalFont(f.id, e)}
                        className="w-7 h-7 rounded-md flex items-center justify-center text-red-500 hover:bg-red-500/10 cursor-pointer shrink-0"
                        aria-label={`Delete ${f.name}`}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-3.5 py-2.5 border-t flex items-center justify-between gap-2 shrink-0"
          style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
        >
          <button
            type="button"
            onClick={onResetDraft}
            disabled={!isDirty}
            className="min-h-[34px] px-2.5 rounded-lg text-[11px] font-semibold opacity-70 hover:opacity-100 disabled:opacity-30 flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw size={12} />
            <span>Reset</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[34px] px-3 rounded-lg border text-[11px] font-semibold cursor-pointer"
              style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onApply}
              className="min-h-[34px] px-3.5 rounded-lg text-white text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer"
              style={{ backgroundColor: 'var(--theme-accent)' }}
            >
              <Check size={12} />
              <span>Apply</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
