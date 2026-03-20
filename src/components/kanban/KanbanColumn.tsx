'use client';

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Lead, LeadStage } from '@/types';
import { LeadCard } from './LeadCard';

interface KanbanColumnProps {
  stage: LeadStage;
  title: string;
  count: number;
  color: string;
  headerColor: string;
  leads: Lead[];
  onRefresh?: () => void;
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  stage,
  title,
  count,
  color,
  headerColor,
  leads,
  onRefresh,
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: stage,
  });

  return (
    <div className="kanban-column flex-shrink-0 w-80">
      {/* Column Header */}
      <div className={`${headerColor} text-white px-4 py-3 rounded-t-lg`}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">{title}</h3>
          <span className="bg-white bg-opacity-20 px-2 py-1 rounded-full text-xs font-medium">
            {count}
          </span>
        </div>
      </div>

      {/* Column Body */}
      <div
        ref={setNodeRef}
        className={`
          ${color}
          border-2 border-t-0 rounded-b-lg
          min-h-[600px] max-h-[calc(100vh-220px)] overflow-y-auto
          p-4 space-y-3
          transition-colors duration-200
          ${isOver ? 'border-blue-400 bg-blue-50' : ''}
        `}
      >
        <SortableContext items={leads.map(lead => lead.id)} strategy={verticalListSortingStrategy}>
          {leads.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">📋</div>
              <p className="text-sm">No leads in this stage</p>
              <p className="text-xs text-gray-400 mt-1">
                Drag leads here to update their stage
              </p>
            </div>
          ) : (
            leads.map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                isDragging={false}
                onRefresh={onRefresh}
              />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  );
};