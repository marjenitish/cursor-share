'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { createBrowserClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';
import { format, isWithinInterval } from 'date-fns';
import { SessionForm } from './components/session-form'
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';

type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';

interface Session {
  id: string;
  name: string;
  code: string;
  venue_id: string;
  address: string;
  instructor_id: string;
  fee_criteria: string;
  term: string;
  fee_amount: number;
  exercise_type_id: string | null;
  term_id: number;
  zip_code: string | null;
  day_of_week: DayOfWeek;
  start_time: string;
  end_time: string | null;
  is_subsidised: boolean;
  class_capacity: number | null;
  term_details?: {
    fiscal_year: number;
    start_date: string;
    end_date: string;
  };
  instructor?: {
    name: string;
    contact_no: string;
  };
  exercise_type?: {
    name: string;
  };
  venue?: {
    name: string;
    street_address: string;
    city: string;
  };
}

const DAYS_OF_WEEK: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function SessionsPage() {
  const supabase = createBrowserClient();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [terms, setTerms] = useState<{ fiscal_year: number; term_number: number; start_date: string; end_date: string; }[]>([]);
  const [selectedFiscalYear, setSelectedFiscalYear] = useState<number | null>(null);
  const [selectedTermNumber, setSelectedTermNumber] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);


  console.log("selectedSession", selectedSession);
  // Fetch terms and determine current term
  useEffect(() => {
    const fetchTerms = async () => {
      const { data, error } = await supabase
        .from('terms')
        .select('fiscal_year, term_number, start_date, end_date')
        .order('fiscal_year', { ascending: false })
        .order('term_number');

      if (error) {
        console.error('Error fetching terms:', error);
        return;
      }

      setTerms(data);

      // Find current term based on today's date
      const today = new Date();
      const currentTerm = data.find(term =>
        isWithinInterval(today, {
          start: new Date(term.start_date),
          end: new Date(term.end_date)
        })
      );

      if (currentTerm) {
        setSelectedFiscalYear(currentTerm.fiscal_year);
        setSelectedTermNumber(currentTerm.term_number);
      } else {
        // If no current term, select the most recent term
        setSelectedFiscalYear(data[0]?.fiscal_year);
        setSelectedTermNumber(data[0]?.term_number);
      }
    };

    fetchTerms();
  }, []);


  const fetchSessions = async () => {
    if (!selectedFiscalYear || !selectedTermNumber) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select(`
          *,
          term_details:terms(fiscal_year, start_date, end_date),
          instructor:instructors(name, contact_no),
          exercise_type:exercise_types(name),
          venue:venues(name)
        `)
        .eq('term_details.fiscal_year', selectedFiscalYear)
        .eq('term', `Term${selectedTermNumber}`)
        .order('day_of_week')
        .order('start_time');

      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch sessions when filters change
  useEffect(() => {
    fetchSessions();
  }, [selectedFiscalYear, selectedTermNumber]);

  const formatTime = (time: string) => {
    return format(new Date(`2000-01-01T${time}`), 'h:mm a');
  };

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center gap-4">
            <CardTitle>Sessions Management</CardTitle>
            <Select
              value={selectedFiscalYear?.toString()}
              onValueChange={(value) => setSelectedFiscalYear(parseInt(value))}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select Year" />
              </SelectTrigger>
              <SelectContent>
                {Array.from(new Set(terms.map(t => t.fiscal_year))).map(year => (
                  <SelectItem key={year} value={year.toString()}>
                    FY {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={selectedTermNumber?.toString()}
              onValueChange={(value) => setSelectedTermNumber(parseInt(value))}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select Term" />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4].map(num => (
                  <SelectItem key={num} value={num.toString()}>
                    Term {num}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <SessionForm type="create" onSuccess={() => fetchSessions()} />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="space-y-8">
              {DAYS_OF_WEEK.map(day => {
                const dayClasses = sessions.filter(session => session.day_of_week === day);
                return (
                  <div key={day} className="space-y-2">
                    <h3 className="font-semibold text-lg">{day}</h3>
                    {dayClasses.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Time</TableHead>
                            <TableHead>Code</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Venue</TableHead>
                            <TableHead>Instructor</TableHead>
                            <TableHead>Capacity</TableHead>
                            <TableHead>Fee</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {dayClasses.map(session => (
                            <TableRow key={session.id}>
                              <TableCell>
                                {formatTime(session.start_time)}
                                {session.end_time && ` - ${formatTime(session.end_time)}`}
                              </TableCell>
                              <TableCell className="font-medium">{session.code}</TableCell>
                              <TableCell>{session.name}</TableCell>
                              <TableCell>
                                {session.venue?.name}
                                <br />
                                <span className="text-sm text-gray-500">
                                  {session.address}
                                  {session.zip_code && `, ${session.zip_code}`}
                                </span>
                              </TableCell>
                              <TableCell>
                                {session.instructor?.name}
                              </TableCell>
                              <TableCell>{session.class_capacity || 'Unlimited'}</TableCell>
                              <TableCell>
                                ${session.fee_amount.toFixed(2)}
                                {session.is_subsidised && ' (Subsidised)'}
                              </TableCell><TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm" onClick={() => {
                                    setSelectedSession(session);
                                    setIsEditDialogOpen(true);
                                  }}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-4 bg-gray-50 rounded-md text-gray-500">
                        No classes assigned for {day}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedSession && (
        <SessionForm
          type="edit"
          defaultValues={{
            ...selectedSession,
            term_id: selectedSession.term_id,
            exercise_type_id: selectedSession.exercise_type_id || null,
          }}
          sessionId={selectedSession.id}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onSuccess={() => {
            fetchSessions();
            setSelectedSession(null);
            setIsEditDialogOpen(false);
          }}
        />
      )}
    </div>
  );
}