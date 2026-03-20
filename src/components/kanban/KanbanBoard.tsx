'use client';

import React, { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { arrayMove, SortableContext } from '@dnd-kit/sortable';
import { Lead, LeadStage } from '@/types';
import { KanbanColumn } from './KanbanColumn';
import { LeadCard } from './LeadCard';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import {
  selectLeadsByStage,
  selectKanbanView,
  setDraggedLead,
  optimisticStageChange,
  reorderColumn,
} from '@/store/slices/leadsSlice';
import { useUpdateLeadStageMutation } from '@/store/api';

interface KanbanBoardProps {
  className?: string;
  onRefresh?: () => void;
}

const STAGE_CONFIG = {
  [LeadStage.NEW]: {
    title: 'New Leads',
    color: 'bg-blue-100 border-blue-200',
    headerColor: 'bg-blue-500',
    count: 0,
  },
  [LeadStage.CONTACTED]: {
    title: 'Contacted',
    color: 'bg-yellow-100 border-yellow-200',
    headerColor: 'bg-yellow-500',
    count: 0,
  },
  [LeadStage.INTERESTED]: {
    title: 'Interested',
    color: 'bg-orange-100 border-orange-200',
    headerColor: 'bg-orange-500',
    count: 0,
  },
  [LeadStage.CONVERTED]: {
    title: 'Converted',
    color: 'bg-green-100 border-green-200',
    headerColor: 'bg-green-500',
    count: 0,
  },
};

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ className = '', onRefresh }) => {
  const dispatch = useAppDispatch();
  const leadsByStage = useAppSelector(selectLeadsByStage);
  const kanbanView = useAppSelector(selectKanbanView);
  const [updateLeadStage] = useUpdateLeadStageMutation();
  
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draggedLead, setDraggedLeadLocal] = useState<Lead | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);
    
    // Find the dragged lead
    const lead = Object.values(leadsByStage)
      .flat()
      .find(l => l.id === active.id);
    
    if (lead) {
      setDraggedLeadLocal(lead);
      dispatch(setDraggedLead(lead));
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    
    if (!over) return;
    
    const activeId = active.id as string;
    const overId = over.id as string;
    
    // Check if we're dragging over a different column
    const activeStage = findLeadStage(activeId);
    const overStage = overId as LeadStage;
    
    if (activeStage && overStage && activeStage !== overStage) {
      // This is handled in handleDragEnd for actual stage changes
      return;
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveId(null);
    setDraggedLeadLocal(null);
    dispatch(setDraggedLead(null));

    if (!over) return;

    const leadId   = active.id as string;
    const overId   = over.id as string;

    // over.id can be a stage string OR a lead UUID (when dropped on a card)
    const validStages = Object.values(LeadStage) as string[];
    const newStage: LeadStage = validStages.includes(overId)
      ? (overId as LeadStage)
      : (findLeadStage(overId) as LeadStage);

    const currentStage = findLeadStage(leadId);

    if (!currentStage || !newStage) return;

    // ── Same column: reorder only ──────────────────────────────────────────
    if (currentStage === newStage) {
      const col = leadsByStage[currentStage] || [];
      const fromIndex = col.findIndex(l => l.id === leadId);
      // overId could be a lead UUID (card) or the stage droppable
      const toIndex = validStages.includes(overId)
        ? col.length - 1                            // dropped on empty area → move to end
        : col.findIndex(l => l.id === overId);
      if (fromIndex !== -1 && toIndex !== -1 && fromIndex !== toIndex) {
        dispatch(reorderColumn({ stage: currentStage, fromIndex, toIndex }));
      }
      return;
    }

    // ── Different column: stage change ────────────────────────────────────
    try {
      dispatch(optimisticStageChange({ leadId, newStage, oldStage: currentStage }));
      await updateLeadStage({ id: leadId, stage: newStage }).unwrap();
    } catch (error) {
      console.error('Failed to update lead stage:', error);
      dispatch(optimisticStageChange({ leadId, newStage: currentStage, oldStage: newStage }));
    }
  };

  const findLeadStage = (leadId: string): LeadStage | null => {
    for (const [stage, leads] of Object.entries(leadsByStage)) {
      if (leads.some(lead => lead.id === leadId)) {
        return stage as LeadStage;
      }
    }
    return null;
  };

  const getStageConfig = (stage: LeadStage) => ({
    ...STAGE_CONFIG[stage],
    count: leadsByStage[stage]?.length || 0,
  });

  return (
    <div className={`kanban-board ${className}`}>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-6 h-full overflow-x-auto pb-6">
          {Object.values(LeadStage).map((stage) => {
            const config = getStageConfig(stage);
            const leads = leadsByStage[stage] || [];
            
            return (
              <KanbanColumn
                key={stage}
                stage={stage}
                title={config.title}
                count={config.count}
                color={config.color}
                headerColor={config.headerColor}
                leads={leads}
                onRefresh={onRefresh}
              />
            );
          })}
        </div>
        
        <DragOverlay>
          {draggedLead ? (
            <div className="rotate-3 opacity-90">
              <LeadCard
                lead={draggedLead}
                isDragging={true}
                onRefresh={onRefresh}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
};