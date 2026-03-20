'use client';

import React, { useState, useEffect } from 'react';
import { Layout } from '@/components/layout';
import { KanbanContainer } from '@/components/kanban';
import { useGetLeadsQuery } from '@/store/api';
import { useAppDispatch } from '@/hooks/redux';
import { setLeads } from '@/store/slices/leadsSlice';
import { Button, Card, Input, Select } from '@/components/ui';
import { LeadStage } from '@/types';
import CreateLeadModal from '@/components/forms/CreateLeadModal';

export default function LeadsPage() {
  const dispatch = useAppDispatch();
  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const { data: leadsData, refetch } = useGetLeadsQuery({
    page: 1,
    limit: 100,
    filters: {
      ...(searchQuery ? { search: searchQuery } : {}),
      ...(stageFilter ? { stage: stageFilter as LeadStage } : {}),
    },
  });

  // Sync fetched leads into Redux store for Kanban
  useEffect(() => {
    if (leadsData?.data) {
      dispatch(setLeads(leadsData.data));
    }
  }, [leadsData, dispatch]);

  const leads = leadsData?.data || [];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
            <p className="text-gray-600 mt-1">Manage your leads and track progress</p>
          </div>
          <Button 
            variant="primary"
            onClick={() => setIsCreateModalOpen(true)}
          >
            ➕ Add New Lead
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Search leads..."
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
                { value: '', label: 'All Stages' },
                { value: LeadStage.NEW, label: 'New' },
                { value: LeadStage.CONTACTED, label: 'Contacted' },
                { value: LeadStage.INTERESTED, label: 'Interested' },
                { value: LeadStage.CONVERTED, label: 'Converted' },
              ]}
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
            />

            <div className="flex gap-2">
              <Button
                variant={view === 'kanban' ? 'primary' : 'outline'}
                onClick={() => setView('kanban')}
              >
                📋 Kanban
              </Button>
              <Button
                variant={view === 'list' ? 'primary' : 'outline'}
                onClick={() => setView('list')}
              >
                📝 List
              </Button>
            </div>
          </div>
        </Card>

        {/* Content */}
        {view === 'kanban' ? (
          <KanbanContainer onRefresh={refetch} />
        ) : (
          <Card>
            <div className="text-center py-12 text-gray-500">
              <p>List view coming soon...</p>
              <p className="text-sm mt-2">Use Kanban view for now</p>
            </div>
          </Card>
        )}

        {/* Create Lead Modal */}
        <CreateLeadModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => setIsCreateModalOpen(false)}
        />
      </div>
    </Layout>
  );
}
