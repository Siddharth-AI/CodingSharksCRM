'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useGetConversationQuery, useSendMessageMutation } from '@/store/api';
import { renderWhatsAppText } from '@/components/forms/WhatsAppTextarea';
import { InboxMedia } from './InboxMedia';
import { TemplateComposer } from './TemplateComposer';
import { Avatar, CHAT_BACKGROUND, GROUP_META, Icon, StatusTicks, dayLabel, formatPhone, windowLeft } from './inboxUi';

interface ChatThreadProps {
  leadId: string;
  onBack: () => void;
}

const THREAD_POLL_MS = 5000;

type SendError = { data?: { error?: string; outsideWindow?: boolean } };

export const ChatThread: React.FC<ChatThreadProps> = ({ leadId, onBack }) => {
  const { data, isLoading, isError } = useGetConversationQuery(leadId, { pollingInterval: THREAD_POLL_MS });
  const [sendMessage, { isLoading: isSending }] = useSendMessageMutation();

  const thread = data?.data;
  const messages = useMemo(() => thread?.messages || [], [thread]);
  const windowOpen = thread?.windowOpen ?? false;
  const remaining = windowLeft(thread?.lastInboundAt);

  const [modeOverride, setMode] = useState<'text' | 'template' | null>(null);
  const mode = modeOverride ?? (windowOpen ? 'text' : 'template');
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

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

  const scrollToEnd = () => bottomRef.current?.scrollIntoView({ block: 'end' });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length, leadId]);

  const handleError = (err: unknown) => {
    const d = (err as SendError)?.data;
    setError(d?.error || 'Failed to send message');
    if (d?.outsideWindow) setMode('template');
  };

  const sendText = async () => {
    const body = text.trim();
    if (!body) return;
    setError(null);
    try {
      await sendMessage({ leadId, content: body, useTemplate: false }).unwrap();
      setText('');
    } catch (err) {
      handleError(err);
    }
  };

  const sendTemplate = async (templateId: string, values: Record<string, string>) => {
    setError(null);
    try {
      await sendMessage({ leadId, content: '', useTemplate: true, templateId, templateVariables: values }).unwrap();
      return true;
    } catch (err) {
      handleError(err);
      return false;
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center" style={CHAT_BACKGROUND}>
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }
  if (isError || !thread) {
    return <div className="flex flex-1 items-center justify-center text-sm text-red-600">Failed to load chat</div>;
  }

  const group = GROUP_META[thread.group];

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3">
        <button type="button" onClick={onBack} className="md:hidden rounded-full p-1.5 text-gray-500 hover:bg-gray-100" aria-label="Back">
          <Icon name="back" />
        </button>
        <Avatar name={thread.lead.name} online={windowOpen} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold text-gray-900">{thread.lead.name}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
            <span className="inline-flex items-center gap-1">
              <Icon name="phone" className="w-3 h-3" />
              {formatPhone(thread.lead.mobile)}
            </span>
            <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset ${group.chip}`}>
              {thread.course?.name || group.label}
            </span>
            <span className="uppercase tracking-wide text-[10px] text-gray-400">{thread.lead.stage}</span>
          </div>
        </div>
        <span
          className={`hidden sm:inline-flex flex-none items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
            windowOpen ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
          }`}
          title="WhatsApp allows free-text replies for 24 hours after the customer's last message"
        >
          <Icon name="clock" className="w-3.5 h-3.5" />
          {windowOpen ? `Reply window · ${remaining}` : 'Template only'}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4 sm:px-8" style={CHAT_BACKGROUND}>
        {messages.length === 0 && (
          <div className="mx-auto mt-10 max-w-sm rounded-xl bg-white/90 px-5 py-4 text-center shadow-sm">
            <Icon name="sparkle" className="mx-auto mb-2 w-6 h-6 text-blue-500" />
            <p className="text-sm font-medium text-gray-800">No messages yet</p>
            <p className="mt-1 text-xs text-gray-500">Start the conversation with an approved template below.</p>
          </div>
        )}
        <div className="space-y-1.5">
          {messages.map((m, i) => {
            const created = new Date(m.createdAt);
            const outbound = m.direction !== 'inbound';
            const prev = messages[i - 1];
            const grouped = !!prev && !dayDividers.has(m.id) && (prev.direction !== 'inbound') === outbound;
            return (
              <React.Fragment key={m.id}>
                {dayDividers.has(m.id) && (
                  <div className="flex justify-center py-2">
                    <span className="rounded-lg bg-white/90 px-3 py-1 text-[11px] font-medium text-gray-600 shadow-sm">
                      {dayLabel(created)}
                    </span>
                  </div>
                )}
                <div className={`flex ${outbound ? 'justify-end' : 'justify-start'} ${grouped ? '' : 'pt-1.5'}`}>
                  <div
                    className={`relative max-w-[85%] sm:max-w-[68%] rounded-2xl px-3 pt-2 pb-1.5 shadow-sm ${
                      outbound ? `bg-[#d9fdd3] ${grouped ? '' : 'rounded-tr-sm'}` : `bg-white ${grouped ? '' : 'rounded-tl-sm'}`
                    } ${m.status === 'failed' ? 'ring-1 ring-red-300' : ''}`}
                  >
                    {m.messageType === 'template' && (
                      <span className="mb-1 inline-flex items-center gap-1 rounded bg-black/5 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-600">
                        <Icon name="template" className="w-3 h-3" />
                        Template
                      </span>
                    )}
                    {m.mediaImageUrl && outbound && (
                      <img src={m.mediaImageUrl} alt="" onLoad={i >= messages.length - 2 ? scrollToEnd : undefined} className="mb-1.5 max-h-64 w-full rounded-lg object-cover" />
                    )}
                    {m.mediaVideoUrl && outbound && (
                      <video src={m.mediaVideoUrl} controls preload="metadata" onLoadedMetadata={i >= messages.length - 2 ? scrollToEnd : undefined} className="mb-1.5 max-h-64 w-full rounded-lg bg-black" />
                    )}
                    {m.mediaId && (
                      <div className="mb-1.5">
                        <InboxMedia mediaId={m.mediaId} messageType={m.messageType || 'document'} mimeType={m.mediaMimeType} />
                      </div>
                    )}
                    <div
                      className="text-[14px] leading-relaxed text-gray-900 break-words"
                      dangerouslySetInnerHTML={{ __html: renderWhatsAppText(m.content) }}
                    />
                    {m.status === 'failed' && m.errorMessage && (
                      <p className="mt-1.5 flex items-start gap-1 rounded-md bg-red-50 px-2 py-1 text-[11px] text-red-700">
                        <Icon name="alert" className="mt-px w-3.5 h-3.5 flex-none" />
                        {m.errorMessage}
                      </p>
                    )}
                    <div className="mt-0.5 flex items-center justify-end gap-1 text-[11px] text-gray-500">
                      <span>{created.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}</span>
                      <StatusTicks message={m} />
                    </div>
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </div>
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-gray-200 bg-white px-3 py-3 sm:px-4">
        <div className="mb-2.5 flex items-center gap-3">
          <div className="inline-flex rounded-lg bg-gray-100 p-0.5 text-xs font-medium">
            <button
              type="button"
              onClick={() => setMode('text')}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors ${
                mode === 'text' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon name="chat" className="w-3.5 h-3.5" />
              Message
            </button>
            <button
              type="button"
              onClick={() => setMode('template')}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors ${
                mode === 'template' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon name="template" className="w-3.5 h-3.5" />
              Template
            </button>
          </div>
          {!windowOpen && mode === 'text' && (
            <span className="text-xs text-amber-700">No reply in 24h — WhatsApp only allows templates.</span>
          )}
        </div>

        {error && (
          <div className="mb-2 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
            <Icon name="alert" className="mt-px w-4 h-4 flex-none" />
            <span className="flex-1">{error}</span>
            <button type="button" onClick={() => setError(null)} aria-label="Dismiss">
              <Icon name="close" className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {mode === 'text' ? (
          <div className="flex items-end gap-2">
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendText();
                }
              }}
              rows={Math.min(5, Math.max(1, text.split('\n').length))}
              maxLength={4096}
              placeholder="Type a message"
              className="flex-1 resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={sendText}
              disabled={!text.trim() || isSending}
              className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:bg-gray-300"
              aria-label="Send"
            >
              {isSending ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Icon name="send" className="w-5 h-5" />
              )}
            </button>
          </div>
        ) : (
          <div className="max-h-[52vh] overflow-y-auto">
            <TemplateComposer leadId={leadId} isSending={isSending} onSend={sendTemplate} />
          </div>
        )}
      </div>
    </div>
  );
};
