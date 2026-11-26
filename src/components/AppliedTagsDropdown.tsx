import React, { useState } from 'react';
import { ChevronDown, Tag, Sliders, Check } from 'lucide-react';
import { AppliedTranslationTagInfo } from '../utils/exportCategorizer';
import { cn } from '../utils/cn';

const RELATED_TAG_PRESETS = [
  'Neutral/Google',
  'AI',
  'Urdu',
  'English',
  'Urdu+English',
  'Roman Urdu',
  'Roman Urdu+English',
];

interface AppliedTagsDropdownProps {
  tagInfo: AppliedTranslationTagInfo;
  includeTagInFilename?: boolean;
  onToggleIncludeTagInFilename?: (enabled: boolean) => void;
  includeSettingsTagInFilename?: boolean;
  onToggleIncludeSettingsTagInFilename?: (enabled: boolean) => void;
  embedMetadataInFile?: boolean;
  onToggleEmbedMetadataInFile?: (enabled: boolean) => void;
  customTagText?: string;
  onChangeCustomTagText?: (val: string) => void;
  className?: string;
}

export const AppliedTagsDropdown: React.FC<AppliedTagsDropdownProps> = ({
  tagInfo,
  includeTagInFilename = true,
  onToggleIncludeTagInFilename,
  includeSettingsTagInFilename = false,
  onToggleIncludeSettingsTagInFilename,
  embedMetadataInFile = true,
  onToggleEmbedMetadataInFile,
  customTagText = '',
  onChangeCustomTagText,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const activeSet = new Set(tagInfo.primaryTags.map((t) => t.toLowerCase()));
  const activeTagTokens = [
    ...tagInfo.primaryTags,
    ...(customTagText.trim() ? [customTagText.trim()] : []),
  ];

  return (
    <div
      className={cn('rounded-xl border overflow-hidden mc-dropdown', className)}
      style={{
        backgroundColor: 'var(--theme-elevated)',
        borderColor: isOpen ? 'var(--theme-accent)' : 'var(--theme-border)',
      }}
    >
      {/* One-Line Visible Drop-Down Bar */}
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-expanded={isOpen}
        className="w-full min-h-[42px] px-3 py-1.5 flex items-center justify-between gap-2 text-left cursor-pointer"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden whitespace-nowrap">
          <Tag size={13} style={{ color: 'var(--theme-accent)' }} className="shrink-0" />
          <span className="text-[11px] font-semibold shrink-0 mc-dropdown-title">
            [{activeTagTokens.join(' · ')}]
          </span>
          <span className="text-[10.5px] opacity-75 truncate font-mono">
            {tagInfo.oneLineSummary}
          </span>
        </div>

        <ChevronDown
          size={15}
          className={cn('shrink-0 opacity-75 transition-transform duration-150', isOpen && 'rotate-180')}
        />
      </button>

      {/* Expanded Tags & Applied Settings Breakdown */}
      {isOpen && (
        <div
          className="px-3 pb-3 pt-2.5 border-t space-y-2.5 text-xs anim-dropdown-in"
          style={{
            backgroundColor: 'var(--theme-surface)',
            borderColor: 'var(--theme-border)',
          }}
        >
          {/* Related Tags Matrix */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10.5px] font-semibold opacity-80">Related Subtitle Tags</span>
              <span className="text-[10px] font-mono opacity-65">
                File Tag: {includeSettingsTagInFilename ? tagInfo.settingsTagSlug : tagInfo.filenameTagSlug}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {RELATED_TAG_PRESETS.map((preset) => {
                const isActive = activeSet.has(preset.toLowerCase());
                return (
                  <span
                    key={preset}
                    className={cn(
                      'px-2 py-1 rounded-md border text-[10.5px] font-semibold inline-flex items-center gap-1',
                      isActive ? 'text-white' : 'opacity-65'
                    )}
                    style={
                      isActive
                        ? { backgroundColor: 'var(--theme-accent)', borderColor: 'var(--theme-accent)' }
                        : { backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }
                    }
                  >
                    {isActive && <Check size={10} />}
                    <span>{preset}</span>
                  </span>
                );
              })}
            </div>
          </div>

          {/* Applied Translation Parameters & Settings */}
          <div
            className="pt-2 border-t space-y-1.5"
            style={{ borderColor: 'var(--theme-border)' }}
          >
            <div className="flex items-center gap-1.5 text-[10.5px] font-semibold opacity-85">
              <Sliders size={12} style={{ color: 'var(--theme-accent)' }} />
              <span>Applied Translation Parameters &amp; Settings</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {tagInfo.parameterTags.map((param) => (
                <div
                  key={param.key}
                  className="px-2 py-1.5 rounded-lg border flex items-center justify-between gap-2 text-[10.5px]"
                  style={{
                    backgroundColor: 'var(--theme-elevated)',
                    borderColor: 'var(--theme-border)',
                  }}
                >
                  <span className="opacity-65 shrink-0">{param.label}</span>
                  <span className="font-medium truncate text-right">{param.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Export Tag & Metadata Options */}
          {(onToggleIncludeTagInFilename ||
            onToggleIncludeSettingsTagInFilename ||
            onToggleEmbedMetadataInFile ||
            onChangeCustomTagText) && (
            <div
              className="pt-2 border-t space-y-2"
              style={{ borderColor: 'var(--theme-border)' }}
            >
              {onChangeCustomTagText && (
                <div className="flex items-center gap-2">
                  <label className="text-[10.5px] font-semibold opacity-75 shrink-0">Extra Tag</label>
                  <input
                    type="text"
                    value={customTagText}
                    onChange={(e) => onChangeCustomTagText(e.target.value)}
                    placeholder="Optional custom tag (e.g. Uncut, Director)"
                    className="flex-1 min-h-[34px] px-2.5 rounded-lg border text-[11px]"
                    style={{
                      backgroundColor: 'var(--theme-elevated)',
                      borderColor: 'var(--theme-border)',
                      color: 'var(--theme-text)',
                    }}
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                {onToggleIncludeTagInFilename && (
                  <label
                    className="px-2.5 py-2 rounded-lg border flex items-center justify-between gap-2 cursor-pointer text-[10.5px]"
                    style={{
                      backgroundColor: 'var(--theme-elevated)',
                      borderColor: includeTagInFilename ? 'var(--theme-accent)' : 'var(--theme-border)',
                    }}
                  >
                    <span className="font-medium truncate">Filename Tag</span>
                    <input
                      type="checkbox"
                      checked={includeTagInFilename}
                      onChange={(e) => onToggleIncludeTagInFilename(e.target.checked)}
                      className="w-3.5 h-3.5 rounded cursor-pointer"
                      style={{ accentColor: 'var(--theme-accent)' }}
                    />
                  </label>
                )}

                {onToggleIncludeSettingsTagInFilename && (
                  <label
                    className="px-2.5 py-2 rounded-lg border flex items-center justify-between gap-2 cursor-pointer text-[10.5px]"
                    style={{
                      backgroundColor: 'var(--theme-elevated)',
                      borderColor: includeSettingsTagInFilename ? 'var(--theme-accent)' : 'var(--theme-border)',
                    }}
                  >
                    <span className="font-medium truncate">+Settings in Name</span>
                    <input
                      type="checkbox"
                      checked={includeSettingsTagInFilename}
                      onChange={(e) => onToggleIncludeSettingsTagInFilename(e.target.checked)}
                      className="w-3.5 h-3.5 rounded cursor-pointer"
                      style={{ accentColor: 'var(--theme-accent)' }}
                    />
                  </label>
                )}

                {onToggleEmbedMetadataInFile && (
                  <label
                    className="px-2.5 py-2 rounded-lg border flex items-center justify-between gap-2 cursor-pointer text-[10.5px]"
                    style={{
                      backgroundColor: 'var(--theme-elevated)',
                      borderColor: embedMetadataInFile ? 'var(--theme-accent)' : 'var(--theme-border)',
                    }}
                  >
                    <span className="font-medium truncate">Embed File Tags</span>
                    <input
                      type="checkbox"
                      checked={embedMetadataInFile}
                      onChange={(e) => onToggleEmbedMetadataInFile(e.target.checked)}
                      className="w-3.5 h-3.5 rounded cursor-pointer"
                      style={{ accentColor: 'var(--theme-accent)' }}
                    />
                  </label>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
