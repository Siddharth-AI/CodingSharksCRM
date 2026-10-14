'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useGetConversationQuery, useGetTemplatesQuery, useSendMessageMutation } from '@/store/api';
import { renderWhatsAppText } from '@/components/forms/WhatsAppTextarea';
import { AUTO_FILLED_VARIABLES, extractVariables } from '@/components/forms/SendMessageModal';
import { Button } from '@/components/ui';
import { InboxMedia } from './InboxMedia';
import { WhatsAppMessage } from '@/types';

interface ChatThreadProps {
  leadId: string;
  onBack: () => void;
}

const THREAD_POLL_MS = 5000;

const StatusTicks: React.FC<{ message: WhatsAppMessage }> = ({ message }) => {
  if (message.direction === 'inbound') return null;
  if (message.status === 'failed') return <span className="text-red-500" title={message.errorMessage}>!</span>;
  if (message.status === 'read') return <span className="text-blue-500">✓✓</span>;
  if (message.status === 'delivered') return <span className="text-gray-400">✓✓</span>;
  if (message.status === 'sent') return <span className="text-gray-400">✓</span>;
  return <span className="text-gray-400">…</span>;
};

const dayLabel = (d: Date) => {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const ChatThread: React.FC<ChatThreadProps> = ({ leadId, onBack }) => {
  const { data, isLoading, isError } = useGetConversationQuery(leadId, { pollingInterval: THREAD_POLL_MS });
  const { data: templatesData } = useGetTemplatesQuery({ page: 1, limit: 100 });
  const [sendMessage, { isLoading: isSending }] = useSendMessageMutation();

  const thread = data?.data;
  const messages = useMemo(() => thread?.messages || [], [thread]);
  const windowOpen = thread?.windowOpen ?? false;

  const [modeOverride, setMode] = useState<'text' | 'template' | null>(null);
  const mode = modeOverride ?? (windowOpen ? 'text' : 'template');
  const [text, setText] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [templateVariables, setTemplateVariables] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const approvedTemplates = useMemo(
    () => (templatesData?.data || []).filter(t => t.metaStatus === 'APPROVED' && t.isActive),
    [templatesData]
  );
  const selectedTemplate = approvedTemplates.find(t => t.id === templateId);
  const dayDividers = useMemo(() => {
    const flags = new Set<string>();
    let previous = '';
    for (const m of messages) {
      const label = dayLabel(new Date(m.createdAt));
      if (label !== previous) flags.add(m.id);
      previous = label;
    }
    return flags;
  }, [messages]);
  const customVariables = useMemo(
    () => (selectedTemplate ? extractVariables(selectedTemplate.content).filter(v => !AUTO_FILLED_VARIABLES.has(v)) : []),
    [selectedTemplate]
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length, leadId]);

  const handleSend = async () => {
    setError(null);
    try {
      if (mode === 'text') {
        if (!text.trim()) return;
        await sendMessage({ leadId, content: text.trim(), useTemplate: false }).unwrap();
        setText('');
      } else {
        if (!templateId) {
          setError('Choose a template');
          return;
        }
        const missing = customVariables.filter(v => !templateVariables[v]?.trim());
        if (missing.length > 0) {
          setError(`Fill: ${missing.join(', ')}`);
          return;
        }
        await sendMessage({
          leadId,
          content: '',
          useTemplate: true,
          templateId,
          ...(customVariables.length > 0 ? { templateVariables } : {}),
        }).unwrap();
        setTemplateId('');
        setTemplateVariables({});
      }
    } catch (err: unknown) {
      const data = (err as { data?: { error?: string; outsideWindow?: boolean } })?.data;
      setError(data?.error || 'Failed to send message');
      if (data?.outsideWindow) setMode('template');
    }
  };

  if (isLoading) {
    return <div className="flex-1 flex items-center justify-center text-sm text-gray-500">Loading chat...</div>;
  }
  if (isError || !thread) {
    return <div className="flex-1 flex items-center justify-center text-sm text-red-600">Failed to load chat</div>;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-white">
        <button type="button" onClick={onBack} className="md:hidden text-gray-500 hover:text-gray-700" aria-label="Back">
          ←
        </button>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-gray-900 truncate">{thread.lead.name}</p>
          <p className="text-xs text-gray-500">
            {thread.lead.mobile} · {thread.lead.stage} · {thread.lead.source}
          </p>
        </div>
        <span
          className={`text-xs px-2 py-1 rounded-full ${
            windowOpen ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
          }`}
        >
          {windowOpen ? '24h open - free text' : 'Template required'}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 bg-[#efeae2] space-y-2">
        {messages.length === 0 && <p className="text-center text-sm text-gray-500 mt-6">No messages yet</p>}
        {messages.map(m => {
          const created = new Date(m.createdAt);
          const label = dayLabel(created);
          const showDay = dayDividers.has(m.id);
          const outbound = m.direction !== 'inbound';
          return (
            <React.Fragment key={m.id}>
              {showDay && (
                <div className="flex justify-center">
                  <span className="text-xs bg-white/80 text-gray-600 px-2 py-0.5 rounded">{label}</span>
                </div>
              )}
              <div className={`flex ${outbound ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[75%] rounded-lg px-3 py-2 shadow-sm ${
                    outbound ? 'bg-[#d9fdd3]' : 'bg-white'
                  } ${m.status === 'failed' ? 'border border-red-300' : ''}`}
                >
                  {m.messageType === 'template' && (
                    <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-1">Template</p>
                  )}
                  {m.mediaImageUrl && outbound && (
                    <img src={m.mediaImageUrl} alt="" className="max-w-[240px] max-h-64 rounded mb-1" />
                  )}
                  {m.mediaVideoUrl && outbound && <video src={m.mediaVideoUrl} controls className="max-w-[260px] rounded mb-1" />}
                  {m.mediaId && (
                    <div className="mb-1">
                      <InboxMedia mediaId={m.mediaId} messageType={m.messageType || 'document'} mimeType={m.mediaMimeType} />
                    </div>
                  )}
                  <div
                    className="text-sm text-gray-900 break-words"
                    dangerouslySetInnerHTML={{ __html: renderWhatsAppText(m.content) }}
                  />
                  {m.status === 'failed' && m.errorMessage && (
                    <p className="text-xs text-red-600 mt-1">{m.errorMessage}</p>
                  )}
                  <div className="flex items-center justify-end gap-1 mt-1 text-[11px] text-gray-500">
                    <span>{created.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                    <StatusTicks message={m} />
                  </div>
                </div>
              </div>
            </React.Fragment>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-gray-200 bg-white p-3 space-y-2">
        <div className="flex gap-2 text-xs">
          <button
            type="button"
            onClick={() => setMode('text')}
            className={`px-3 py-1 rounded-full ${mode === 'text' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            Message
          </button>
          <button
            type="button"
            onClick={() => setMode('template')}
            className={`px-3 py-1 rounded-full ${mode === 'template' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            Template
          </button>
          {!windowOpen && mode === 'text' && (
            <span className="text-yellow-700 self-center">
              No reply from this contact in 24h - WhatsApp will likely reject free text.
            </span>
          )}
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        {mode === 'text' ? (
          <div className="flex gap-2 items-end">
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              rows={2}
              maxLength={4096}
              placeholder="Type a message (Enter to send, Shift+Enter for new line)"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <Button variant="primary" onClick={handleSend} isLoading={isSending} disabled={!text.trim()}>
              Send
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex gap-2">
              <select
                value={templateId}
                onChange={e => {
                  setTemplateId(e.target.value);
                  setTemplateVariables({});
                }}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">
                  {approvedTemplates.length === 0 ? 'No WhatsApp-approved templates yet' : 'Choose an approved template'}
                </option>
                {approvedTemplates.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <Button variant="primary" onClick={handleSend} isLoading={isSending} disabled={!templateId}>
                Send
              </Button>
            </div>
            {customVariables.map(v => (
              <input
                key={v}
                type="text"
                value={templateVariables[v] || ''}
                onChange={e => setTemplateVariables(prev => ({ ...prev, [v]: e.target.value }))}
                placeholder={v.replace(/_/g, ' ')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            ))}
            {selectedTemplate && (
              <div
                className="text-xs text-gray-600 bg-gray-50 rounded p-2 max-h-24 overflow-y-auto"
                dangerouslySetInnerHTML={{ __html: renderWhatsAppText(selectedTemplate.content) }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};
