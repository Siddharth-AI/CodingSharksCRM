'use client';

import React, { useState } from 'react';
import { Layout } from '@/components/layout';
import { useGetMessagesQuery, useDeleteMessageMutation } from '@/store/api';
import { Button, Card, Select } from '@/components/ui';
import { MessageStatus, WhatsAppMessage } from '@/types';
import SendMessageModal from '@/components/forms/SendMessageModal';
import { renderWhatsAppText } from '@/components/forms/WhatsAppTextarea';

export default function MessagesPage() {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [expandedMessageId, setExpandedMessageId] = useState<string | null>(null);
  const [viewMessage, setViewMessage] = useState<WhatsAppMessage | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: messagesData, isLoading, refetch } = useGetMessagesQuery({
    page: 1,
    limit: 50,
  });
  const [deleteMessage] = useDeleteMessageMutation();

  const messages = messagesData?.data || [];
  const filteredMessages = statusFilter
    ? messages.filter(msg => msg.status === statusFilter)
    : messages;

  const handleSendSuccess = () => {
    refetch();
  };

  const handleDelete = async (message: WhatsAppMessage) => {
    if (!confirm(`Delete this message? This action cannot be undone.`)) return;
    setDeletingId(message.id);
    try {
      await deleteMessage(message.id).unwrap();
      if (viewMessage?.id === message.id) setViewMessage(null);
    } catch (err) {
      console.error('Failed to delete message:', err);
      alert('Failed to delete message. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusColor = (status: MessageStatus) => {
    const colors = {
      [MessageStatus.PENDING]: 'bg-yellow-100 text-yellow-800',
      [MessageStatus.SENT]: 'bg-blue-100 text-blue-800',
      [MessageStatus.DELIVERED]: 'bg-green-100 text-green-800',
      [MessageStatus.READ]: 'bg-purple-100 text-purple-800',
      [MessageStatus.FAILED]: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
            <p className="text-gray-600 mt-1">View and manage WhatsApp messages</p>
          </div>
          <Button
            variant="primary"
            onClick={() => setIsSendModalOpen(true)}
          >
            📤 Send Message
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <div className="flex gap-4">
            <Select
              options={[
                { value: '', label: 'All Status' },
                { value: MessageStatus.PENDING, label: 'Pending' },
                { value: MessageStatus.SENT, label: 'Sent' },
                { value: MessageStatus.DELIVERED, label: 'Delivered' },
                { value: MessageStatus.READ, label: 'Read' },
                { value: MessageStatus.FAILED, label: 'Failed' },
              ]}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            />
          </div>
        </Card>

        {/* Messages List */}
        <Card>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-20 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg">No messages found</p>
              <p className="text-sm mt-2">Send your first message to get started</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredMessages.map((message) => {
                const isExpanded = expandedMessageId === message.id;
                const isDeleting = deletingId === message.id;
                return (
                  <div key={message.id} className="py-4 hover:bg-gray-50 transition-colors px-2">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-1 text-xs rounded-full font-medium ${getStatusColor(message.status)}`}>
                            {message.status}
                          </span>
                          <span className="text-sm text-gray-500">
                            Lead ID: {message.leadId}
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(message.createdAt).toLocaleString()}
                          </span>
                        </div>

                        {/* Message content — expandable */}
                        <div
                          className={`text-sm text-gray-900 ${isExpanded ? '' : 'line-clamp-2'}`}
                          dangerouslySetInnerHTML={{ __html: renderWhatsAppText(message.content) }}
                        />
                        {message.content && message.content.length > 120 && (
                          <button
                            className="text-xs text-blue-600 hover:underline mt-1"
                            onClick={() => setExpandedMessageId(isExpanded ? null : message.id)}
                          >
                            {isExpanded ? 'Show less' : 'Show more'}
                          </button>
                        )}

                        {/* Media thumbnails in list */}
                        {(message.mediaImageUrl || message.mediaVideoUrl) && (
                          <div className="flex gap-2 mt-2">
                            {message.mediaImageUrl && (
                              <img
                                src={message.mediaImageUrl}
                                alt="Image"
                                className="w-16 h-16 object-cover rounded border cursor-pointer"
                                onClick={() => window.open(message.mediaImageUrl, '_blank')}
                              />
                            )}
                            {message.mediaVideoUrl && (
                              <video
                                src={message.mediaVideoUrl}
                                className="w-16 h-16 object-cover rounded border cursor-pointer"
                                onClick={() => window.open(message.mediaVideoUrl, '_blank')}
                              />
                            )}
                          </div>
                        )}

                        {message.errorMessage && (
                          <p className="text-xs text-red-500 mt-1">Error: {message.errorMessage}</p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded hover:bg-blue-100 transition-colors"
                          onClick={() => setViewMessage(message)}
                        >
                          View
                        </button>
                        <button
                          className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded hover:bg-red-100 transition-colors disabled:opacity-50"
                          onClick={() => handleDelete(message)}
                          disabled={isDeleting}
                        >
                          {isDeleting ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Send Message Modal */}
        <SendMessageModal
          isOpen={isSendModalOpen}
          onClose={() => setIsSendModalOpen(false)}
          onSuccess={handleSendSuccess}
        />

        {/* View Message Modal */}
        {viewMessage && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-lg font-semibold text-gray-900">Message Details</h2>
                <button
                  onClick={() => setViewMessage(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                >
                  ×
                </button>
              </div>
              <div className="p-4 overflow-y-auto space-y-3">
                <div className="flex gap-2 items-center">
                  <span className={`px-2 py-1 text-xs rounded-full font-medium ${getStatusColor(viewMessage.status)}`}>
                    {viewMessage.status}
                  </span>
                  <span className="text-sm text-gray-500">Lead: {viewMessage.leadId}</span>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Content</p>
                  <div
                    className="bg-gray-50 rounded-md p-3 text-sm text-gray-900 leading-relaxed border"
                    dangerouslySetInnerHTML={{ __html: renderWhatsAppText(viewMessage.content) }}
                  />
                </div>

                {/* Media in modal */}
                {(viewMessage.mediaImageUrl || viewMessage.mediaVideoUrl) && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-2">Media</p>
                    <div className="flex gap-3">
                      {viewMessage.mediaImageUrl && (
                        <div>
                          <p className="text-xs text-gray-400 mb-1">🖼️ Image</p>
                          <img
                            src={viewMessage.mediaImageUrl}
                            alt="Attached image"
                            className="max-w-[200px] max-h-[200px] object-cover rounded-md border cursor-pointer"
                            onClick={() => window.open(viewMessage.mediaImageUrl, '_blank')}
                          />
                        </div>
                      )}
                      {viewMessage.mediaVideoUrl && (
                        <div>
                          <p className="text-xs text-gray-400 mb-1">🎬 Video</p>
                          <video
                            src={viewMessage.mediaVideoUrl}
                            controls
                            className="max-w-[200px] max-h-[200px] rounded-md border"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {viewMessage.errorMessage && (
                  <div>
                    <p className="text-xs font-medium text-red-500 mb-1">Error</p>
                    <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{viewMessage.errorMessage}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-gray-500">Created</p>
                    <p className="text-gray-900">{new Date(viewMessage.createdAt).toLocaleString()}</p>
                  </div>
                  {viewMessage.sentAt && (
                    <div>
                      <p className="text-xs text-gray-500">Sent</p>
                      <p className="text-gray-900">{new Date(viewMessage.sentAt).toLocaleString()}</p>
                    </div>
                  )}
                  {viewMessage.deliveredAt && (
                    <div>
                      <p className="text-xs text-gray-500">Delivered</p>
                      <p className="text-gray-900">{new Date(viewMessage.deliveredAt).toLocaleString()}</p>
                    </div>
                  )}
                  {viewMessage.readAt && (
                    <div>
                      <p className="text-xs text-gray-500">Read</p>
                      <p className="text-gray-900">{new Date(viewMessage.readAt).toLocaleString()}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-gray-500">Retry Count</p>
                    <p className="text-gray-900">{viewMessage.retryCount}</p>
                  </div>
                </div>
              </div>
              <div className="p-4 border-t flex justify-between">
                <button
                  className="px-3 py-1.5 text-sm bg-red-50 text-red-700 rounded hover:bg-red-100 transition-colors disabled:opacity-50"
                  onClick={() => handleDelete(viewMessage)}
                  disabled={deletingId === viewMessage.id}
                >
                  {deletingId === viewMessage.id ? 'Deleting...' : 'Delete Message'}
                </button>
                <button
                  className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                  onClick={() => setViewMessage(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
