'use client';

import React, { useState } from 'react';
import { Layout } from '@/components/layout';
import {
  useGetTemplatesQuery,
  useDeleteTemplateMutation,
  useSubmitTemplateToMetaMutation,
  useSyncTemplateStatusesMutation,
} from '@/store/api';
import { Button, Card, Input, Select, Modal } from '@/components/ui';
import CreateTemplateModal from '@/components/forms/CreateTemplateModal';
import { EditTemplateModal } from '@/components/forms/EditTemplateModal';
import { MessageTemplate, MetaTemplateCategory } from '@/types';

const META_STATUS_STYLES: Record<string, { label: string; className: string }> = {
  APPROVED: { label: 'WhatsApp: Approved', className: 'bg-green-100 text-green-800' },
  PENDING: { label: 'WhatsApp: In review', className: 'bg-yellow-100 text-yellow-800' },
  REJECTED: { label: 'WhatsApp: Rejected', className: 'bg-red-100 text-red-800' },
  EDITED: { label: 'WhatsApp: Edited - resubmit', className: 'bg-orange-100 text-orange-800' },
  PAUSED: { label: 'WhatsApp: Paused', className: 'bg-orange-100 text-orange-800' },
  DISABLED: { label: 'WhatsApp: Disabled', className: 'bg-gray-200 text-gray-800' },
};

const metaBadge = (status?: string) =>
  status
    ? META_STATUS_STYLES[status] || { label: `WhatsApp: ${status}`, className: 'bg-gray-100 text-gray-800' }
    : { label: 'WhatsApp: Not submitted', className: 'bg-gray-100 text-gray-600' };

export default function TemplatesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);
  
  const { data: templatesData, isLoading, refetch } = useGetTemplatesQuery({
    page: 1,
    limit: 50,
    search: searchQuery,
    type: typeFilter,
  });
  const [deleteTemplate] = useDeleteTemplateMutation();
  const [submitToMeta, { isLoading: isSubmitting }] = useSubmitTemplateToMetaMutation();
  const [syncStatuses, { isLoading: isSyncing }] = useSyncTemplateStatusesMutation();
  const [submitTarget, setSubmitTarget] = useState<MessageTemplate | null>(null);
  const [submitCategory, setSubmitCategory] = useState<MetaTemplateCategory>('MARKETING');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const openSubmit = (template: MessageTemplate) => {
    setSubmitTarget(template);
    setSubmitCategory(template.metaCategory || (template.type === 'welcome' ? 'UTILITY' : 'MARKETING'));
    setSubmitError(null);
  };

  const handleSubmitToMeta = async () => {
    if (!submitTarget) return;
    setSubmitError(null);
    try {
      await submitToMeta({ id: submitTarget.id, category: submitCategory }).unwrap();
      setSubmitTarget(null);
    } catch (error: unknown) {
      setSubmitError((error as { data?: { error?: string } })?.data?.error || 'Failed to submit template to WhatsApp');
    }
  };

  const handleSync = async () => {
    try {
      await syncStatuses().unwrap();
    } catch (error: unknown) {
      alert((error as { data?: { error?: string } })?.data?.error || 'Failed to refresh WhatsApp status');
    }
  };

  const templates = templatesData?.data || [];

  const handleCreateSuccess = () => {
    refetch(); // Refresh the templates data
  };

  const handleEditSuccess = () => {
    refetch();
    setSelectedTemplate(null);
  };

  const handleEdit = (template: MessageTemplate) => {
    setSelectedTemplate(template);
    setIsEditModalOpen(true);
  };

  const handleDelete = async (template: MessageTemplate) => {
    if (!confirm(`Are you sure you want to delete "${template.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteTemplate(template.id).unwrap();
      refetch();
    } catch (error: any) {
      alert(error?.data?.error || 'Failed to delete template. Please try again.');
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Message Templates</h1>
            <p className="text-gray-600 mt-1">Create and manage WhatsApp message templates</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSync} isLoading={isSyncing}>
              Refresh WhatsApp status
            </Button>
            <Button 
              variant="primary"
              onClick={() => setIsCreateModalOpen(true)}
            >
              ➕ Create Template
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                }
              />
            </div>

            <Select
              options={[
                { value: '', label: 'All Types' },
                { value: 'welcome', label: 'Welcome' },
                { value: 'follow_up_day_1', label: 'Follow-up Day 1' },
                { value: 'follow_up_day_2', label: 'Follow-up Day 2' },
                { value: 'follow_up_day_3', label: 'Follow-up Day 3' },
              ]}
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            />
          </div>
        </Card>

        {/* Templates Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <div className="h-32 bg-gray-200 rounded"></div>
              </Card>
            ))}
          </div>
        ) : templates.length === 0 ? (
          <Card>
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg">No templates found</p>
              <p className="text-sm mt-2">Create your first template to get started</p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {templates.map((template) => (
              <Card key={template.id} hover className="cursor-pointer">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{template.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{template.type}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      template.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {template.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${metaBadge(template.metaStatus).className}`}>
                      {metaBadge(template.metaStatus).label}
                    </span>
                    {template.metaCategory && (
                      <span className="px-2 py-1 text-xs rounded-full bg-blue-50 text-blue-700">{template.metaCategory}</span>
                    )}
                  </div>

                  {template.metaStatus === 'REJECTED' && template.metaRejectionReason && (
                    <p className="text-xs text-red-700 bg-red-50 rounded p-2">Reason: {template.metaRejectionReason}</p>
                  )}

                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-4">
                      {template.content}
                    </p>
                  </div>

                  {template.variables && template.variables.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {template.variables.map((variable, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded"
                        >
                          {`{{${variable}}}`}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2 pt-4 border-t border-gray-200">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      fullWidth
                      onClick={() => handleEdit(template)}
                    >
                      Edit
                    </Button>
                    {template.metaStatus !== 'APPROVED' && template.metaStatus !== 'PENDING' && (
                      <Button
                        variant="primary"
                        size="sm"
                        fullWidth
                        onClick={() => openSubmit(template)}
                      >
                        {template.metaStatus ? 'Resubmit to WhatsApp' : 'Submit to WhatsApp'}
                      </Button>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      fullWidth
                      onClick={() => handleDelete(template)}
                      className="text-red-600 hover:text-red-700 hover:border-red-300"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        <Modal
          isOpen={!!submitTarget}
          onClose={() => setSubmitTarget(null)}
          title="Submit template to WhatsApp"
          size="md"
        >
          {submitTarget && (
            <div className="space-y-4">
              <p className="text-sm text-gray-700">
                <span className="font-medium">{submitTarget.name}</span> will be sent to WhatsApp for review.
                Review usually takes a few minutes and can take up to 24 hours.
              </p>
              <Select
                label="Category"
                options={[
                  { value: 'UTILITY', label: 'Utility - updates about an enquiry (welcome, batch details, fees reminder)' },
                  { value: 'MARKETING', label: 'Marketing - offers, promotions, new courses' },
                ]}
                value={submitCategory}
                onChange={e => setSubmitCategory(e.target.value as MetaTemplateCategory)}
              />
              <p className="text-xs text-gray-500">
                WhatsApp can change the category after review. Marketing messages cost more than utility messages.
              </p>
              {submitError && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-3 py-2 rounded text-sm">{submitError}</div>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSubmitTarget(null)} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={handleSubmitToMeta} isLoading={isSubmitting}>
                  Submit
                </Button>
              </div>
            </div>
          )}
        </Modal>

        {/* Create Template Modal */}
        <CreateTemplateModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={handleCreateSuccess}
        />

        {/* Edit Template Modal */}
        {selectedTemplate && (
          <EditTemplateModal
            isOpen={isEditModalOpen}
            onClose={() => {
              setIsEditModalOpen(false);
              setSelectedTemplate(null);
            }}
            template={selectedTemplate}
            onSuccess={handleEditSuccess}
          />
        )}
      </div>
    </Layout>
  );
}
