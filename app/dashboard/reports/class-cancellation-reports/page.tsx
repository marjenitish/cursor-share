'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, MapPin, User, AlertCircle, TrendingUp, TrendingDown, FileText, FileSpreadsheet } from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase/client';
import { format } from 'date-fns';
import { usePermissions } from '@/components/providers/permission-provider';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function ClassCancellationReportsPage() {
  const [loading, setLoading] = useState(true);
  const [cancellations, setCancellations] = useState<any[]>([]);
  const [filteredCancellations, setFilteredCancellations] = useState<any[]>([]);
  const [exporting, setExporting] = useState(false);
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    instructor: 'all',
    venue: 'all',
    reason: 'all'
  });
  const [statistics, setStatistics] = useState({
    totalCancellations: 0,
    totalSessions: 0,
    cancellationRate: 0
  });
  const [instructors, setInstructors] = useState<any[]>([]);
  const [venues, setVenues] = useState<any[]>([]);
  
  const { hasPermission } = usePermissions();
  const { toast } = useToast();
  const supabase = createBrowserClient();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch sessions with cancelled_classes
        const { data: sessionsData, error: sessionsError } = await supabase
          .from('sessions')
          .select(`
            *,
            venues (
              id,
              name
            ),
            instructors (
              id,
              name
            )
          `)
          .not('cancelled_classes', 'is', null)
          .order('created_at', { ascending: false });

        if (sessionsError) throw sessionsError;

        // Process sessions to extract individual cancellations from cancelled_classes array
        const processedCancellations: any[] = [];
        let totalCancellations = 0;

        sessionsData?.forEach(session => {
          if (session.cancelled_classes && Array.isArray(session.cancelled_classes)) {
            session.cancelled_classes.forEach((cancelledClass: any) => {
              totalCancellations++;
              processedCancellations.push({
                id: `${session.id}-${cancelledClass.date}`,
                session_id: session.id,
                class_name: session.name,
                venue: session.venues?.name,
                instructor_name: session.instructors?.name,
                instructor_id: session.instructor_id,
                day_of_week: session.day_of_week,
                start_time: session.start_time,
                end_time: session.end_time,
                cancelled_date: cancelledClass.date,
                reason: cancelledClass.reason,
                cancelled_at: cancelledClass.cancelled_at,
                session_created_at: session.created_at,
                session_updated_at: session.updated_at
              });
            });
          }
        });

        setCancellations(processedCancellations);

        // Fetch instructors for filter
        const { data: instructorsData } = await supabase
          .from('instructors')
          .select('id, name')
          .order('name');

        setInstructors(instructorsData || []);

        // Fetch venues for filter
        const { data: venuesData } = await supabase
          .from('venues')
          .select('id, name')
          .order('name');

        setVenues(venuesData || []);

        // Get total sessions for cancellation rate calculation
        const { data: totalSessionsData } = await supabase
          .from('sessions')
          .select('id', { count: 'exact' });

        const totalSessions = totalSessionsData?.length || 0;
        const cancellationRate = totalSessions > 0 ? (totalCancellations / totalSessions) * 100 : 0;

        setStatistics({
          totalCancellations,
          totalSessions,
          cancellationRate
        });

      } catch (error: any) {
        console.error('Error fetching cancellation data:', error);
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    // Apply filters
    let filtered = cancellations;

    if (filters.dateFrom) {
      filtered = filtered.filter(c => 
        new Date(c.cancelled_date) >= new Date(filters.dateFrom)
      );
    }

    if (filters.dateTo) {
      filtered = filtered.filter(c => 
        new Date(c.cancelled_date) <= new Date(filters.dateTo)
      );
    }

    if (filters.instructor !== 'all') {
      filtered = filtered.filter(c => 
        c.instructor_id === filters.instructor
      );
    }

    if (filters.venue !== 'all') {
      filtered = filtered.filter(c => 
        c.venue === filters.venue
      );
    }

    if (filters.reason !== 'all') {
      filtered = filtered.filter(c => 
        c.reason?.toLowerCase().includes(filters.reason.toLowerCase())
      );
    }

    setFilteredCancellations(filtered);
  }, [cancellations, filters]);

  const canRead = hasPermission('report_read');

  if (!canRead) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">You don't have permission to view reports.</p>
        </div>
      </div>
    );
  }

  const exportToExcel = async () => {
    try {
      setExporting(true);
      
      const dataToExport = filteredCancellations.map(cancellation => ({
        'Session ID': cancellation.session_id,
        'Class Name': cancellation.class_name || '',
        'Venue': cancellation.venue || '',
        'Instructor': cancellation.instructor_name || '',
        'Cancelled Date': cancellation.cancelled_date ? format(new Date(cancellation.cancelled_date), 'dd/MM/yyyy') : '',
        'Class Time': `${cancellation.start_time || ''} - ${cancellation.end_time || ''}`,
        'Day of Week': cancellation.day_of_week || '',
        'Cancellation Reason': cancellation.reason || '',
        'Cancelled At': cancellation.cancelled_at ? format(new Date(cancellation.cancelled_at), 'dd/MM/yyyy HH:mm') : '',
        'Session Created': cancellation.session_created_at ? format(new Date(cancellation.session_created_at), 'dd/MM/yyyy HH:mm') : '',
        'Session Updated': cancellation.session_updated_at ? format(new Date(cancellation.session_updated_at), 'dd/MM/yyyy HH:mm') : '',
      }));

      const headers = Object.keys(dataToExport[0]);
      const csvContent = [
        headers.join(','),
        ...dataToExport.map(row => 
          headers.map(header => {
            const value = row[header as keyof typeof row];
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          }).join(',')
        )
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `cancellation_reports_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: 'Export Successful',
        description: `Exported ${dataToExport.length} cancellation records to Excel/CSV format`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to export cancellation data',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  const exportToPDF = async () => {
    try {
      setExporting(true);
      
      const doc = new jsPDF();
      
      doc.setFontSize(18);
      doc.text('Class Cancellation Reports', 105, 20, { align: 'center' });
      
      doc.setFontSize(12);
      doc.text(`Generated on: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 105, 30, { align: 'center' });
      doc.text(`Total Cancellations: ${filteredCancellations.length}`, 105, 40, { align: 'center' });
      
      const tableData = filteredCancellations.map(cancellation => [
        cancellation.class_name || '',
        cancellation.venue || '',
        cancellation.instructor_name || '',
        cancellation.cancelled_date ? format(new Date(cancellation.cancelled_date), 'dd/MM/yyyy') : '',
        cancellation.reason?.substring(0, 30) + (cancellation.reason?.length > 30 ? '...' : '') || ''
      ]);
      
      (doc as any).autoTable({
        head: [['Class', 'Venue', 'Instructor', 'Date', 'Reason']],
        body: tableData,
        startY: 50,
        styles: {
          fontSize: 8,
          cellPadding: 2
        },
        headStyles: {
          fillColor: [220, 53, 69],
          textColor: 255,
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245]
        }
      });
      
      doc.save(`cancellation_reports_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.pdf`);

      toast({
        title: 'Export Successful',
        description: `Exported ${filteredCancellations.length} cancellation records to PDF format`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to export cancellation data',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Class Cancellation Reports</h1>
          <p className="text-muted-foreground">
            Monitor and analyze class cancellation patterns
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportToExcel}
            disabled={exporting}
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            {exporting ? 'Exporting...' : 'Export Excel'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportToPDF}
            disabled={exporting}
          >
            <FileText className="h-4 w-4 mr-2" />
            {exporting ? 'Exporting...' : 'Export PDF'}
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cancellations</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.totalCancellations}</div>
            <p className="text-xs text-muted-foreground">
              Out of {statistics.totalSessions} total sessions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cancellation Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.cancellationRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Percentage of total sessions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.totalSessions}</div>
            <p className="text-xs text-muted-foreground">
              Total active sessions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cancelled Classes</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.totalCancellations}</div>
            <p className="text-xs text-muted-foreground">
              Individual cancelled classes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter cancellation reports by various criteria</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="dateFrom">Date From</Label>
              <Input
                id="dateFrom"
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateTo">Date To</Label>
              <Input
                id="dateTo"
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="instructor">Instructor</Label>
              <Select value={filters.instructor} onValueChange={(value) => setFilters(prev => ({ ...prev, instructor: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select instructor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Instructors</SelectItem>
                  {instructors.map((instructor) => (
                    <SelectItem key={instructor.id} value={instructor.id}>
                      {instructor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="venue">Venue</Label>
              <Select value={filters.venue} onValueChange={(value) => setFilters(prev => ({ ...prev, venue: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select venue" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Venues</SelectItem>
                  {venues.map((venue) => (
                    <SelectItem key={venue.id} value={venue.name}>
                      {venue.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Reason (Search)</Label>
              <Input
                id="reason"
                placeholder="Search cancellation reasons..."
                value={filters.reason}
                onChange={(e) => setFilters(prev => ({ ...prev, reason: e.target.value }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reports Tabs */}
      <Tabs defaultValue="detailed" className="space-y-4">
        <TabsList>
          <TabsTrigger value="detailed">Detailed Report</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="detailed">
          <Card>
            <CardHeader>
              <CardTitle>Detailed Cancellation Report</CardTitle>
              <CardDescription>
                Showing {filteredCancellations.length} cancellation records
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Session ID</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Venue</TableHead>
                      <TableHead>Instructor</TableHead>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Cancelled At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCancellations.map((cancellation) => (
                      <TableRow key={cancellation.id}>
                        <TableCell>
                          <div className="font-medium">
                            {cancellation.session_id}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{cancellation.class_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {cancellation.day_of_week}
                          </div>
                        </TableCell>
                        <TableCell>{cancellation.venue}</TableCell>
                        <TableCell>{cancellation.instructor_name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {cancellation.cancelled_date ? format(new Date(cancellation.cancelled_date), 'dd/MM/yyyy') : ''}
                          </div>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {cancellation.start_time} - {cancellation.end_time}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs truncate">
                            {cancellation.reason || 'No reason provided'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground">
                            {cancellation.cancelled_at ? format(new Date(cancellation.cancelled_at), 'dd/MM/yyyy HH:mm') : ''}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredCancellations.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <div className="text-center">
                            <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                            <p className="text-muted-foreground">No cancellation records found</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="summary">
          <Card>
            <CardHeader>
              <CardTitle>Cancellation Summary</CardTitle>
              <CardDescription>Overview of cancellation patterns</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-4">
                  <h3 className="font-semibold">Cancellation Overview</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Total Sessions</span>
                      <Badge variant="secondary">{statistics.totalSessions}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Cancellations</span>
                      <Badge variant="default">{statistics.totalCancellations}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Cancellation Rate</span>
                      <Badge variant="outline">{statistics.cancellationRate.toFixed(1)}%</Badge>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="font-semibold">Key Metrics</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Cancellation Rate</span>
                      <span className="font-medium">{statistics.cancellationRate.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Sessions</span>
                      <span className="font-medium">{statistics.totalSessions}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Cancellations</span>
                      <span className="font-medium">{statistics.totalCancellations}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 