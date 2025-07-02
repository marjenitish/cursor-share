'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AttendanceReportsTable } from '@/components/reports/attendance-reports-table';
import { ClassRollsTable } from '@/components/reports/class-rolls-table';
import { ParticipantReportsTable } from '@/components/reports/participant-reports-table';
import { usePermissions } from '@/components/providers/permission-provider';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

export default function ReportsPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const { hasPermission } = usePermissions();

  // Check if user has permission to view reports
  const canViewReports = hasPermission('reports_view');

  if (!canViewReports) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">You don't have permission to view reports.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground">
          View and manage class attendance reports and rolls.
        </p>
      </div>

      <Tabs defaultValue="attendance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="attendance">Attendance Reports</TabsTrigger>
          <TabsTrigger value="rolls">Class Rolls</TabsTrigger>
          <TabsTrigger value="participants">Participant Reports</TabsTrigger>
          <TabsTrigger value="cancellations">Cancellation Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="attendance">
          <AttendanceReportsTable refreshKey={refreshKey} onRefresh={() => setRefreshKey(prev => prev + 1)} />
        </TabsContent>

        <TabsContent value="rolls">
          <ClassRollsTable refreshKey={refreshKey} onRefresh={() => setRefreshKey(prev => prev + 1)} />
        </TabsContent>

        <TabsContent value="participants">
          <ParticipantReportsTable refreshKey={refreshKey} onRefresh={() => setRefreshKey(prev => prev + 1)} />
        </TabsContent>

        <TabsContent value="cancellations">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Class Cancellation Reports</h3>
                <p className="text-sm text-muted-foreground">
                  Monitor and analyze class cancellation patterns with detailed reports and statistics.
                </p>
              </div>
              <Button asChild>
                <Link href="/dashboard/reports/class-cancellation-reports">
                  View Full Report
                </Link>
              </Button>
            </div>
            
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                  <span className="font-medium">Cancellation Overview</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  View detailed cancellation reports with filtering options, statistics, and export capabilities.
                </p>
              </div>
              
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-blue-500" />
                  <span className="font-medium">Filter & Search</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Filter by date range, instructor, venue, status, and search cancellation reasons.
                </p>
              </div>
              
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-green-500" />
                  <span className="font-medium">Export Options</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Export cancellation data to Excel (CSV) or PDF format for further analysis.
                </p>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}