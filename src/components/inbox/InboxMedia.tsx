'use client';

import React, { useEffect, useState } from 'react';
import { useAppSelector } from '@/hooks/redux';
import { selectAuthToken } from '@/store/slices/authSlice';

interface InboxMediaProps {
  mediaId: string;
  messageType: string;
  mimeType?: string;
}

export const InboxMedia: React.FC<InboxMediaProps> = ({ mediaId, messageType, mimeType }) => {
  const token = useAppSelector(selectAuthToken);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    fetch(`/api/whatsapp/media/${mediaId}`, { headers: token ? { authorization: `Bearer ${token}` } : {} })
      .then(async res => {
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error || 'Failed to load media');
        }
        return res.blob();
      })
      .then(blob => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(err => !cancelled && setError(err.message));

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [mediaId, token]);

  if (error) return <p className="text-xs text-red-600">{error}</p>;
  if (!url) return <div className="w-48 h-32 bg-gray-200 rounded animate-pulse" />;

  if (messageType === 'image' || messageType === 'sticker') {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer">
        <img src={url} alt="WhatsApp attachment" className="max-w-[240px] max-h-64 rounded" />
      </a>
    );
  }
  if (messageType === 'video') return <video src={url} controls className="max-w-[260px] rounded" />;
  if (messageType === 'audio') return <audio src={url} controls className="max-w-[260px]" />;

  return (
    <a href={url} download className="text-sm text-blue-600 underline">
      Download file{mimeType ? ` (${mimeType})` : ''}
    </a>
  );
};
