'use client';

import React from 'react';
import { InboxGroup, WhatsAppMessage } from '@/types';

const AVATAR_COLORS = [
  'bg-rose-500', 'bg-orange-500', 'bg-amber-500', 'bg-emerald-500', 'bg-teal-500',
  'bg-sky-500', 'bg-blue-500', 'bg-indigo-500', 'bg-violet-500', 'bg-fuchsia-500',
];

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

export const initials = (name: string) => {
  const clean = name.replace(/[^\p{L}\p{N} ]/gu, '').trim();
  if (!clean || /^\+?\d[\d ]*$/.test(clean)) return '#';
  const parts = clean.split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
};

export const Avatar: React.FC<{ name: string; size?: 'sm' | 'md' | 'lg'; online?: boolean }> = ({ name, size = 'md', online }) => {
  const dims = { sm: 'w-9 h-9 text-xs', md: 'w-11 h-11 text-sm', lg: 'w-12 h-12 text-base' }[size];
  return (
    <div className="relative flex-none">
      <div className={`${dims} ${AVATAR_COLORS[hash(name) % AVATAR_COLORS.length]} rounded-full text-white font-semibold flex items-center justify-center select-none`}>
        {initials(name)}
      </div>
      {online && <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white" />}
    </div>
  );
};

type IconName = 'search' | 'plus' | 'send' | 'back' | 'clock' | 'template' | 'chat' | 'alert' | 'close' | 'phone' | 'check' | 'doubleCheck' | 'inbox' | 'sparkle';

const PATHS: Record<IconName, React.ReactNode> = {
  search: <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z" />,
  plus: <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />,
  send: <path strokeLinecap="round" strokeLinejoin="round" d="M5 12L3 4l18 8-18 8 2-8zm0 0h8" />,
  back: <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />,
  clock: <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z" />,
  template: <path strokeLinecap="round" strokeLinejoin="round" d="M4 5h16M4 10h16M4 15h10M4 20h7" />,
  chat: <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h8M8 14h5m-9 6l2.5-3H18a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v14z" />,
  alert: <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" />,
  close: <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />,
  phone: <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.3a1 1 0 01.95.68l1.5 4.5a1 1 0 01-.5 1.2l-2.26 1.13a11 11 0 005.5 5.5l1.13-2.26a1 1 0 011.2-.5l4.5 1.5a1 1 0 01.68.95V19a2 2 0 01-2 2h-1C9.72 21 3 14.28 3 6V5z" />,
  check: <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />,
  doubleCheck: <path strokeLinecap="round" strokeLinejoin="round" d="M1.5 12.5l4 4 9.5-9.5M9 15.5l1 1 9.5-9.5" />,
  inbox: <path strokeLinecap="round" strokeLinejoin="round" d="M3 13h5l1.5 3h5L16 13h5M5 5h14l2 8v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5l2-8z" />,
  sparkle: <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" />,
};

export const Icon: React.FC<{ name: IconName; className?: string }> = ({ name, className = 'w-5 h-5' }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
    {PATHS[name]}
  </svg>
);

export const GROUP_META: Record<InboxGroup, { label: string; chip: string }> = {
  course: { label: 'Course', chip: 'bg-blue-50 text-blue-700 ring-blue-200' },
  workshop: { label: 'Workshop', chip: 'bg-purple-50 text-purple-700 ring-purple-200' },
  personal: { label: 'Personal', chip: 'bg-gray-100 text-gray-700 ring-gray-200' },
};

export const formatPhone = (mobile: string) => {
  const m = mobile.match(/^\+91(\d{5})(\d{5})$/);
  return m ? `+91 ${m[1]} ${m[2]}` : mobile;
};

export const formatListTime = (iso: string) => {
  const d = new Date(iso);
  const now = new Date();
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  if (now.getTime() - d.getTime() < 6 * 86400000) return d.toLocaleDateString('en-IN', { weekday: 'short' });
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};

export const dayLabel = (d: Date) => {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
};

export const windowLeft = (lastInboundAt?: string) => {
  if (!lastInboundAt) return null;
  const ms = new Date(lastInboundAt).getTime() + 86400000 - Date.now();
  if (ms <= 0) return null;
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m left` : `${m}m left`;
};

export const StatusTicks: React.FC<{ message: Pick<WhatsAppMessage, 'direction' | 'status' | 'errorMessage'>; className?: string }> = ({ message, className = 'w-4 h-4' }) => {
  if (message.direction === 'inbound') return null;
  if (message.status === 'failed') return <span title={message.errorMessage}><Icon name="alert" className={`${className} text-red-500`} /></span>;
  if (message.status === 'read') return <Icon name="doubleCheck" className={`${className} text-sky-500`} />;
  if (message.status === 'delivered') return <Icon name="doubleCheck" className={`${className} text-gray-400`} />;
  if (message.status === 'sent') return <Icon name="check" className={`${className} text-gray-400`} />;
  return <Icon name="clock" className={`${className} text-gray-400`} />;
};

export const plainText = (text: string) =>
  text
    .replace(/\*([^*\n]+)\*/g, '$1')
    .replace(/~([^~\n]+)~/g, '$1')
    .replace(/```([^`]+)```/g, '$1')
    .replace(/(^|[\s(])_([^_\n{}]+)_(?=$|[\s.,!?)])/g, '$1$2');

export const CHAT_BACKGROUND: React.CSSProperties = {
  backgroundColor: '#efeae2',
  backgroundImage: 'radial-gradient(rgba(0,0,0,0.045) 1px, transparent 1px)',
  backgroundSize: '18px 18px',
};
