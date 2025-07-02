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
import { Calendar, Clock, MapPin, User, CheckCircle, XCircle, TrendingUp, FileText, FileSpreadsheet, Users } from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase/client';
import { format } from 'date-fns';
import { usePermissions } from '@/components/providers/permission-provider';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function AttendanceReportsPage() {
  const [loading, setLoading] = useState(true);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<any[]>([]);
  const [exporting, setExporting] = useState(false);
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    session: 'all',
    instructor: 'all',
    venue: 'all',
    status: 'all'
  });
  const [statistics, setStatistics] = useState({
    totalRecords: 0,
    totalSessions: 0,
    presentCount: 0,
    absentCount: 0,
    lateCount: 0,
    attendanceRate: 0
  });
  const [sessions, setSessions] = useState<any[]>([]);
  const [instructors, setInstructors] = useState<any[]>([]);
  const [venues, setVenues] = useState<any[]>([]);
  
  const { hasPermission } = usePermissions();
  const { toast } = useToast();
  const supabase = createBrowserClient();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch enrollment sessions with attendance data
        const { data: enrollmentSessionsData, error: enrollmentError } = await supabase
          .from('enrollment_sessions')
          .select(`
            id,
            enrollment_id,
            session_id,
            enrollment_type,
            trial_date,
            partial_dates,
            attendance,
            enrollments (
              id,
              customers (
                id,
                first_name,
                surname,
                email
              )
            ),
            sessions (
              id,
              name,
              code,
              day_of_week,
              start_time,
              venues (id, name),
              instructors (id, name),
              exercise_types (id, name)
            )
          `)
          .not('attendance', 'is', null)
          .not('attendance', 'eq', '[]');

        if (enrollmentError) throw enrollmentError;

        // Process attendance records from enrollment_sessions.attendance JSON
        const processedRecords: any[] = [];
        
        enrollmentSessionsData?.forEach(enrollmentSession => {
          const attendance = enrollmentSession.attendance || [];
          
          attendance.forEach((attendanceRecord: any) => {
            // Check if this attendance record should be included based on enrollment type
            let shouldInclude = false;
            
            if (enrollmentSession.enrollment_type === 'full') {
              // Full enrollment - always included
              shouldInclude = true;
            } else if (enrollmentSession.enrollment_type === 'trial' && enrollmentSession.trial_date === attendanceRecord.date) {
              // Trial enrollment - only if trial date matches
              shouldInclude = true;
            } else if (enrollmentSession.enrollment_type === 'partial' && enrollmentSession.partial_dates) {
              // Partial enrollment - only if date is in partial_dates array
              shouldInclude = enrollmentSession.partial_dates.includes(attendanceRecord.date);
            }
            
            if (shouldInclude) {
              processedRecords.push({
                id: `${enrollmentSession.id}-${attendanceRecord.date}`,
                enrollment_session_id: enrollmentSession.id,
                class_date: attendanceRecord.date,
                status: attendanceRecord.status,
                created_at: attendanceRecord.marked_at,
                customer_name: `${enrollmentSession.enrollments.customers.first_name} ${enrollmentSession.enrollments.customers.surname}`,
                customer_email: enrollmentSession.enrollments.customers.email,
                enrollment_type: enrollmentSession.enrollment_type,
                session_id: enrollmentSession.sessions.id,
                session_name: enrollmentSession.sessions.name,
                session_code: enrollmentSession.sessions.code,
                day_of_week: enrollmentSession.sessions.day_of_week,
                start_time: enrollmentSession.sessions.start_time,
                venue: enrollmentSession.sessions.venues?.name,
                venue_id: enrollmentSession.sessions.venues?.id,
                instructor_name: enrollmentSession.sessions.instructors?.name,
                instructor_id: enrollmentSession.sessions.instructors?.id,
                exercise_type: enrollmentSession.sessions.exercise_types?.name
              });
            }
          });
        });

        // Sort by date descending
        processedRecords.sort((a, b) => new Date(b.class_date).getTime() - new Date(a.class_date).getTime());

        setAttendanceRecords(processedRecords);

        // Fetch sessions for filter
        const { data: sessionsData } = await supabase
          .from('sessions')
          .select('id, name, code')
          .order('name');

        setSessions(sessionsData || []);

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

        // Calculate statistics
        const totalRecords = processedRecords.length;
        const totalSessions = new Set(processedRecords.map(r => `${r.session_id}-${r.class_date}`)).size;
        const presentCount = processedRecords.filter(r => r.status === 'present').length;
        const absentCount = processedRecords.filter(r => r.status === 'absent').length;
        const lateCount = processedRecords.filter(r => r.status === 'late').length;
        const attendanceRate = totalRecords > 0 ? (presentCount / totalRecords) * 100 : 0;

        setStatistics({
          totalRecords,
          totalSessions,
          presentCount,
          absentCount,
          lateCount,
          attendanceRate
        });

      } catch (error: any) {
        console.error('Error fetching attendance data:', error);
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
    let filtered = attendanceRecords;

    if (filters.dateFrom) {
      filtered = filtered.filter(r => 
        new Date(r.class_date) >= new Date(filters.dateFrom)
      );
    }

    if (filters.dateTo) {
      filtered = filtered.filter(r => 
        new Date(r.class_date) <= new Date(filters.dateTo)
      );
    }

    if (filters.session !== 'all') {
      filtered = filtered.filter(r => 
        r.session_id === filters.session
      );
    }

    if (filters.instructor !== 'all') {
      filtered = filtered.filter(r => 
        r.instructor_id === filters.instructor
      );
    }

    if (filters.venue !== 'all') {
      filtered = filtered.filter(r => 
        r.venue_id === filters.venue
      );
    }

    if (filters.status !== 'all') {
      filtered = filtered.filter(r => 
        r.status === filters.status
      );
    }

    setFilteredRecords(filtered);
  }, [attendanceRecords, filters]);

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
      
      const dataToExport = filteredRecords.map(record => ({
        'Date': format(new Date(record.class_date), 'yyyy-MM-dd'),
        'Session': record.session_name || '',
        'Code': record.session_code || '',
        'Instructor': record.instructor_name || '',
        'Venue': record.venue || '',
        'Exercise Type': record.exercise_type || '',
        'Customer Name': record.customer_name || '',
        'Email': record.customer_email || '',
        'Status': record.status || '',
        'Enrollment Type': record.enrollment_type || ''
      }));

      const csvContent = [
        Object.keys(dataToExport[0] || {}),
        ...dataToExport.map(row => Object.values(row))
      ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Success',
        description: 'Attendance report exported to CSV',
      });
    } catch (error: any) {
      console.error('Error exporting to Excel:', error);
      toast({
        title: 'Error',
        description: 'Failed to export report',
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
      
      // Title
      doc.setFontSize(20);
      doc.text('Attendance Report', 14, 20);
      
      // Summary
      doc.setFontSize(12);
      doc.text(`Generated on: ${format(new Date(), 'PPP')}`, 14, 35);
      doc.text(`Total Records: ${filteredRecords.length}`, 14, 45);
      doc.text(`Date Range: ${filters.dateFrom ? format(new Date(filters.dateFrom), 'PPP') : 'All'} - ${filters.dateTo ? format(new Date(filters.dateTo), 'PPP') : 'All'}`, 14, 55);
      
      // Table
      const tableData = filteredRecords.map(record => [
        format(new Date(record.class_date), 'yyyy-MM-dd'),
        record.session_name || '',
        record.session_code || '',
        record.instructor_name || '',
        record.venue || '',
        record.exercise_type || '',
        record.customer_name || '',
        record.customer_email || '',
        record.status || '',
        record.enrollment_type || ''
      ]);
      
      (doc as any).autoTable({
        head: [['Date', 'Session', 'Code', 'Instructor', 'Venue', 'Exercise Type', 'Customer Name', 'Email', 'Status', 'Enrollment Type']],
        body: tableData,
        startY: 70,
        styles: {
          fontSize: 8,
          cellPadding: 2,
        },
        headStyles: {
          fillColor: [59, 130, 246],
          textColor: 255,
        },
      });
      
      doc.save(`attendance-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      
      toast({
        title: 'Success',
        description: 'Attendance report exported to PDF',
      });
    } catch (error: any) {
      console.error('Error exporting to PDF:', error);
      toast({
        title: 'Error',
        description: 'Failed to export report',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Attendance Reports</h1>
            <p className="text-muted-foreground">
              Comprehensive attendance reporting and analytics across all sessions
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={exportToExcel}
              disabled={exporting || filteredRecords.length === 0}
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            <Button
              variant="outline"
              onClick={exportToPDF}
              disabled={exporting || filteredRecords.length === 0}
            >
              <FileText className="mr-2 h-4 w-4" />
              Export PDF
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.totalSessions}</div>
              <p className="text-xs text-muted-foreground">Unique session dates</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Attendances</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.totalRecords}</div>
              <p className="text-xs text-muted-foreground">Individual attendance records</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Math.round(statistics.attendanceRate)}%</div>
              <p className="text-xs text-muted-foreground">Present vs total attendances</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg per Session</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statistics.totalSessions > 0 ? Math.round(statistics.totalRecords / statistics.totalSessions) : 0}
              </div>
              <p className="text-xs text-muted-foreground">Average attendances per session</p>
            </CardContent>
          </Card>
        </div>

        {/* Status Breakdown */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Present</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{statistics.presentCount}</div>
              <p className="text-xs text-muted-foreground">
                {statistics.totalRecords > 0 ? Math.round((statistics.presentCount / statistics.totalRecords) * 100) : 0}% of total
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Absent</CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{statistics.absentCount}</div>
              <p className="text-xs text-muted-foreground">
                {statistics.totalRecords > 0 ? Math.round((statistics.absentCount / statistics.totalRecords) * 100) : 0}% of total
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Late</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{statistics.lateCount}</div>
              <p className="text-xs text-muted-foreground">
                {statistics.totalRecords > 0 ? Math.round((statistics.lateCount / statistics.totalRecords) * 100) : 0}% of total
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div>
                <Label>Date From</Label>
                <Input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                />
              </div>
              <div>
                <Label>Date To</Label>
                <Input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                />
              </div>
              <div>
                <Label>Session</Label>
                <Select value={filters.session} onValueChange={(value) => setFilters(prev => ({ ...prev, session: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="All sessions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All sessions</SelectItem>
                    {sessions.map((session) => (
                      <SelectItem key={session.id} value={session.id}>
                        {session.name} ({session.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Instructor</Label>
                <Select value={filters.instructor} onValueChange={(value) => setFilters(prev => ({ ...prev, instructor: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="All instructors" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All instructors</SelectItem>
                    {instructors.map((instructor) => (
                      <SelectItem key={instructor.id} value={instructor.id}>
                        {instructor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Venue</Label>
                <Select value={filters.venue} onValueChange={(value) => setFilters(prev => ({ ...prev, venue: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="All venues" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All venues</SelectItem>
                    {venues.map((venue) => (
                      <SelectItem key={venue.id} value={venue.id}>
                        {venue.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="present">Present</SelectItem>
                    <SelectItem value="absent">Absent</SelectItem>
                    <SelectItem value="late">Late</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="detailed" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="detailed">Detailed View</TabsTrigger>
            <TabsTrigger value="summary">Summary View</TabsTrigger>
          </TabsList>

          <TabsContent value="detailed" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Attendance Records ({filteredRecords.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {filteredRecords.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2" />
                    <p>No attendance records found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Session</TableHead>
                          <TableHead>Code</TableHead>
                          <TableHead>Instructor</TableHead>
                          <TableHead>Venue</TableHead>
                          <TableHead>Exercise Type</TableHead>
                          <TableHead>Customer Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Enrollment Type</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRecords.map((record) => (
                          <TableRow key={record.id}>
                            <TableCell>
                              {format(new Date(record.class_date), 'MMM dd, yyyy')}
                            </TableCell>
                            <TableCell>{record.session_name}</TableCell>
                            <TableCell>{record.session_code}</TableCell>
                            <TableCell>{record.instructor_name}</TableCell>
                            <TableCell>{record.venue}</TableCell>
                            <TableCell>{record.exercise_type}</TableCell>
                            <TableCell>{record.customer_name}</TableCell>
                            <TableCell>{record.customer_email}</TableCell>
                            <TableCell>
                              <Badge 
                                variant={record.status === 'present' ? 'default' : record.status === 'absent' ? 'destructive' : 'secondary'}
                              >
                                {record.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {record.enrollment_type}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="summary" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Attendance Summary by Session</CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const sessionSummary = filteredRecords.reduce((acc, record) => {
                    const key = `${record.session_id}-${record.class_date}`;
                    if (!acc[key]) {
                      acc[key] = {
                        session: record.session_name,
                        code: record.session_code,
                        date: record.class_date,
                        instructor: record.instructor_name,
                        venue: record.venue,
                        exerciseType: record.exercise_type,
                        present: 0,
                        absent: 0,
                        late: 0,
                        total: 0
                      };
                    }
                    acc[key].total++;
                    acc[key][record.status]++;
                    return acc;
                  }, {} as any);

                  const summaryArray = Object.values(sessionSummary).sort((a: any, b: any) => 
                    new Date(b.date).getTime() - new Date(a.date).getTime()
                  );

                  return summaryArray.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-8 w-8 mx-auto mb-2" />
                      <p>No attendance records found</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Session</TableHead>
                            <TableHead>Code</TableHead>
                            <TableHead>Instructor</TableHead>
                            <TableHead>Venue</TableHead>
                            <TableHead>Exercise Type</TableHead>
                            <TableHead>Present</TableHead>
                            <TableHead>Absent</TableHead>
                            <TableHead>Late</TableHead>
                            <TableHead>Total</TableHead>
                            <TableHead>Rate</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {summaryArray.map((session: any, index: number) => {
                            const attendanceRate = session.total > 0 ? Math.round((session.present / session.total) * 100) : 0;
                            return (
                              <TableRow key={index}>
                                <TableCell>
                                  {format(new Date(session.date), 'MMM dd, yyyy')}
                                </TableCell>
                                <TableCell>{session.session}</TableCell>
                                <TableCell>{session.code}</TableCell>
                                <TableCell>{session.instructor}</TableCell>
                                <TableCell>{session.venue}</TableCell>
                                <TableCell>{session.exerciseType}</TableCell>
                                <TableCell>
                                  <Badge variant="default">{session.present}</Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="destructive">{session.absent}</Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="secondary">{session.late}</Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline">{session.total}</Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={attendanceRate >= 80 ? 'default' : attendanceRate >= 60 ? 'secondary' : 'destructive'}>
                                    {attendanceRate}%
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
