import React, { useState } from 'react';
import {
  Download,
  X,
  FileText,
  Sparkles,
  Film,
  FileCode,
  Youtube,
  Music,
  Smartphone,
  Share2,
} from 'lucide-react';
import { SubtitleItem } from '../utils/srtParser';
import { cn } from '../utils/cn';
import { InfoPopover } from './InfoPopover';

interface UnifiedDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  subtitles: SubtitleItem[];
  onDownloadFormatted: (
    format: 'srt-formatted' | 'ass' | 'ssa' | 'vtt' | 'srt-clean' | 'sbv' | 'lrc' | 'txt' | 'json' | 'copy',
    type: 'ai' | 'google' | 'original'
  ) => void;
  fileName: string;
}

export const UnifiedDownloadModal: React.FC<UnifiedDownloadModalProps> = ({
  isOpen,
  onClose,
  subtitles,
  onDownloadFormatted,
}) => {
  const [selectedStream, setSelectedStream] = useState<'ai' | 'google' | 'original'>('ai');

  if (!isOpen) return null;

  const handleDownload = (
    format: 'srt-formatted' | 'ass' | 'ssa' | 'vtt' | 'srt-clean' | 'sbv' | 'lrc' | 'txt' | 'json' | 'copy'
  ) => {
    onDownloadFormatted(format, selectedStream);
    onClose();
  };

  const DOWNLOAD_OPTIONS = [
    { format: 'srt-formatted' as const, name: 'Formatted SRT', badge: '.srt', icon: Download },
    { format: 'ass' as const, name: 'Advanced SubStation', badge: '.ass', icon: Sparkles },
    { format: 'ssa' as const, name: 'SubStation Alpha', badge: '.ssa', icon: Film },
    { format: 'vtt' as const, name: 'WebVTT', badge: '.vtt', icon: FileCode },
    { format: 'srt-clean' as const, name: 'Clean Plain SRT', badge: '.srt', icon: FileText },
    { format: 'sbv' as const, name: 'YouTube Captions', badge: '.sbv', icon: Youtube },
    { format: 'lrc' as const, name: 'Lyrics', badge: '.lrc', icon: Music },
    { format: 'txt' as const, name: 'Transcript', badge: '.txt', icon: Smartphone },
    { format: 'json' as const, name: 'JSON Timed', badge: '.json', icon: FileCode },
    { format: 'copy' as const, name: 'WhatsApp Copy', badge: 'Copy', icon: Share2 },
  ];

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-2.5 sm:p-4 bg-black/75 backdrop-blur-sm">
      <div
        className="border rounded-xl shadow-2xl max-w-[calc(100vw-20px)] sm:max-w-xl w-full max-h-[calc(100dvh-20px)] overflow-hidden text-xs flex flex-col"
        style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
      >
        <div
          className="px-3.5 py-2.5 border-b flex items-center justify-between shrink-0"
          style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
        >
          <div className="flex items-center gap-2">
            <Download size={15} style={{ color: 'var(--theme-accent)' }} />
            <h2 className="font-semibold text-sm">Export Subtitles</h2>
            <InfoPopover
              title="Export Subtitles"
              description="Choose AI, Google, or Original stream and export as stylized .ass/.ssa/.srt or clean .vtt/.sbv/.lrc/.txt/.json with UTF-8 BOM."
            />
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg opacity-60 hover:opacity-100 cursor-pointer">
            <X size={15} />
          </button>
        </div>

        <div
          className="px-3.5 py-2 border-b flex items-center justify-between gap-2 flex-wrap shrink-0"
          style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
        >
          <div className="flex gap-1 p-0.5 rounded-lg border" style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}>
            {[
              { id: 'ai' as const, label: 'AI' },
              { id: 'google' as const, label: 'Google' },
              { id: 'original' as const, label: 'Original' },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setSelectedStream(st.id)}
                className={cn('px-2.5 py-1 rounded text-[10.5px] font-semibold cursor-pointer', selectedStream === st.id ? 'text-white' : 'opacity-70')}
                style={selectedStream === st.id ? { backgroundColor: 'var(--theme-accent)' } : undefined}
              >
                {st.label}
              </button>
            ))}
          </div>
          <span className="font-mono text-[10px] opacity-65 tabular-nums">{subtitles.length} blocks</span>
        </div>

        <div className="p-3.5 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {DOWNLOAD_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.format}
                  type="button"
                  onClick={() => handleDownload(opt.format)}
                  className="p-2.5 rounded-lg border text-left flex items-center justify-between gap-2 cursor-pointer hover:opacity-100"
                  style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon size={14} style={{ color: 'var(--theme-accent)' }} className="shrink-0" />
                    <span className="font-semibold text-[11px] truncate">{opt.name}</span>
                  </div>
                  <span className="text-[9.5px] font-mono px-1.5 py-0.5 rounded border opacity-75 shrink-0" style={{ borderColor: 'var(--theme-border)' }}>
                    {opt.badge}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div
          className="px-3.5 py-2.5 border-t flex items-center justify-end shrink-0"
          style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
        >
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg border font-medium cursor-pointer"
            style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
