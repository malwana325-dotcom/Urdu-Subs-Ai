import React from 'react';
import { cn } from '../utils/cn';

interface FormattedRichTextProps {
  text: string;
  className?: string;
  placeholder?: string;
}

export function detectLineDirection(line: string): 'rtl' | 'ltr' {
  const clean = line.replace(/<[^>]+>|\{[^}]+\}/g, '');
  const rtlMatches = clean.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g) || [];
  if (rtlMatches.length > 0) return 'rtl';
  return 'ltr';
}

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function renderInlineFormatting(rawLine: string): string {
  // Normalize ASS override tags into safe inline HTML first
  let work = rawLine
    .replace(/\{\\b1\}/gi, '**')
    .replace(/\{\\b0\}/gi, '**')
    .replace(/\{\\i1\}/gi, '*')
    .replace(/\{\\i0\}/gi, '*')
    .replace(/\{\\[^}]+\}/g, '')
    .replace(/\\N/g, ' ');

  // Preserve safe basic SRT/HTML tags by temporarily tokenizing them
  const preservedTags: string[] = [];
  work = work.replace(/<(\/?)(b|strong|i|em|u|code|br\s*\/?)>/gi, (m) => {
    const token = `__HTML_TAG_${preservedTags.length}__`;
    preservedTags.push(m);
    return token;
  });

  // Preserve <font color="...">...</font> safely
  work = work.replace(/<font\s+color=["']?([#a-zA-Z0-9(),.\s]+)["']?\s*>/gi, (_m, color) => {
    const safeColor = String(color).replace(/[^#a-zA-Z0-9(),.\s]/g, '');
    const token = `__HTML_TAG_${preservedTags.length}__`;
    preservedTags.push(`<span style="color:${safeColor}">`);
    return token;
  });
  work = work.replace(/<\/font>/gi, () => {
    const token = `__HTML_TAG_${preservedTags.length}__`;
    preservedTags.push('</span>');
    return token;
  });

  let safe = escapeHtml(work);

  // Markdown bold, italic, code, timestamps
  safe = safe
    .replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded bg-black/10 dark:bg-white/10 font-mono text-[0.9em]">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_]+)__/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, '$1<em>$2</em>')
    .replace(/(\d{2}:\d{2}:\d{2}[,.]\d{3})/g, '<span class="font-mono text-[0.9em] opacity-75">$1</span>');

  preservedTags.forEach((tag, idx) => {
    safe = safe.replace(`__HTML_TAG_${idx}__`, tag);
  });

  return safe;
}

/**
 * Renders plain text, Markdown headings/lists/bold/italic/code, SRT/ASS inline tags,
 * timestamps, and mixed RTL (Urdu) / LTR (English) lines cleanly.
 */
export const FormattedRichText: React.FC<FormattedRichTextProps> = ({
  text,
  className,
  placeholder = 'No content yet.',
}) => {
  const normalized = (text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  if (!normalized) {
    return <p className={cn('text-xs opacity-50 italic', className)}>{placeholder}</p>;
  }

  const lines = normalized.split('\n');

  return (
    <div className={cn('space-y-1 text-xs leading-relaxed break-words', className)}>
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} className="h-1.5" />;
        }

        if (/^---+$|^\*\*\*+$/.test(trimmed)) {
          return <hr key={idx} className="my-1.5 border-t opacity-40" style={{ borderColor: 'var(--theme-border)' }} />;
        }

        const dir = detectLineDirection(trimmed);
        const isHeading = /^#{1,3}\s+/.test(trimmed);
        const headingLevel = isHeading ? (trimmed.match(/^(#{1,3})/)?.[1].length || 1) : 0;
        const isBullet = /^[-*•]\s+/.test(trimmed);
        const isNumbered = /^\d+\.\s+/.test(trimmed);
        const isQuote = /^>\s+/.test(trimmed);

        let bodyText = trimmed;
        if (isHeading) bodyText = trimmed.replace(/^#{1,3}\s+/, '');
        else if (isBullet) bodyText = trimmed.replace(/^[-*•]\s+/, '');
        else if (isQuote) bodyText = trimmed.replace(/^>\s+/, '');

        const html = renderInlineFormatting(bodyText);

        if (isHeading) {
          return (
            <div
              key={idx}
              dir={dir}
              className={cn(
                'font-semibold pt-1',
                headingLevel === 1 ? 'text-sm' : headingLevel === 2 ? 'text-xs' : 'text-[11.5px] opacity-90',
                dir === 'rtl' ? 'font-urdu text-right' : 'text-left'
              )}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        }

        if (isQuote) {
          return (
            <div
              key={idx}
              dir={dir}
              className={cn(
                'px-2.5 py-1 rounded-md opacity-85 italic',
                dir === 'rtl' ? 'font-urdu text-right' : 'text-left'
              )}
              style={{ backgroundColor: 'var(--theme-surface)' }}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        }

        if (isBullet) {
          return (
            <div
              key={idx}
              dir={dir}
              className={cn(
                'flex items-start gap-1.5',
                dir === 'rtl' ? 'font-urdu text-right' : 'text-left'
              )}
            >
              <span className="opacity-60 select-none shrink-0">•</span>
              <span className="flex-1 min-w-0" dangerouslySetInnerHTML={{ __html: html }} />
            </div>
          );
        }

        return (
          <p
            key={idx}
            dir={dir}
            className={cn(
              isNumbered && 'font-medium',
              dir === 'rtl' ? 'font-urdu text-right' : 'text-left'
            )}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      })}
    </div>
  );
};
