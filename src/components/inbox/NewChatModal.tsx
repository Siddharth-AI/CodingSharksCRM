'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui';
import { useGetCoursesQuery, useSendMessageMutation, useStartChatMutation } from '@/store/api';
import { TemplateComposer } from './TemplateComposer';
import { Avatar, Icon, formatPhone } from './inboxUi';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStarted: (leadId: string) => void;
}

type ApiError = { data?: { error?: string } };

const NewChatForm: React.FC<Omit<NewChatModalProps, 'isOpen'>> = ({ onClose, onStarted }) => {
  const { data: coursesData } = useGetCoursesQuery();
  const [startChat, { isLoading: isStarting }] = useStartChatMutation();
  const [sendMessage, { isLoading: isSending }] = useSendMessageMutation();
  const [mobile, setMobile] = useState('');
  const [name, setName] = useState('');
  const [courseId, setCourseId] = useState('');
  const [showCourse, setShowCourse] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contact, setContact] = useState<{ leadId: string; name: string; mobile: string; created: boolean } | null>(null);

  const digits = mobile.replace(/\D/g, '');
  const valid = digits.length === 10 || (digits.length === 12 && digits.startsWith('91'));

  const next = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!valid) {
      setError('Enter a 10-digit Indian mobile number');
      return;
    }
    try {
      const res = await startChat({ mobile: digits, name: name.trim() || undefined, courseId: courseId || null }).unwrap();
      if (res.data) {
        setContact({ leadId: res.data.leadId, name: res.data.name, mobile: `+91${digits.slice(-10)}`, created: res.data.created });
      }
    } catch (err: unknown) {
      setError((err as ApiError)?.data?.error || 'Could not start chat');
    }
  };

  const sendTemplate = async (templateId: string, values: Record<string, string>) => {
    if (!contact) return false;
    setError(null);
    try {
      await sendMessage({ leadId: contact.leadId, content: '', useTemplate: true, templateId, templateVariables: values }).unwrap();
      onStarted(contact.leadId);
      return true;
    } catch (err: unknown) {
      setError((err as ApiError)?.data?.error || 'Failed to send template');
      return false;
    }
  };

  if (contact) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5">
          <Avatar name={contact.name} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-gray-900">{contact.name}</p>
            <p className="text-xs text-gray-500">
              {formatPhone(contact.mobile)} · {contact.created ? 'new contact' : 'existing lead'}
            </p>
          </div>
          <button type="button" onClick={() => setContact(null)} className="text-xs font-medium text-blue-600 hover:underline">
            Change
          </button>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-gray-700">Choose a template to send</p>
          <TemplateComposer leadId={contact.leadId} isSending={isSending} onSend={sendTemplate} />
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
            <Icon name="alert" className="mt-px w-4 h-4 flex-none" />
            {error}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => onStarted(contact.leadId)}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
          >
            Skip — just open chat
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={next} className="space-y-4">
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-gray-700">
          Mobile number <span className="text-red-500">*</span>
        </span>
        <div className="flex rounded-lg border border-gray-300 focus-within:ring-2 focus-within:ring-blue-500">
          <span className="flex items-center rounded-l-lg border-r border-gray-200 bg-gray-50 px-3 text-sm text-gray-600">+91</span>
          <input
            type="tel"
            inputMode="numeric"
            autoFocus
            value={mobile}
            onChange={e => setMobile(e.target.value)}
            placeholder="98765 43210"
            className="w-full rounded-r-lg px-3 py-2 text-sm focus:outline-none"
          />
        </div>
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-gray-700">
          Name <span className="font-normal text-gray-400">(optional)</span>
        </span>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Contact name"
          maxLength={100}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </label>

      {showCourse ? (
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">
            Course / workshop <span className="font-normal text-gray-400">(optional)</span>
          </span>
          <select
            value={courseId}
            onChange={e => setCourseId(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">No course</option>
            {(coursesData?.data || []).map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <button type="button" onClick={() => setShowCourse(true)} className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline">
          <Icon name="plus" className="w-3.5 h-3.5" />
          Add to a course (optional)
        </button>
      )}

      <p className="text-xs text-gray-500">
        Next you pick an approved template (e.g. hello_world). WhatsApp requires a template for the first message to a new contact.
      </p>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">
          Cancel
        </button>
        <button
          type="submit"
          disabled={isStarting}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
        >
          {isStarting ? 'Checking...' : 'Next: choose template'}
        </button>
      </div>
    </form>
  );
};

export const NewChatModal: React.FC<NewChatModalProps> = ({ isOpen, onClose, onStarted }) => (
  <Modal isOpen={isOpen} onClose={onClose} title="New WhatsApp chat" size="lg">
    {isOpen && <NewChatForm onClose={onClose} onStarted={onStarted} />}
  </Modal>
);
