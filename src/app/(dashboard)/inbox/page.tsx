'use client';

import React, { useEffect, useState } from 'react';
import { Layout } from '@/components/layout';
import { ConversationList, ChatThread, NewChatModal } from '@/components/inbox';
import type { InboxFilter } from '@/components/inbox';
import { Icon } from '@/components/inbox/inboxUi';
import { useGetConversationsQuery, useMarkConversationReadMutation } from '@/store/api';

const LIST_POLL_MS = 10000;

export default function InboxPage() {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [filter, setFilter] = useState<InboxFilter>('all');
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [markRead] = useMarkConversationReadMutation();

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useGetConversationsQuery(
    debounced ? { search: debounced } : undefined,
    { pollingInterval: LIST_POLL_MS }
  );
  const conversations = data?.data || [];
  const totalUnread = data?.meta?.totalUnread || 0;

  const selected = conversations.find(c => c.leadId === selectedLeadId);
  const selectedUnread = selected?.unread || 0;

  useEffect(() => {
    if (selectedLeadId && selectedUnread > 0) markRead(selectedLeadId);
  }, [selectedLeadId, selectedUnread, markRead]);

  return (
    <Layout>
      <div className="flex h-[calc(100vh-7rem)] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className={`w-full md:w-[340px] lg:w-[380px] md:flex-none border-r border-gray-200 ${selectedLeadId ? 'hidden md:block' : 'block'}`}>
          <ConversationList
            conversations={conversations}
            totalUnread={totalUnread}
            selectedLeadId={selectedLeadId}
            search={search}
            filter={filter}
            onSearchChange={setSearch}
            onFilterChange={setFilter}
            onSelect={setSelectedLeadId}
            onNewChat={() => setNewChatOpen(true)}
            isLoading={isLoading}
          />
        </div>

        <div className={`min-w-0 flex-1 flex-col ${selectedLeadId ? 'flex' : 'hidden md:flex'}`}>
          {selectedLeadId ? (
            <ChatThread key={selectedLeadId} leadId={selectedLeadId} onBack={() => setSelectedLeadId(null)} />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center bg-gray-50 px-6 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <Icon name="chat" className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">CodingSharks WhatsApp</h3>
              <p className="mt-1 max-w-sm text-sm text-gray-500">
                Pick a chat on the left to read and reply, or start a new conversation with any number.
              </p>
              <button
                type="button"
                onClick={() => setNewChatOpen(true)}
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
              >
                <Icon name="plus" className="w-4 h-4" />
                New chat
              </button>
            </div>
          )}
        </div>
      </div>

      <NewChatModal
        isOpen={newChatOpen}
        onClose={() => setNewChatOpen(false)}
        onStarted={leadId => {
          setNewChatOpen(false);
          setSelectedLeadId(leadId);
        }}
      />
    </Layout>
  );
}
