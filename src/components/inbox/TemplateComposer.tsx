'use client';

import React, { useMemo, useState } from 'react';
import { useGetTemplateValuesQuery, useGetTemplatesQuery } from '@/store/api';
import { renderWhatsAppText } from '@/components/forms/WhatsAppTextarea';
import { MessageTemplate, TemplateFieldValue } from '@/types';
import { Icon, plainText } from './inboxUi';

interface TemplateComposerProps {
  leadId: string;
  isSending: boolean;
  onSend: (templateId: string, values: Record<string, string>) => Promise<boolean>;
}

const PARAM_PATTERN = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

const prettyLabel = (name: string) =>
  /^\d+$/.test(name) ? `Value ${name}` : name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

const CategoryChip: React.FC<{ template: MessageTemplate }> = ({ template }) => (
  <span
    className={`flex-none rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
      template.metaCategory === 'UTILITY' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
    }`}
  >
    {template.metaCategory === 'UTILITY' ? 'Utility' : 'Marketing'}
  </span>
);

const TemplateFields: React.FC<{
  template: MessageTemplate;
  initial: TemplateFieldValue[];
  isSending: boolean;
  onSend: (values: Record<string, string>) => void;
}> = ({ template, initial, isSending, onSend }) => {
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(initial.map(f => [f.name, f.value])));
  const [touched, setTouched] = useState(false);
  const missing = initial.filter(f => !values[f.name]?.trim()).map(f => f.name);

  const previewText = useMemo(
    () => template.content.replace(PARAM_PATTERN, (m, name: string) => (values[name]?.trim() ? values[name] : `[${prettyLabel(name)}]`)),
    [template.content, values]
  );

  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="space-y-3">
        {initial.length === 0 ? (
          <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">This template has no editable values.</p>
        ) : (
          initial.map(f => {
            const empty = touched && !values[f.name]?.trim();
            return (
              <label key={f.name} className="block">
                <span className="mb-1 flex items-center justify-between text-xs font-medium text-gray-600">
                  <span>{prettyLabel(f.name)}</span>
                  {f.auto && <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-600">AUTO-FILLED</span>}
                </span>
                <input
                  type="text"
                  value={values[f.name] ?? ''}
                  onChange={e => setValues(v => ({ ...v, [f.name]: e.target.value }))}
                  placeholder={`Enter ${prettyLabel(f.name).toLowerCase()}`}
                  className={`w-full rounded-lg border bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    empty ? 'border-red-300' : 'border-gray-200'
                  }`}
                />
              </label>
            );
          })
        )}
        <button
          type="button"
          disabled={isSending}
          onClick={() => {
            setTouched(true);
            if (missing.length === 0) onSend(values);
          }}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
        >
          <Icon name="send" className="w-4 h-4" />
          {isSending ? 'Sending...' : 'Send template'}
        </button>
        {touched && missing.length > 0 && <p className="text-xs text-red-600">Fill all values before sending.</p>}
      </div>

      <div className="rounded-xl p-3" style={{ backgroundColor: '#efeae2' }}>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500">Preview</p>
        <div className="ml-auto max-w-full rounded-2xl rounded-tr-sm bg-[#d9fdd3] px-3 py-2 shadow-sm">
          {(template.metaHeaderFormat === 'VIDEO' || template.metaHeaderFormat === 'IMAGE') && (
            <div className="mb-2 flex h-24 items-center justify-center rounded-lg bg-black/10 text-xs text-gray-600">
              {template.metaHeaderFormat === 'VIDEO' ? 'Video attached' : 'Image attached'}
            </div>
          )}
          <div
            className="max-h-56 overflow-y-auto text-[13px] leading-relaxed text-gray-900 break-words"
            dangerouslySetInnerHTML={{ __html: renderWhatsAppText(previewText) }}
          />
        </div>
      </div>
    </div>
  );
};

export const TemplateComposer: React.FC<TemplateComposerProps> = ({ leadId, isSending, onSend }) => {
  const { data: templatesData, isLoading } = useGetTemplatesQuery({ page: 1, limit: 100 }, { refetchOnMountOrArgChange: 30 });
  const [query, setQuery] = useState('');
  const [templateId, setTemplateId] = useState<string | null>(null);

  const approved = useMemo(
    () => (templatesData?.data || []).filter(t => t.metaStatus === 'APPROVED' && t.isActive),
    [templatesData]
  );
  const filtered = approved.filter(t => t.name.toLowerCase().includes(query.trim().toLowerCase()));
  const selected = approved.find(t => t.id === templateId);

  const { data: valuesData, isFetching } = useGetTemplateValuesQuery(
    { leadId, templateId: templateId || '' },
    { skip: !templateId }
  );

  if (selected) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTemplateId(null)}
            className="rounded-full p-1.5 text-gray-500 hover:bg-gray-100"
            aria-label="Back to templates"
          >
            <Icon name="back" className="w-4 h-4" />
          </button>
          <p className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-900">{selected.name}</p>
          <CategoryChip template={selected} />
        </div>
        {isFetching || !valuesData?.data ? (
          <div className="h-32 animate-pulse rounded-xl bg-gray-100" />
        ) : (
          <TemplateFields
            key={selected.id}
            template={selected}
            initial={valuesData.data.fields}
            isSending={isSending}
            onSend={async values => {
              const ok = await onSend(selected.id, values);
              if (ok) setTemplateId(null);
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="relative block">
        <Icon name="search" className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search approved templates"
          className="w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </label>
      <div className="max-h-56 overflow-y-auto rounded-lg border border-gray-100 divide-y divide-gray-100">
        {isLoading ? (
          <div className="h-24 animate-pulse bg-gray-50" />
        ) : filtered.length === 0 ? (
          <p className="px-3 py-4 text-center text-sm text-gray-500">
            {approved.length === 0 ? 'No WhatsApp-approved templates yet.' : 'No template matches your search.'}
          </p>
        ) : (
          filtered.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTemplateId(t.id)}
              className="flex w-full items-start gap-3 px-3 py-2.5 text-left hover:bg-blue-50/60"
            >
              <span className="mt-0.5 rounded-md bg-gray-100 p-1.5 text-gray-500">
                <Icon name="template" className="w-4 h-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-gray-900">{t.name}</span>
                  <CategoryChip template={t} />
                  {t.metaHeaderFormat && (
                    <span className="flex-none rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-gray-600">
                      {t.metaHeaderFormat.toLowerCase()}
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block truncate text-xs text-gray-500">
                  {plainText(t.content).split('\n').find(l => l.trim())}
                </span>
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
};
