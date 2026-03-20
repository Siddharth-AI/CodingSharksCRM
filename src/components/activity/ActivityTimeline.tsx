'use client';

import React, { useState } from 'react';
import { Activity, ActivityType } from '@/types';
import { useGetActivitiesQuery, useGetCoursesQuery } from '@/store/api';
import { formatActivityForDisplay } from '@/models/activity';

interface ActivityTimelineProps {
  leadId?: string;
  limit?: number;
  showFilters?: boolean;
}

export default function ActivityTimeline({ 
  leadId, 
  limit = 20,
  showFilters = true 
}: ActivityTimelineProps) {
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<ActivityType | undefined>(undefined);
  const [dateFromFilter, setDateFromFilter] = useState<string>('');
  const [dateToFilter, setDateToFilter] = useState<string>('');

  const { data, isLoading, error, refetch } = useGetActivitiesQuery({
    leadId,
    page,
    limit,
    type: typeFilter,
  });

  const activities = data?.data || [];
  const pagination = (data as any)?.pagination;
  const { data: coursesData } = useGetCoursesQuery();
  const courses = coursesData?.data || [];

  const handleTypeFilterChange = (type: string) => {
    setTypeFilter(type === 'all' ? undefined : type as ActivityType);
    setPage(1);
  };

  const handleClearFilters = () => {
    setTypeFilter(undefined);
    setDateFromFilter('');
    setDateToFilter('');
    setPage(1);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Failed to load activities. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* Timeline */}
      <div className="bg-white border border-gray-200 rounded-lg">
        {activities.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>No activities found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {activities.map((activity) => {
              const formatted = formatActivityForDisplay(activity);
              return (
                <ActivityTimelineItem
                  key={activity.id}
                  activity={activity}
                  formatted={formatted}
                  courses={courses}
                />
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="border-t border-gray-200 px-4 py-3 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page === pagination.totalPages}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface ActivityTimelineItemProps {
  activity: Activity;
  formatted: {
    icon: string;
    color: string;
    title: string;
    description: string;
    timestamp: string;
  };
  courses: { id: string; name: string }[];
}

function ActivityTimelineItem({ activity, formatted, courses }: ActivityTimelineItemProps) {
  // Fields to hide from metadata display
  const HIDDEN_KEYS = new Set(['changedBy', 'duplicateCount', 'performedBy']);

  const resolveMetaValue = (key: string, value: unknown): string => {
    if (key === 'courseInterest') {
      const course = courses.find(c => c.id === String(value));
      return course ? course.name : String(value);
    }
    return String(value);
  };
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-800 border-blue-200',
    gray: 'bg-gray-100 text-gray-800 border-gray-200',
    purple: 'bg-purple-100 text-purple-800 border-purple-200',
    green: 'bg-green-100 text-green-800 border-green-200',
    red: 'bg-red-100 text-red-800 border-red-200',
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    orange: 'bg-orange-100 text-orange-800 border-orange-200',
    indigo: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  };

  const colorClass = colorClasses[formatted.color] || colorClasses.gray;

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="p-4 hover:bg-gray-50 transition-colors">
      <div className="flex gap-3">
        {/* Icon */}
        <div className={`flex-shrink-0 w-10 h-10 rounded-full border-2 flex items-center justify-center text-lg ${colorClass}`}>
          {formatted.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h4 className="text-sm font-medium text-gray-900">
                {formatted.title}
              </h4>
              <p className="text-sm text-gray-600 mt-1">
                {formatted.description}
              </p>
            </div>
            <time className="text-xs text-gray-500 whitespace-nowrap">
              {formatTimestamp(formatted.timestamp)}
            </time>
          </div>

          {/* Metadata */}
          {activity.metadata && Object.keys(activity.metadata).length > 0 && (
            <div className="mt-2 text-xs text-gray-500">
              {Object.entries(activity.metadata)
                .filter(([key]) => !HIDDEN_KEYS.has(key))
                .map(([key, value]) => (
                  <span key={key} className="mr-3">
                    <span className="font-medium">{key.replace(/([A-Z])/g, ' $1').toLowerCase()}:</span>{' '}
                    {resolveMetaValue(key, value)}
                  </span>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
