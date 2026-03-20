'use client';

import React from 'react';
import { Layout } from '@/components/layout';
import { ActivityTimeline } from '@/components/activity';
import { Card } from '@/components/ui';

export default function ActivitiesPage() {
  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Activities</h1>
          <p className="text-gray-600 mt-1">Track all activities and interactions</p>
        </div>

        {/* Activity Timeline */}
        <Card>
          <ActivityTimeline limit={50} showFilters={true} />
        </Card>
      </div>
    </Layout>
  );
}
