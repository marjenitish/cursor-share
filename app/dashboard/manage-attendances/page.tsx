'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
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
import { CalendarIcon, Download, Users, Clock, MapPin, FileText, Eye, Printer, Search } from 'lucide-react';
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
  instructors: {
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

export default function ManageAttendancesPage() {
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
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInstructor, setSelectedInstructor] = useState<string>('all');
  const [selectedVenue, setSelectedVenue] = useState<string>('all');
  const [selectedExerciseType, setSelectedExerciseType] = useState<string>('all');
  
  const { toast } = useToast();
  const supabase = createBrowserClient();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Get all sessions with instructor, venue, and exercise type details
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
          instructors (
            id,
            name
          ),
          terms (
            fiscal_year,
            start_date,
            end_date
          )
        `)
        .order('name');

      if (sessionsError) throw sessionsError;
      setSessions((sessionsData as unknown as Session[]) || []);

      // Get all class rolls
      const { data: rollsData, error: rollsError } = await supabase
        .from('class_rolls')
        .select('*')
        .order('generated_at', { ascending: false });

      if (rollsError) throw rollsError;
      setClassRolls(rollsData || []);

    } catch (error: any) {
      console.error('Error fetching data:', error);
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

      // Get trial and partial enrollments for the specific date
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

      // Get full enrollments (they don't have specific dates)
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
      setEnrolledCustomers(allEnrollments as any);

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
      const { data: rollData, error: rollError } = await supabase
        .from('class_rolls')
        .insert({
          class_id: sessionId,
          generated_at: new Date().toISOString(),
          format: rollFormat,
          file_url: null
        })
        .select()
        .single();

      if (rollError) throw rollError;

      // Generate roll content
      const rollContent = await generateRollContent(sessionId, date, rollFormat);
      
      // Update with file URL (in a real app, you'd upload to storage)
      const { error: updateError } = await supabase
        .from('class_rolls')
        .update({ file_url: `generated-roll-${rollData.id}.${rollFormat}` })
        .eq('id', rollData.id);

      if (updateError) throw updateError;

      // Refresh rolls list
      fetchData();
      
      toast({
        title: 'Success',
        description: `Class roll generated successfully in ${rollFormat.toUpperCase()} format`,
      });
      
      setShowClassRollModal(false);
    } catch (error: any) {
      console.error('Error generating class roll:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate class roll',
        variant: 'destructive',
      });
    } finally {
      setGeneratingRoll(false);
    }
  };

  const generateRollContent = async (sessionId: string, date: Date, rollFormat: 'pdf' | 'csv') => {
    // This would generate the actual roll content
    // For now, we'll just return a placeholder
    return `Class Roll for ${format(date, 'PPP')}`;
  };

  const downloadClassRoll = async (classRoll: ClassRoll) => {
    try {
      // Mark as downloaded
      const { error } = await supabase
        .from('class_rolls')
        .update({ downloaded_at: new Date().toISOString() })
        .eq('id', classRoll.id);

      if (error) throw error;

      // In a real app, you'd trigger the actual download
      // For now, we'll just show a success message
      toast({
        title: 'Success',
        description: 'Class roll download started',
      });

      // Refresh rolls list
      fetchData();
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
    
    const dayMap: { [key: string]: number } = {
      'monday': 1,
      'tuesday': 2,
      'wednesday': 3,
      'thursday': 4,
      'friday': 5,
      'saturday': 6,
      'sunday': 0
    };
    
    const targetDay = dayMap[dayOfWeek];
    if (targetDay === undefined) return dates;
    
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      if (currentDate.getDay() === targetDay) {
        dates.push(new Date(currentDate));
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return dates;
  };

  const handleDateSelect = (date: Date | null) => {
    setSelectedDate(date);
    setShowDatePicker(false);
    if (date && selectedSession) {
      fetchEnrolledCustomers(selectedSession.id, date);
    }
  };

  const handleAttendanceDateSelect = (date: Date | null) => {
    setSelectedDate(date);
    setShowAttendanceDatePicker(false);
    if (date && selectedSession) {
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

  // Filter sessions based on search and filters
  const filteredSessions = sessions.filter(session => {
    const matchesSearch = session.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         session.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         session.instructors.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesInstructor = selectedInstructor === 'all' || session.instructors.id === selectedInstructor;
    const matchesVenue = selectedVenue === 'all' || session.venues.id === selectedVenue;
    const matchesExerciseType = selectedExerciseType === 'all' || session.exercise_types.id === selectedExerciseType;
    
    return matchesSearch && matchesInstructor && matchesVenue && matchesExerciseType;
  });

  // Get unique filter options
  const instructors = Array.from(new Set(sessions.map(s => s.instructors.id))).map(id => 
    sessions.find(s => s.instructors.id === id)?.instructors
  ).filter(Boolean);
  
  const venues = Array.from(new Set(sessions.map(s => s.venues.id))).map(id => 
    sessions.find(s => s.venues.id === id)?.venues
  ).filter(Boolean);
  
  const exerciseTypes = Array.from(new Set(sessions.map(s => s.exercise_types.id))).map(id => 
    sessions.find(s => s.exercise_types.id === id)?.exercise_types
  ).filter(Boolean);

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
            <h1 className="text-3xl font-bold tracking-tight">Manage Attendances</h1>
            <p className="text-muted-foreground">
              Manage attendance and class rolls for all sessions across all instructors
            </p>
          </div>
          <Badge variant="outline">
            {sessions.length} Total Sessions
          </Badge>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="sessions" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              All Sessions
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
            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle>Filters</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                  <div>
                    <Label>Search</Label>
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search sessions..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Instructor</Label>
                    <Select value={selectedInstructor} onValueChange={setSelectedInstructor}>
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
                    <Select value={selectedVenue} onValueChange={setSelectedVenue}>
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
                    <Label>Exercise Type</Label>
                    <Select value={selectedExerciseType} onValueChange={setSelectedExerciseType}>
                      <SelectTrigger>
                        <SelectValue placeholder="All types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All types</SelectItem>
                        {exerciseTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setSearchTerm('');
                        setSelectedInstructor('all');
                        setSelectedVenue('all');
                        setSelectedExerciseType('all');
                      }}
                    >
                      Clear Filters
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Sessions List */}
              <Card>
                <CardHeader>
                  <CardTitle>Sessions ({filteredSessions.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {filteredSessions.map((session) => (
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
                            <p className="text-sm text-muted-foreground mt-1">
                              Instructor: {session.instructors.name}
                            </p>
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
                      <p>No customers enrolled for this date (Count: {enrolledCustomers.length})</p>
                      <p className="text-xs">Debug: {JSON.stringify(enrolledCustomers)}</p>
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
                        <TableHead>Instructor</TableHead>
                        <TableHead>Format</TableHead>
                        <TableHead>Generated</TableHead>
                        <TableHead>Downloaded</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {classRolls.map((roll) => {
                        const session = sessions.find(s => s.id === roll.class_id);
                        return (
                          <TableRow key={roll.id}>
                            <TableCell>
                              {session?.name || 'Unknown Session'}
                            </TableCell>
                            <TableCell>
                              {session?.instructors.name || 'Unknown Instructor'}
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
                        );
                      })}
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
                            {session.name} ({session.code}) - {session.instructors.name}
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
                    {selectedSession.name} - {format(selectedDate, 'PPP')} (Instructor: {selectedSession.instructors.name})
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
  );
} 