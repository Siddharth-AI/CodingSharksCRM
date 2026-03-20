'use client';

import React, { useRef } from 'react';

interface WhatsAppTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
  error?: boolean;
}

const FORMATS = [
  { label: 'B',       title: 'Bold',          wrap: '*',   style: 'font-bold' },
  { label: 'I',       title: 'Italic',         wrap: '_',   style: 'italic' },
  { label: 'S',       title: 'Strikethrough',  wrap: '~',   style: 'line-through' },
  { label: '</>',     title: 'Monospace',      wrap: '```', style: 'font-mono text-xs' },
];

/**
 * Renders WhatsApp-formatted text as HTML for preview.
 * *bold* → <strong>, _italic_ → <em>, ~strike~ → <s>, ```mono``` → <code>
 */
export function renderWhatsAppText(text: string): string {
  return text
    .replace(/\*([^*\n]+)\*/g,   '<strong>$1</strong>')
    .replace(/_([^_\n]+)_/g,     '<em>$1</em>')
    .replace(/~([^~\n]+)~/g,     '<s>$1</s>')
    .replace(/```([^`]+)```/g,   '<code class="bg-gray-100 px-1 rounded font-mono text-xs">$1</code>')
    .replace(/\n/g,              '<br />');
}

export const WhatsAppTextarea: React.FC<WhatsAppTextareaProps> = ({
  value,
  onChange,
  placeholder,
  rows = 8,
  disabled,
  error,
}) => {
  const taRef = useRef<HTMLTextAreaElement>(null);

  const applyFormat = (wrap: string) => {
    const ta = taRef.current;
    if (!ta) return;

    const start = ta.selectionStart;
    const end   = ta.selectionEnd;
    const selected = value.slice(start, end);

    let newValue: string;
    let newCursorStart: number;
    let newCursorEnd: number;

    if (selected) {
      // Wrap selected text
      const wrapped = `${wrap}${selected}${wrap}`;
      newValue = value.slice(0, start) + wrapped + value.slice(end);
      newCursorStart = start + wrap.length;
      newCursorEnd   = start + wrap.length + selected.length;
    } else {
      // Insert placeholder at cursor
      const placeholder = `${wrap}text${wrap}`;
      newValue = value.slice(0, start) + placeholder + value.slice(end);
      newCursorStart = start + wrap.length;
      newCursorEnd   = start + wrap.length + 4; // select "text"
    }

    onChange(newValue);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(newCursorStart, newCursorEnd);
    }, 0);
  };

  return (
    <div className={`border rounded-md overflow-hidden ${error ? 'border-red-500' : 'border-gray-300'} focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500`}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-2 py-1.5 bg-gray-50 border-b border-gray-200">
        {FORMATS.map(f => (
          <button
            key={f.label}
            type="button"
            title={f.title + (f.wrap === '```' ? ' (```text```)' : ` (${f.wrap}text${f.wrap})`)}
            onClick={() => applyFormat(f.wrap)}
            disabled={disabled}
            className={`px-2 py-0.5 text-sm rounded border border-gray-300 bg-white hover:bg-gray-100 transition-colors disabled:opacity-50 ${f.style}`}
          >
            {f.label}
          </button>
        ))}
        <span className="ml-2 text-[10px] text-gray-400">
          Select text then click, or click to insert
        </span>
      </div>

      {/* Textarea */}
      <textarea
        ref={taRef}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        className="w-full px-3 py-2 text-sm resize-none focus:outline-none bg-white font-mono"
      />
    </div>
  );
};
