'use client';

import React from 'react';
import { ConversionData } from '@/types';
import { formatPercentage } from '@/models/dashboard';

interface ConversionFunnelProps {
  data: ConversionData[];
  isLoading?: boolean;
}

export default function ConversionFunnel({ data, isLoading }: ConversionFunnelProps) {
  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-6 animate-pulse"></div>
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Conversion Funnel</h3>
        <p className="text-gray-500 text-center py-8">No conversion data available</p>
      </div>
    );
  }

  const maxCount = Math.max(...data.map(d => d.count));

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Conversion Funnel</h3>
      
      <div className="space-y-4">
        {data.map((stage, index) => {
          const widthPercentage = maxCount > 0 ? (stage.count / maxCount) * 100 : 0;
          const isFirst = index === 0;
          const isLast = index === data.length - 1;
          
          return (
            <div key={stage.stage} className="relative">
              {/* Stage Bar */}
              <div
                className={`relative rounded-lg transition-all duration-300 ${
                  isLast ? 'bg-green-500' : 'bg-blue-500'
                }`}
                style={{ width: `${widthPercentage}%`, minWidth: '30%' }}
              >
                <div className="flex items-center justify-between p-4 text-white">
                  <div className="flex-1">
                    <div className="font-semibold">{stage.stage}</div>
                    <div className="text-sm opacity-90">{stage.count} leads</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg">{formatPercentage(stage.percentage)}</div>
                    {!isFirst && stage.dropoffRate > 0 && (
                      <div className="text-xs opacity-90">
                        -{formatPercentage(stage.dropoffRate)} dropoff
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Connector Arrow */}
              {!isLast && (
                <div className="flex items-center justify-center my-2">
                  <div className="text-gray-400 text-2xl">↓</div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Overall Conversion Rate:</span>
          <span className="font-bold text-green-600 text-lg">
            {data.length > 0 ? formatPercentage(data[data.length - 1].percentage) : '0%'}
          </span>
        </div>
      </div>
    </div>
  );
}
