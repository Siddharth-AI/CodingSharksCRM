'use client';

import React from 'react';
import { KanbanBoard } from './KanbanBoard';
import { useAppSelector } from '@/hooks/redux';
import {
  selectLeadsLoading,
  selectLeadsError,
  selectLeads,
} from '@/store/slices/leadsSlice';

interface KanbanContainerProps {
  className?: string;
  onRefresh?: () => void;
}

export const KanbanContainer: React.FC<KanbanContainerProps> = ({ className = '', onRefresh }) => {
  const isLoading = useAppSelector(selectLeadsLoading);
  const error     = useAppSelector(selectLeadsError);
  const leads     = useAppSelector(selectLeads);

  if (isLoading) {
    return (
      <div className={`kanban-container ${className}`}>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading leads...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`kanban-container ${className}`}>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="text-red-500 text-4xl mb-4">⚠️</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load leads</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => onRefresh?.()}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!leads || leads.length === 0) {
    return (
      <div className={`kanban-container ${className}`}>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="text-gray-400 text-6xl mb-4">📋</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No leads found
            </h3>
            <p className="text-gray-600 mb-4">
              Start by creating your first lead to see it in the Kanban board.
            </p>
            <button
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
              onClick={() => {
                // Handle create lead action
                console.log('Create new lead');
              }}
            >
              Create Lead
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`kanban-container ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Lead Pipeline</h2>
            <p className="text-gray-600 mt-1">
              Drag and drop leads between stages to update their status
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Stats */}
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                <span>{leads.filter(l => l.stage === 'new').length} New</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                <span>{leads.filter(l => l.stage === 'contacted').length} Contacted</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-orange-500 rounded-full mr-2"></div>
                <span>{leads.filter(l => l.stage === 'interested').length} Interested</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                <span>{leads.filter(l => l.stage === 'converted').length} Converted</span>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex space-x-2">
              <button
                onClick={() => onRefresh?.()}
                className="bg-gray-100 text-gray-700 px-3 py-2 rounded text-sm hover:bg-gray-200 transition-colors"
              >
                🔄 Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <KanbanBoard onRefresh={onRefresh} />
    </div>
  );
};