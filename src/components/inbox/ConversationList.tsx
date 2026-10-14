'use client';

import React from 'react';
import { InboxConversation } from '@/types';

interface ConversationListProps {
  conversations: InboxConversation[];
  selectedLeadId: string | null;
  search: string;
  onSearchChange: (value: string) => void;
  onSelect: (leadId: string) => void;
  isLoading: boolean;
}

const formatTime = (iso: string) => {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  selectedLeadId,
  search,
  onSearchChange,
  onSelect,
  isLoading,
}) => (
  <div className="flex flex-col h-full">
    <div className="p-3 border-b border-gray-200">
      <input
        type="text"
        value={search}
        onChange={e => onSearchChange(e.target.value)}
        placeholder="Search name or number..."
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
    </div>

    <div className="flex-1 overflow-y-auto">
      {isLoading && conversations.length === 0 ? (
        <div className="p-4 space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-14 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      ) : conversations.length === 0 ? (
        <p className="p-6 text-center text-sm text-gray-500">No conversations yet</p>
      ) : (
        conversations.map(c => (
          <button
            key={c.leadId}
            type="button"
            onClick={() => onSelect(c.leadId)}
            className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
              selectedLeadId === c.leadId ? 'bg-blue-50' : ''
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`flex-none w-2 h-2 rounded-full ${c.windowOpen ? 'bg-green-500' : 'bg-gray-300'}`}
                  title={c.windowOpen ? 'Replied within 24h - free text allowed' : 'Template required'}
                />
                <span className={`truncate text-sm ${c.unread > 0 ? 'font-semibold text-gray-900' : 'text-gray-800'}`}>
                  {c.name}
                </span>
              </div>
              <span className="flex-none text-xs text-gray-500">{formatTime(c.lastAt)}</span>
            </div>
            <div className="flex items-center justify-between gap-2 mt-1">
              <p className="truncate text-xs text-gray-500">
                {c.lastDirection === 'outbound' ? 'You: ' : ''}
                {c.lastMessage}
              </p>
              {c.unread > 0 && (
                <span className="flex-none min-w-[20px] h-5 px-1.5 rounded-full bg-green-500 text-white text-xs font-semibold flex items-center justify-center">
                  {c.unread}
                </span>
              )}
            </div>
          </button>
        ))
      )}
    </div>
  </div>
);
