'use client';

import React from 'react';
import { InboxConversation, InboxGroup, MessageStatus } from '@/types';
import { Avatar, GROUP_META, Icon, StatusTicks, formatListTime, plainText } from './inboxUi';

export type InboxFilter = 'all' | 'unread' | InboxGroup;

interface ConversationListProps {
  conversations: InboxConversation[];
  totalUnread: number;
  selectedLeadId: string | null;
  search: string;
  filter: InboxFilter;
  onSearchChange: (value: string) => void;
  onFilterChange: (value: InboxFilter) => void;
  onSelect: (leadId: string) => void;
  onNewChat: () => void;
  isLoading: boolean;
}

const FILTERS: Array<{ key: InboxFilter; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'course', label: 'Courses' },
  { key: 'workshop', label: 'Workshops' },
  { key: 'personal', label: 'Personal' },
];

const preview = (c: InboxConversation) => {
  const text = plainText(c.lastMessage);
  if (c.lastMessageType === 'template') return text.split('\n').find(l => l.trim()) || 'Template';
  return text;
};

export const matchesFilter = (c: InboxConversation, filter: InboxFilter) =>
  filter === 'all' || (filter === 'unread' ? c.unread > 0 : c.group === filter);

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  totalUnread,
  selectedLeadId,
  search,
  filter,
  onSearchChange,
  onFilterChange,
  onSelect,
  onNewChat,
  isLoading,
}) => {
  const visible = conversations.filter(c => matchesFilter(c, filter));
  const count = (key: InboxFilter) => conversations.filter(c => matchesFilter(c, key)).length;

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="px-4 pt-4 pb-3 space-y-3 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-gray-900">Chats</h2>
            {totalUnread > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-xs font-semibold">{totalUnread}</span>
            )}
          </div>
          <button
            type="button"
            onClick={onNewChat}
            className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
          >
            <Icon name="plus" className="w-4 h-4" />
            New chat
          </button>
        </div>

        <label className="relative block">
          <Icon name="search" className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Search name or number"
            className="w-full rounded-full bg-gray-100 pl-9 pr-4 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>

        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map(f => {
            const active = filter === f.key;
            const n = count(f.key);
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => onFilterChange(f.key)}
                className={`flex-none inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  active ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {f.label}
                <span className={active ? 'text-blue-100' : 'text-gray-400'}>{n}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading && conversations.length === 0 ? (
          <div className="p-4 space-y-4">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-11 h-11 rounded-full bg-gray-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-1/2 rounded bg-gray-200" />
                  <div className="h-3 w-3/4 rounded bg-gray-100" />
                </div>
              </div>
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-6 text-center text-gray-500">
            <Icon name="inbox" className="w-10 h-10 text-gray-300 mb-2" />
            <p className="text-sm font-medium text-gray-700">No chats here</p>
            <p className="text-xs mt-1">{search ? 'Try another name or number.' : 'Start one with New chat.'}</p>
          </div>
        ) : (
          <ul>
            {visible.map(c => {
              const selected = selectedLeadId === c.leadId;
              const group = GROUP_META[c.group];
              return (
                <li key={c.leadId}>
                  <button
                    type="button"
                    onClick={() => onSelect(c.leadId)}
                    className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors border-l-[3px] ${
                      selected ? 'bg-blue-50/70 border-blue-600' : 'border-transparent hover:bg-gray-50'
                    }`}
                  >
                    <Avatar name={c.name} online={c.windowOpen} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className={`truncate text-[15px] ${c.unread > 0 ? 'font-semibold text-gray-900' : 'font-medium text-gray-800'}`}>
                          {c.name}
                        </p>
                        <span className={`flex-none text-[11px] ${c.unread > 0 ? 'text-emerald-600 font-semibold' : 'text-gray-400'}`}>
                          {formatListTime(c.lastAt)}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2">
                        <div className="flex min-w-0 flex-1 items-center gap-1 text-[13px] text-gray-500">
                          {c.lastDirection === 'outbound' && (
                            <StatusTicks message={{ direction: 'outbound', status: c.lastStatus as MessageStatus, errorMessage: undefined }} className="w-4 h-4 flex-none" />
                          )}
                          {c.lastMessageType === 'template' && <Icon name="template" className="w-3.5 h-3.5 flex-none text-gray-400" />}
                          <span className="truncate">{preview(c)}</span>
                        </div>
                        {c.unread > 0 && (
                          <span className="flex-none min-w-[20px] h-5 px-1.5 rounded-full bg-emerald-500 text-white text-[11px] font-semibold flex items-center justify-center">
                            {c.unread}
                          </span>
                        )}
                      </div>
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <span className={`inline-flex max-w-[70%] items-center truncate rounded-md px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset ${group.chip}`}>
                          {c.courseName || group.label}
                        </span>
                        <span className="text-[10px] uppercase tracking-wide text-gray-400">{c.stage}</span>
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};
