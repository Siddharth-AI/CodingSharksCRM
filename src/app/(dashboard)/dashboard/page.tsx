'use client';

import React, { useState } from 'react';
import { Layout } from '@/components/layout';
import { DashboardStats, ConversionFunnel, LeadTrendsChart } from '@/components/dashboard';
import { useGetDashboardStatsQuery, useGetDashboardTrendsQuery, useGetDashboardConversionQuery } from '@/store/api';
import { Card, Button } from '@/components/ui';

export default function DashboardPage() {
  const [dateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    to: new Date().toISOString(),
  });

  const { data: statsData, isLoading: statsLoading } = useGetDashboardStatsQuery(dateRange);
  const { data: trendsData, isLoading: trendsLoading } = useGetDashboardTrendsQuery({
    period: 'daily',
    dateRange,
  });
  const { data: conversionData, isLoading: conversionLoading } = useGetDashboardConversionQuery(dateRange);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">Welcome back! Here's your overview</p>
          </div>
          <Button variant="primary">
            Export Report
          </Button>
        </div>

        {/* Stats Cards */}
        {statsData?.data && (
          <DashboardStats stats={statsData.data} isLoading={statsLoading} />
        )}

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Trends Chart */}
          {trendsData?.data && (
            <LeadTrendsChart data={trendsData.data} isLoading={trendsLoading} />
          )}

          {/* Conversion Funnel */}
          {conversionData?.data && (
            <ConversionFunnel data={conversionData.data} isLoading={conversionLoading} />
          )}
        </div>

        {/* Quick Actions */}
        <Card title="Quick Actions">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" fullWidth>
              📝 Add New Lead
            </Button>
            <Button variant="outline" fullWidth>
              💬 Send Message
            </Button>
            <Button variant="outline" fullWidth>
              📊 View Reports
            </Button>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
