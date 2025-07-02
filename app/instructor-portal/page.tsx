'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { Navigation } from '@/components/shared/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { CalendarIcon, Download, Users, Clock, MapPin, FileText, Eye, Printer } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Session {
  id: string;
  name: string;
  code: string;
  day_of_week: string;
  start_time: string;
  end_time: string | null;
  venues: {
    id: string;
    name: string;
  };
  exercise_types: {
    id: string;
    name: string;
  };
  terms?: {
    fiscal_year: number;
    start_date: string;
    end_date: string;
  };
}

interface EnrollmentSession {
  id: string;
  enrollment_id: string;
  session_id: string;
  booking_date: string;
  is_free_trial: boolean;
  trial_date: string | null;
  partial_dates: string[] | null;
  enrollment_type: string;
  enrollments: {
    id: string;
    enrollment_type: string;
    status: string;
    customers: {
      id: string;
      first_name: string;
      surname: string;
      email: string;
      contact_no: string;
    };
  };
}

interface ClassRoll {
  id: string;
  class_id: string;
  generated_at: string;
  downloaded_at: string | null;
  format: string;
  file_url: string | null;
}

export default function InstructorPortalPage() {
  const [user, setUser] = useState<any>(null);
  const [instructor, setInstructor] = useState<any>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [enrolledCustomers, setEnrolledCustomers] = useState<EnrollmentSession[]>([]);
  const [classRolls, setClassRolls] = useState<ClassRoll[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [activeTab, setActiveTab] = useState('sessions');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showClassRollModal, setShowClassRollModal] = useState(false);
  const [selectedClassRoll, setSelectedClassRoll] = useState<ClassRoll | null>(null);
  const [generatingRoll, setGeneratingRoll] = useState(false);
  const [rollFormat, setRollFormat] = useState<'pdf' | 'csv'>('pdf');
  
  // Attendance management state
  const [attendanceCustomers, setAttendanceCustomers] = useState<any[]>([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [showAttendanceDatePicker, setShowAttendanceDatePicker] = useState(false);
  
  const { toast } = useToast();
  const supabase = createBrowserClient();

  useEffect(() => {
    fetchInstructorData();
  }, []);

  const fetchInstructorData = async () => {
    try {
      setLoading(true);
      
      // Get authenticated user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) throw new Error('Not authenticated');
      setUser(user);

      // Get instructor profile - handle case where no instructor record exists
      const { data: instructorData, error: instructorError } = await supabase
        .from('instructors')
        .select('*')
        .eq('user_id', user.id);

      if (instructorError) throw instructorError;
      
      if (!instructorData || instructorData.length === 0) {
        toast({
          title: 'Access Denied',
          description: 'You are not registered as an instructor. Please contact an administrator.',
          variant: 'destructive',
        });
        return;
      }

      // If multiple records exist, use the first one
      const instructor = instructorData[0];
      setInstructor(instructor);

      // Get instructor's sessions
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select(`
          id,
          name,
          code,
          day_of_week,
          start_time,
          end_time,
          venues (
            id,
            name
          ),
          exercise_types (
            id,
            name
          ),
          terms (
            fiscal_year,
            start_date,
            end_date
          )
        `)
        .eq('instructor_id', instructor.id);

      if (sessionsError) throw sessionsError;
      setSessions((sessionsData as unknown as Session[]) || []);

      // Get class rolls
      const { data: rollsData, error: rollsError } = await supabase
        .from('class_rolls')
        .select('*')
        .order('generated_at', { ascending: false });

      if (rollsError) throw rollsError;
      setClassRolls(rollsData || []);

    } catch (error: any) {
      console.error('Error fetching instructor data:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchEnrolledCustomers = async (sessionId: string, date: Date) => {
    if (!sessionId || !date) return;

    try {
      setLoadingCustomers(true);
      const dateString = format(date, 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('enrollment_sessions')
        .select(`
          id,
          enrollment_id,
          session_id,
          booking_date,
          is_free_trial,
          trial_date,
          partial_dates,
          enrollment_type,
          enrollments (
            id,
            enrollment_type,
            status,
            customers (
              id,
              first_name,
              surname,
              email,
              contact_no
            )
          )
        `)
        .eq('session_id', sessionId)
        .or(`trial_date.eq.${dateString},partial_dates.cs.${JSON.stringify([dateString])}`);

      if (error) throw error;

      // Filter for full enrollments (they don't have specific dates)
      const fullEnrollments = await supabase
        .from('enrollment_sessions')
        .select(`
          id,
          enrollment_id,
          session_id,
          booking_date,
          is_free_trial,
          trial_date,
          partial_dates,
          enrollment_type,
          enrollments (
            id,
            enrollment_type,
            status,
            customers (
              id,
              first_name,
              surname,
              email,
              contact_no
            )
          )
        `)
        .eq('session_id', sessionId)
        .eq('enrollment_type', 'full')
        .is('trial_date', null)
        .is('partial_dates', null);

      if (fullEnrollments.error) throw fullEnrollments.error;

      const allEnrollments = [...(data || []), ...(fullEnrollments.data || [])];
      setEnrolledCustomers(allEnrollments as unknown as EnrollmentSession[]);

    } catch (error: any) {
      console.error('Error fetching enrolled customers:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch enrolled customers',
        variant: 'destructive',
      });
    } finally {
      setLoadingCustomers(false);
    }
  };

  const generateClassRoll = async (sessionId: string, date: Date, rollFormat: 'pdf' | 'csv') => {
    try {
      setGeneratingRoll(true);
      const dateString = format(date, 'yyyy-MM-dd');

      // Create class roll record
      const { data: classRoll, error: rollError } = await supabase
        .from('class_rolls')
        .insert({
          class_id: sessionId,
          format: rollFormat,
          generated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (rollError) throw rollError;

      // Generate the actual roll content
      const rollContent = await generateRollContent(sessionId, date, rollFormat);

      // Create download link for the generated content
      let downloadUrl = '';
      let fileName = '';
      
      if (rollFormat === 'csv') {
        const blob = new Blob([rollContent as string], { type: 'text/csv' });
        downloadUrl = URL.createObjectURL(blob);
        fileName = `class-roll-${selectedSession?.code || 'unknown'}-${format(date, 'yyyyMMdd')}.csv`;
      } else {
        // For PDF, the content is already a data URL
        downloadUrl = rollContent as string;
        fileName = `class-roll-${selectedSession?.code || 'unknown'}-${format(date, 'yyyyMMdd')}.pdf`;
      }

      // Update the class roll with file URL and trigger download
      const { error: updateError } = await supabase
        .from('class_rolls')
        .update({
          file_url: downloadUrl,
        })
        .eq('id', classRoll.id);

      if (updateError) throw updateError;

      // Trigger download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: 'Success',
        description: `Class roll generated successfully (${rollFormat.toUpperCase()})`,
      });

      // Refresh class rolls
      fetchInstructorData();

    } catch (error: any) {
      console.error('Error generating class roll:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate class roll',
        variant: 'destructive',
      });
    } finally {
      setGeneratingRoll(false);
      setShowClassRollModal(false);
    }
  };

  const generateRollContent = async (sessionId: string, date: Date, rollFormat: 'pdf' | 'csv') => {
    const dateString = format(date, 'yyyy-MM-dd');
    
    // Prepare customer data for the server action
    const customerData = enrolledCustomers.map(enrollment => ({
      id: enrollment.enrollments.customers.id,
      first_name: enrollment.enrollments.customers.first_name,
      surname: enrollment.enrollments.customers.surname,
      email: enrollment.enrollments.customers.email,
      contact_no: enrollment.enrollments.customers.contact_no,
      enrollment_type: enrollment.enrollment_type
    }));

    if (rollFormat === 'csv') {
      const { generateCSVContent } = await import('@/app/actions/pdf');
      const result = await generateCSVContent(sessionId, dateString, customerData);
      
      if (result.success) {
        return result.csvContent;
      } else {
        throw new Error(result.error || 'Failed to generate CSV');
      }
    } else {
      const { generateClassRollPDF } = await import('@/app/actions/pdf');
      const result = await generateClassRollPDF(sessionId, dateString, customerData);
      
      if (result.success) {
        return result.pdfData;
      } else {
        throw new Error(result.error || 'Failed to generate PDF');
      }
    }
  };

  const downloadClassRoll = async (classRoll: ClassRoll) => {
    try {
      // In a real app, you'd download the actual file
      // For now, we'll just mark it as downloaded
      const { error } = await supabase
        .from('class_rolls')
        .update({
          downloaded_at: new Date().toISOString(),
        })
        .eq('id', classRoll.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Class roll download started',
      });

    } catch (error: any) {
      console.error('Error downloading class roll:', error);
      toast({
        title: 'Error',
        description: 'Failed to download class roll',
        variant: 'destructive',
      });
    }
  };

  const handleSessionSelect = (session: Session) => {
    setSelectedSession(session);
    setSelectedDate(null);
    setEnrolledCustomers([]);
  };

  const getApplicableDates = (session: Session): Date[] => {
    if (!session.terms) return [];
    
    const dates: Date[] = [];
    const startDate = new Date(session.terms.start_date);
    const endDate = new Date(session.terms.end_date);
    const dayOfWeek = session.day_of_week.toLowerCase();
    
    // Map day names to day numbers (0 = Sunday, 1 = Monday, etc.)
    const dayMap: { [key: string]: number } = {
      'sunday': 0,
      'monday': 1,
      'tuesday': 2,
      'wednesday': 3,
      'thursday': 4,
      'friday': 5,
      'saturday': 6
    };
    
    const targetDay = dayMap[dayOfWeek];
    if (targetDay === undefined) return [];
    
    const currentDate = new Date(startDate);
    
    // Find the first occurrence of the target day
    while (currentDate.getDay() !== targetDay) {
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Generate all applicable dates within the term
    while (currentDate <= endDate) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 7); // Move to next week
    }
    
    return dates;
  };

  const handleDateSelect = (date: Date | null) => {
    setSelectedDate(date);
    if (selectedSession && date) {
      fetchEnrolledCustomers(selectedSession.id, date);
    }
  };

  const handleAttendanceDateSelect = (date: Date | null) => {
    setSelectedDate(date);
    setShowAttendanceDatePicker(false);
    if (selectedSession && date) {
      fetchAttendanceCustomers(selectedSession.id, date);
    }
  };

  const fetchAttendanceCustomers = async (sessionId: string, date: Date) => {
    try {
      setLoadingAttendance(true);
      const dateString = format(date, 'yyyy-MM-dd');
      
      const { getCustomersForAttendance } = await import('@/app/actions/attendance');
      const result = await getCustomersForAttendance(sessionId, dateString);
      
      if (result.success && result.data) {
        setAttendanceCustomers(result.data);
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to fetch attendance customers',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Error fetching attendance customers:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch attendance customers',
        variant: 'destructive',
      });
    } finally {
      setLoadingAttendance(false);
    }
  };

  const handleAttendanceChange = async (enrollmentSessionId: string, status: 'present' | 'absent' | 'late') => {
    try {
      if (!selectedDate) return;
      
      const dateString = format(selectedDate, 'yyyy-MM-dd');
      const { markAttendance } = await import('@/app/actions/attendance');
      const result = await markAttendance(enrollmentSessionId, dateString, status);
      
      if (result.success) {
        // Update local state
        setAttendanceCustomers(prev => 
          prev.map(customer => 
            customer.id === enrollmentSessionId 
              ? { ...customer, attendance_status: status }
              : customer
          )
        );
        
        toast({
          title: 'Success',
          description: 'Attendance marked successfully',
        });
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to mark attendance',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Error marking attendance:', error);
      toast({
        title: 'Error',
        description: 'Failed to mark attendance',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!instructor) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
            <p className="text-muted-foreground">You are not registered as an instructor.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Instructor Portal</h1>
              <p className="text-muted-foreground">
                Welcome back, {instructor.name}
              </p>
            </div>
            <Badge variant="outline">
              {sessions.length} Active Sessions
            </Badge>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="sessions" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                My Sessions
              </TabsTrigger>
              <TabsTrigger value="class-rolls" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Class Rolls
              </TabsTrigger>
              <TabsTrigger value="attendance" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Attendance
              </TabsTrigger>
            </TabsList>

            <TabsContent value="sessions" className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Sessions List */}
                <Card>
                  <CardHeader>
                    <CardTitle>My Sessions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {sessions.map((session) => (
                        <div
                          key={session.id}
                          className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                            selectedSession?.id === session.id
                              ? 'border-primary bg-primary/5'
                              : 'hover:bg-muted/50'
                          }`}
                          onClick={() => handleSessionSelect(session)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-semibold">{session.name}</h3>
                              <p className="text-sm text-muted-foreground">
                                {session.code} • {session.day_of_week}s
                              </p>
                              <div className="flex items-center gap-4 mt-2 text-sm">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {session.start_time}
                                  {session.end_time && ` - ${session.end_time}`}
                                </span>
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {session.venues.name}
                                </span>
                              </div>
                            </div>
                            <Badge variant="secondary">
                              {session.exercise_types.name}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Enrolled Customers */}
                <Card>
                  <CardHeader>
                    <CardTitle>Enrolled Customers</CardTitle>
                    {selectedSession && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {selectedSession.name}
                        </span>
                        <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm">
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {selectedDate ? format(selectedDate, 'PPP') : 'Select Date'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={selectedDate}
                              onSelect={handleDateSelect}
                              disabled={(date) => {
                                if (!selectedSession) return true;
                                const applicableDates = getApplicableDates(selectedSession);
                                return !applicableDates.some(applicableDate => 
                                  applicableDate.toDateString() === date.toDateString()
                                );
                              }}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent>
                    {!selectedSession ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Users className="h-8 w-8 mx-auto mb-2" />
                        <p>Select a session to view enrolled customers</p>
                      </div>
                    ) : !selectedDate ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <CalendarIcon className="h-8 w-8 mx-auto mb-2" />
                        <p>Select a date to view enrolled customers</p>
                      </div>
                    ) : loadingCustomers ? (
                      <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                      </div>
                    ) : enrolledCustomers.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Users className="h-8 w-8 mx-auto mb-2" />
                        <p>No customers enrolled for this date</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            {enrolledCustomers.length} customer(s) enrolled
                          </span>
                          <Dialog open={showClassRollModal} onOpenChange={setShowClassRollModal}>
                            <DialogTrigger asChild>
                              <Button size="sm">
                                <Download className="mr-2 h-4 w-4" />
                                Generate Class Roll
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Generate Class Roll</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label>Format</Label>
                                  <Select value={rollFormat} onValueChange={(value: 'pdf' | 'csv') => setRollFormat(value)}>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="pdf">PDF</SelectItem>
                                      <SelectItem value="csv">CSV</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="flex justify-end gap-2">
                                  <Button variant="outline" onClick={() => setShowClassRollModal(false)}>
                                    Cancel
                                  </Button>
                                  <Button 
                                    onClick={() => generateClassRoll(selectedSession.id, selectedDate, rollFormat)}
                                    disabled={generatingRoll}
                                  >
                                    {generatingRoll ? 'Generating...' : 'Generate'}
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead>Contact</TableHead>
                              <TableHead>Type</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {enrolledCustomers.map((enrollment) => (
                              <TableRow key={enrollment.id}>
                                <TableCell>
                                  {enrollment.enrollments.customers.first_name} {enrollment.enrollments.customers.surname}
                                </TableCell>
                                <TableCell>{enrollment.enrollments.customers.email}</TableCell>
                                <TableCell>{enrollment.enrollments.customers.contact_no}</TableCell>
                                <TableCell>
                                  <Badge variant="outline">
                                    {enrollment.enrollment_type}
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
              </div>
            </TabsContent>

            <TabsContent value="class-rolls" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Generated Class Rolls</CardTitle>
                </CardHeader>
                <CardContent>
                  {classRolls.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-8 w-8 mx-auto mb-2" />
                      <p>No class rolls generated yet</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Session</TableHead>
                          <TableHead>Format</TableHead>
                          <TableHead>Generated</TableHead>
                          <TableHead>Downloaded</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {classRolls.map((roll) => (
                          <TableRow key={roll.id}>
                            <TableCell>
                              {sessions.find(s => s.id === roll.class_id)?.name || 'Unknown Session'}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {roll.format.toUpperCase()}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {format(new Date(roll.generated_at), 'MMM dd, yyyy HH:mm')}
                            </TableCell>
                            <TableCell>
                              {roll.downloaded_at 
                                ? format(new Date(roll.downloaded_at), 'MMM dd, yyyy HH:mm')
                                : 'Not downloaded'
                              }
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => downloadClassRoll(roll)}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="attendance" className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Session and Date Selection */}
                <Card>
                  <CardHeader>
                    <CardTitle>Select Session & Date</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Session</Label>
                      <Select 
                        value={selectedSession?.id || ''} 
                        onValueChange={(value) => {
                          const session = sessions.find(s => s.id === value);
                          if (session) {
                            setSelectedSession(session);
                            setSelectedDate(null);
                            setAttendanceCustomers([]);
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a session" />
                        </SelectTrigger>
                        <SelectContent>
                          {sessions.map((session) => (
                            <SelectItem key={session.id} value={session.id}>
                              {session.name} ({session.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {selectedSession && (
                      <div>
                        <Label>Date</Label>
                        <Popover open={showAttendanceDatePicker} onOpenChange={setShowAttendanceDatePicker}>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start text-left font-normal">
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {selectedDate ? format(selectedDate, 'PPP') : 'Select Date'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={selectedDate}
                              onSelect={handleAttendanceDateSelect}
                              disabled={(date) => {
                                if (!selectedSession) return true;
                                const applicableDates = getApplicableDates(selectedSession);
                                return !applicableDates.some(applicableDate => 
                                  applicableDate.toDateString() === date.toDateString()
                                );
                              }}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Attendance Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle>Attendance Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!selectedSession || !selectedDate ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Clock className="h-8 w-8 mx-auto mb-2" />
                        <p>Select session and date to view attendance</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div className="p-3 bg-green-50 rounded-lg">
                            <div className="text-2xl font-bold text-green-600">
                              {attendanceCustomers.filter(c => c.attendance_status === 'present').length}
                            </div>
                            <div className="text-sm text-green-600">Present</div>
                          </div>
                          <div className="p-3 bg-red-50 rounded-lg">
                            <div className="text-2xl font-bold text-red-600">
                              {attendanceCustomers.filter(c => c.attendance_status === 'absent').length}
                            </div>
                            <div className="text-sm text-red-600">Absent</div>
                          </div>
                          <div className="p-3 bg-yellow-50 rounded-lg">
                            <div className="text-2xl font-bold text-yellow-600">
                              {attendanceCustomers.filter(c => c.attendance_status === 'late').length}
                            </div>
                            <div className="text-sm text-yellow-600">Late</div>
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold">
                            Total: {attendanceCustomers.length}
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Attendance List */}
              {selectedSession && selectedDate && (
                <Card>
                  <CardHeader>
                    <CardTitle>Mark Attendance</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {selectedSession.name} - {format(selectedDate, 'PPP')}
                    </p>
                  </CardHeader>
                  <CardContent>
                    {loadingAttendance ? (
                      <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                      </div>
                    ) : attendanceCustomers.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Users className="h-8 w-8 mx-auto mb-2" />
                        <p>No customers enrolled for this date</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Attendance</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {attendanceCustomers.map((customer) => (
                              <TableRow key={customer.id}>
                                <TableCell>{customer.customer_name}</TableCell>
                                <TableCell>{customer.email}</TableCell>
                                <TableCell>
                                  <Badge variant="outline">
                                    {customer.enrollment_type}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Select
                                    value={customer.attendance_status || ''}
                                    onValueChange={(value: 'present' | 'absent' | 'late') => 
                                      handleAttendanceChange(customer.id, value)
                                    }
                                  >
                                    <SelectTrigger className="w-32">
                                      <SelectValue placeholder="Mark" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="present">
                                        <div className="flex items-center gap-2">
                                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                          Present
                                        </div>
                                      </SelectItem>
                                      <SelectItem value="absent">
                                        <div className="flex items-center gap-2">
                                          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                                          Absent
                                        </div>
                                      </SelectItem>
                                      <SelectItem value="late">
                                        <div className="flex items-center gap-2">
                                          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                                          Late
                                        </div>
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}