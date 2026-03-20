'use client';

import React from 'react';
import { TrendData } from '@/types';

interface LeadTrendsChartProps {
  data: TrendData[];
  isLoading?: boolean;
}

export default function LeadTrendsChart({ data, isLoading }: LeadTrendsChartProps) {
  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-6 animate-pulse"></div>
        <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Lead Trends</h3>
        <p className="text-gray-500 text-center py-8">No trend data available</p>
      </div>
    );
  }

  const maxNewLeads = Math.max(...data.map(d => d.newLeads), 1);
  const maxConverted = Math.max(...data.map(d => d.convertedLeads), 1);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Lead Trends</h3>

      {/* Legend */}
      <div className="flex gap-4 mb-6">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-500 rounded"></div>
          <span className="text-sm text-gray-600">New Leads</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500 rounded"></div>
          <span className="text-sm text-gray-600">Converted</span>
        </div>
      </div>

      {/* Simple Bar Chart */}
      <div className="space-y-4">
        {data.map((point, index) => {
          const date = new Date(point.date);
          const dateLabel = date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
          });

          const newLeadsWidth = (point.newLeads / maxNewLeads) * 100;
          const convertedWidth = (point.convertedLeads / maxConverted) * 100;

          return (
            <div key={index} className="space-y-1">
              <div className="text-xs font-medium text-gray-600">{dateLabel}</div>
              
              {/* New Leads Bar */}
              <div className="flex items-center gap-2">
                <div className="w-20 text-xs text-gray-500">New</div>
                <div className="flex-1 bg-gray-100 rounded-full h-6 relative">
                  <div
                    className="bg-blue-500 h-6 rounded-full flex items-center justify-end pr-2 transition-all duration-300"
                    style={{ width: `${newLeadsWidth}%`, minWidth: point.newLeads > 0 ? '30px' : '0' }}
                  >
                    {point.newLeads > 0 && (
                      <span className="text-xs font-medium text-white">{point.newLeads}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Converted Bar */}
              <div className="flex items-center gap-2">
                <div className="w-20 text-xs text-gray-500">Converted</div>
                <div className="flex-1 bg-gray-100 rounded-full h-6 relative">
                  <div
                    className="bg-green-500 h-6 rounded-full flex items-center justify-end pr-2 transition-all duration-300"
                    style={{ width: `${convertedWidth}%`, minWidth: point.convertedLeads > 0 ? '30px' : '0' }}
                  >
                    {point.convertedLeads > 0 && (
                      <span className="text-xs font-medium text-white">{point.convertedLeads}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Stats */}
      <div className="mt-6 pt-6 border-t border-gray-200 grid grid-cols-3 gap-4">
        <div>
          <div className="text-xs text-gray-500">Total New</div>
          <div className="text-lg font-bold text-blue-600">
            {data.reduce((sum, d) => sum + d.newLeads, 0)}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Total Converted</div>
          <div className="text-lg font-bold text-green-600">
            {data.reduce((sum, d) => sum + d.convertedLeads, 0)}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Avg. Conversion</div>
          <div className="text-lg font-bold text-purple-600">
            {(data.reduce((sum, d) => sum + d.conversionRate, 0) / data.length).toFixed(1)}%
          </div>
        </div>
      </div>
    </div>
  );
}
