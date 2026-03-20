'use client';

import React from 'react';
import { DashboardStats as DashboardStatsType } from '@/types';
import { formatNumber, formatPercentage } from '@/models/dashboard';

interface DashboardStatsProps {
  stats: DashboardStatsType;
  isLoading?: boolean;
}

export default function DashboardStats({ stats, isLoading }: DashboardStatsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-lg p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  const statCards = [
    {
      label: 'Total Leads',
      value: formatNumber(stats.totalLeads),
      icon: '👥',
      color: 'blue',
    },
    {
      label: 'New Leads',
      value: formatNumber(stats.newLeads),
      icon: '✨',
      color: 'green',
    },
    {
      label: 'Converted',
      value: formatNumber(stats.convertedLeads),
      icon: '🎯',
      color: 'purple',
    },
    {
      label: 'Conversion Rate',
      value: formatPercentage(stats.conversionRate),
      icon: '📈',
      color: 'indigo',
    },
    {
      label: 'Messages Sent',
      value: formatNumber(stats.totalMessages),
      icon: '📤',
      color: 'blue',
    },
    {
      label: 'Messages Delivered',
      value: formatNumber(stats.deliveredMessages),
      icon: '✅',
      color: 'green',
    },
    {
      label: 'Delivery Rate',
      value: formatPercentage(stats.messageDeliveryRate),
      icon: '📊',
      color: 'teal',
    },
    {
      label: 'Avg. Time to Convert',
      value: `${stats.averageTimeToConversion} days`,
      icon: '⏱️',
      color: 'orange',
    },
  ];

  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    teal: 'bg-teal-50 text-teal-600',
    orange: 'bg-orange-50 text-orange-600',
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((card, index) => (
        <div
          key={index}
          className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">{card.label}</span>
            <span className={`text-2xl ${colorClasses[card.color] || colorClasses.blue} p-2 rounded-lg`}>
              {card.icon}
            </span>
          </div>
          <div className="text-3xl font-bold text-gray-900">{card.value}</div>
        </div>
      ))}
    </div>
  );
}
