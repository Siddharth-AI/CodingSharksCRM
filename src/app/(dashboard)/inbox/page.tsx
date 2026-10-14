'use client';

import React, { useEffect, useState } from 'react';
import { Layout } from '@/components/layout';
import { ConversationList, ChatThread } from '@/components/inbox';
import { useGetConversationsQuery, useMarkConversationReadMutation } from '@/store/api';

const LIST_POLL_MS = 10000;

export default function InboxPage() {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
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

  const selected = conversations.find(c => c.leadId === selectedLeadId);
  const selectedUnread = selected?.unread || 0;

  useEffect(() => {
    if (selectedLeadId && selectedUnread > 0) markRead(selectedLeadId);
  }, [selectedLeadId, selectedUnread, markRead]);

  return (
    <Layout>
      <div className="flex h-[calc(100vh-7rem)] bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div
          className={`w-full md:w-80 lg:w-96 md:flex-none border-r border-gray-200 ${
            selectedLeadId ? 'hidden md:block' : 'block'
          }`}
        >
          <ConversationList
            conversations={conversations}
            selectedLeadId={selectedLeadId}
            search={search}
            onSearchChange={setSearch}
            onSelect={setSelectedLeadId}
            isLoading={isLoading}
          />
        </div>

        <div className={`flex-1 min-w-0 ${selectedLeadId ? 'flex' : 'hidden md:flex'} flex-col`}>
          {selectedLeadId ? (
            <ChatThread key={selectedLeadId} leadId={selectedLeadId} onBack={() => setSelectedLeadId(null)} />
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-gray-500">
              Select a conversation to start chatting
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
