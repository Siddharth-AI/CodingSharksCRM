'use client';

import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Lead, LeadStage } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { EditLeadModal } from '@/components/forms/EditLeadModal';
import { useDeleteLeadMutation } from '@/store/api';
import { useAppSelector } from '@/hooks/redux';
import { selectCourses } from '@/store/slices/coursesSlice';

interface LeadCardProps {
  lead: Lead;
  isDragging: boolean;
  onRefresh?: () => void;
}

const STAGE_COLORS = {
  [LeadStage.NEW]: 'border-l-blue-500',
  [LeadStage.CONTACTED]: 'border-l-yellow-500',
  [LeadStage.INTERESTED]: 'border-l-orange-500',
  [LeadStage.CONVERTED]: 'border-l-green-500',
};

const SOURCE_ICONS = {
  website: '🌐',
  referral: '👥',
  social_media: '📱',
  advertisement: '📢',
  walk_in: '🚶',
};

export const LeadCard: React.FC<LeadCardProps> = ({ lead, isDragging, onRefresh }) => {
  const [deleteLead] = useDeleteLeadMutation();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const courses = useAppSelector(selectCourses);
  const courseName = courses.find(c => c.id === lead.courseInterest)?.name || lead.courseInterest;
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: lead.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const formatTimeAgo = (date: Date) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true });
    } catch {
      return 'Unknown';
    }
  };

  const handleEditSuccess = () => {
    setIsEditModalOpen(false);
    // RTK Query invalidatesTags auto-refetches
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete lead "${lead.name}"? This action cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteLead(lead.id).unwrap();
      // RTK Query invalidatesTags auto-refetches — no manual refresh needed
    } catch (error) {
      console.error('Failed to delete lead:', error);
      alert('Failed to delete lead. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`
        lead-card bg-white rounded-lg shadow-sm border-l-4 p-4 cursor-grab group
        hover:shadow-md transition-shadow duration-200
        ${STAGE_COLORS[lead.stage]}
        ${isDragging || isSortableDragging ? 'opacity-50 rotate-3 shadow-lg' : ''}
        ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}
      `}
    >
      {/* Lead Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          {/* Avatar */}
          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-sm font-semibold text-gray-600">
            {getInitials(lead.name)}
          </div>
          
          {/* Lead Info */}
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-gray-900 truncate text-sm">
              {lead.name}
            </h4>
            <p className="text-xs text-gray-500 truncate">
              {lead.email}
            </p>
          </div>
        </div>
        
        {/* Source Icon */}
        <div className="text-lg" title={`Source: ${lead.source}`}>
          {SOURCE_ICONS[lead.source] || '❓'}
        </div>
      </div>

      {/* Course Interest */}
      <div className="mb-3">
        <div className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-medium inline-block">
          📚 {courseName}
        </div>
      </div>

      {/* Contact Info */}
      <div className="space-y-1 mb-3">
        <div className="flex items-center text-xs text-gray-600">
          <span className="mr-2">📱</span>
          <span className="font-mono">{lead.mobile}</span>
        </div>
      </div>

      {/* Notes (if any) */}
      {lead.notes && (
        <div className="mb-3">
          <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded italic line-clamp-2">
            "{lead.notes}"
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
        <div className="flex items-center">
          <span className="mr-1">🕒</span>
          <span>Created {formatTimeAgo(lead.createdAt)}</span>
        </div>
        
        {lead.lastContactedAt && (
          <div className="flex items-center">
            <span className="mr-1">📞</span>
            <span>Contacted {formatTimeAgo(lead.lastContactedAt)}</span>
          </div>
        )}
      </div>

      {/* Quick Actions (visible on hover) */}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 mt-2 pt-2 border-t border-gray-100">
        <div className="flex space-x-2">
          <button
            className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setIsEditModalOpen(true);
            }}
            disabled={isDeleting}
          >
            Edit
          </button>
          <button
            className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              // Handle send message
              console.log('Send message to lead:', lead.id);
            }}
            disabled={isDeleting}
          >
            Message
          </button>
          <button
            className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete();
            }}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>

      {/* Edit Modal */}
      <EditLeadModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        lead={lead}
        onSuccess={handleEditSuccess}
      />
    </div>
  );
};