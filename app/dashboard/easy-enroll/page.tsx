'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { createBrowserClient } from '@/lib/supabase/client';
import { Loader2, X, Info } from 'lucide-react';
import { format, isWithinInterval } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { EnrollmentInfo } from '@/app/easy-enroll/components/enrollment-info';
import { EnrollmentWizard } from './components/enrollment-wizard';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format as dateFormat } from "date-fns";
import { format as timeFormat } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';

export interface Session {
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
    terms?: {
        fiscal_year: string;
        term_number: string;
        start_date: string;
        end_date: string;
    };
}

interface ExerciseType {
    id: string;
    name: string;
    description: string | null;
}

interface Customer {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    phone: string;
}

const DAYS_OF_WEEK: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const STORAGE_KEYS = {
    SELECTED_EXERCISE_TYPE: 'dashboard_easy_enroll_selected_exercise_type',
    SELECTED_SESSIONS: 'dashboard_easy_enroll_selected_sessions',
    SELECTED_CUSTOMER: 'dashboard_easy_enroll_selected_customer',
};

type SelectedSession = {
    id: string;
    trialDate?: string;
    partialDates?: string[];
};

type EnrollmentSessionData = {
    session_id: string;
    enrollment_type: 'full' | 'trial' | 'partial';
    trial_date?: string;
    partial_dates?: string[];
    fee_amount: number;
    session_details: {
        name: string;
        code: string;
        day_of_week: string;
        start_time: string;
        end_time?: string;
        venue_id: string;
        instructor_id: string;
        exercise_type_id: string;
        term_id: string;
    };
};

export default function DashboardEasyEnrollPage() {
    const supabase = createBrowserClient();
    const [sessions, setSessions] = useState<Session[]>([]);
    const [allSessions, setAllSessions] = useState<Session[]>([]);
    const [selectedSessions, setSelectedSessions] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(true);
    const [currentTerm, setCurrentTerm] = useState<{ fiscal_year: number; term_number: number } | null>(null);
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [exerciseTypes, setExerciseTypes] = useState<ExerciseType[]>([]);
    const [selectedExerciseType, setSelectedExerciseType] = useState<string | null>(null);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
    const [trialDates, setTrialDates] = useState<Record<string, Date | undefined>>({});
    const [partialDates, setPartialDates] = useState<Record<string, Date[]>>({});
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'cheque'>('cash');

    // Load saved state from localStorage on initial load
    useEffect(() => {
        const savedExerciseType = localStorage.getItem(STORAGE_KEYS.SELECTED_EXERCISE_TYPE);
        const savedSessions = localStorage.getItem(STORAGE_KEYS.SELECTED_SESSIONS);
        const savedCustomer = localStorage.getItem(STORAGE_KEYS.SELECTED_CUSTOMER);

        if (savedExerciseType) {
            setSelectedExerciseType(savedExerciseType);
        }

        if (savedCustomer) {
            setSelectedCustomer(savedCustomer);
        }

        if (savedSessions) {
            try {
                const parsedSessions: SelectedSession[] = JSON.parse(savedSessions);
                setSelectedSessions(new Set(parsedSessions.map(s => s.id)));
                
                const trialDatesMap: Record<string, Date> = {};
                const partialDatesMap: Record<string, Date[]> = {};
                
                parsedSessions.forEach(session => {
                    if (session.trialDate) {
                        trialDatesMap[session.id] = new Date(session.trialDate);
                    }
                    if (session.partialDates) {
                        partialDatesMap[session.id] = session.partialDates.map(date => new Date(date));
                    }
                });
                
                setTrialDates(trialDatesMap);
                setPartialDates(partialDatesMap);
            } catch (error) {
                console.error('Error parsing saved sessions:', error);
            }
        }
    }, []);

    // Save selected states to localStorage
    useEffect(() => {
        if (selectedExerciseType) {
            localStorage.setItem(STORAGE_KEYS.SELECTED_EXERCISE_TYPE, selectedExerciseType);
        }
        if (selectedCustomer) {
            localStorage.setItem(STORAGE_KEYS.SELECTED_CUSTOMER, selectedCustomer);
        }
        if (selectedSessions.size > 0) {
            const sessionsToSave: SelectedSession[] = Array.from(selectedSessions).map(id => ({
                id,
                trialDate: trialDates[id]?.toISOString(),
                partialDates: partialDates[id]?.map(date => date.toISOString())
            }));
            localStorage.setItem(STORAGE_KEYS.SELECTED_SESSIONS, JSON.stringify(sessionsToSave));
        }
    }, [selectedExerciseType, selectedCustomer, selectedSessions, trialDates, partialDates]);

    // Fetch customers
    useEffect(() => {
        const fetchCustomers = async () => {
            const { data, error } = await supabase
                .from('customers')
                .select('*')
                .order('first_name');

            if (error) {
                console.error('Error fetching customers:', error);
                return;
            }

            setCustomers(data || []);
        };

        fetchCustomers();
    }, []);

    // Fetch exercise types
    useEffect(() => {
        const fetchExerciseTypes = async () => {
            const { data, error } = await supabase
                .from('exercise_types')
                .select('*')
                .order('name');

            if (error) {
                console.error('Error fetching exercise types:', error);
                return;
            }

            setExerciseTypes(data || []);
        };

        fetchExerciseTypes();
    }, []);

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

            const today = new Date();
            const currentTerm = data.find(term =>
                isWithinInterval(today, {
                    start: new Date(term.start_date),
                    end: new Date(term.end_date)
                })
            );

            if (currentTerm) {
                setCurrentTerm({
                    fiscal_year: currentTerm.fiscal_year,
                    term_number: currentTerm.term_number
                });
            }
        };

        fetchTerms();
    }, []);

    const fetchSessions = async () => {
        if (!currentTerm) return;

        setIsLoading(true);
        try {
            let query = supabase
                .from('sessions')
                .select(`
                    *,
                    term_details:terms(fiscal_year, start_date, end_date),
                    instructor:instructors(name, contact_no),
                    exercise_type:exercise_types(name),
                    venue:venues(name),
                    terms:terms(fiscal_year, term_number, start_date, end_date)
                `)
                .eq('term_details.fiscal_year', currentTerm.fiscal_year)
                .eq('term', `Term${currentTerm.term_number}`)
                .order('day_of_week')
                .order('start_time');
            
            
            const { data: allSessionsData, error: allSessionsError } = await query;
            if (allSessionsError) throw allSessionsError;
            setAllSessions(allSessionsData || []);

            // Add exercise type filter if selected
            if (selectedExerciseType) {
                query = query.eq('exercise_type_id', selectedExerciseType);
            }

            const { data, error } = await query;

            if (error) throw error;
            setSessions(data || []);
        } catch (error) {
            console.error('Error fetching sessions:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (currentTerm) {
            fetchSessions();
        }
    }, [currentTerm]);

    const formatTime = (time: string) => {
        return timeFormat(new Date(`2000-01-01T${time}`), 'h:mm a');
    };

    const handleExerciseTypeChange = (typeId: string | null) => {    
        setSelectedExerciseType(typeId);
        if (typeId) {
            setSessions(allSessions.filter(session => session.exercise_type_id === typeId));
        } else {
            setSessions(allSessions);
        }
    };

    const toggleSession = (sessionId: string) => {
        const newSelectedSessions = new Set(selectedSessions);
        if (newSelectedSessions.has(sessionId)) {
            newSelectedSessions.delete(sessionId);
            const { [sessionId]: removedTrialDate, ...remainingTrialDates } = trialDates;
            const { [sessionId]: removedPartialDates, ...remainingPartialDates } = partialDates;
            setTrialDates(remainingTrialDates);
            setPartialDates(remainingPartialDates);
        } else {
            newSelectedSessions.add(sessionId);
        }
        setSelectedSessions(newSelectedSessions);
    };

    const handleTrialDateSelect = (sessionId: string, date: Date | undefined) => {
        if (date) {
            setTrialDates(prev => ({
                ...prev,
                [sessionId]: date
            }));
        }
    };

    const handlePartialDateSelect = (sessionId: string, dates: Date[] | undefined) => {
        if (dates) {
            setPartialDates(prev => ({
                ...prev,
                [sessionId]: dates
            }));
        }
    };

    const isDateInTermRange = (date: Date | undefined, session: Session) => {
        if (!date || !session.terms) return false;
        const startDate = new Date(session.terms.start_date);
        const endDate = new Date(session.terms.end_date);
        return isWithinInterval(date, {
            start: startDate,
            end: endDate
        });
    };

    const isDateValidForSession = (date: Date, session: Session) => {
        // Check if date is today or in the future
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (date < today) return false;

        // Check if date is within term range
        if (!isDateInTermRange(date, session)) return false;

        // Check if date matches session's day of week
        const dayIndex = DAYS_OF_WEEK.indexOf(session.day_of_week);
        const dateDayIndex = date.getDay() - 1; // Convert Sunday-based to Monday-based
        return dayIndex === dateDayIndex;
    };

    const calculateSessionFee = (session: Session, sessionId: string) => {
        if (trialDates[sessionId]) {
            return 0; // Trial sessions are free
        }

        if (partialDates[sessionId]?.length) {
            const fee = (session.fee_amount / getTotalWeeksInTerm(session)) * partialDates[sessionId].length;
            return Number(fee.toFixed(2)); // Round to 2 decimal places
        }

        return Number(session.fee_amount.toFixed(2)); // Round to 2 decimal places
    };

    const calculateTotalFee = () => {
        const total = Array.from(selectedSessions).reduce((total, sessionId) => {
            const session = allSessions.find(s => s.id === sessionId);
            if (!session) return total;
            return total + calculateSessionFee(session, sessionId);
        }, 0);
        return Number(total.toFixed(2)); // Round to 2 decimal places
    };

    const getTotalWeeksInTerm = (session: Session) => {
        if (!session.terms) return 0;
        const start = new Date(session.terms.start_date);
        const end = new Date(session.terms.end_date);
        const weeks = Math.ceil((end.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000));
        return weeks;
    };

    const removeSession = (sessionId: string) => {
        const newSelectedSessions = new Set(selectedSessions);
        newSelectedSessions.delete(sessionId);
        setSelectedSessions(newSelectedSessions);

        const { [sessionId]: removedTrialDate, ...remainingTrialDates } = trialDates;
        const { [sessionId]: removedPartialDates, ...remainingPartialDates } = partialDates;
        setTrialDates(remainingTrialDates);
        setPartialDates(remainingPartialDates);
    };

    const clearCart = () => {
        setSelectedSessions(new Set());
        setTrialDates({});
        setPartialDates({});
        localStorage.removeItem(STORAGE_KEYS.SELECTED_SESSIONS);
    };

    const handleProceed = () => {
        if (!selectedCustomer) {
            alert('Please select a customer first');
            return;
        }
        setIsWizardOpen(true);
    };

    const getSelectedExerciseTypes = () => {
        const types = new Set<string>();
        Array.from(selectedSessions).forEach(sessionId => {
            const session = allSessions.find(s => s.id === sessionId);
            if (session?.exercise_type_id) {
                types.add(session.exercise_type_id);
            }
        });
        return Array.from(types);
    };

    const getNextAvailableDate = (session: Session): Date => {
        const today = new Date();
        const dayIndex = DAYS_OF_WEEK.indexOf(session.day_of_week);
        const currentDayIndex = today.getDay() - 1; // Convert Sunday-based to Monday-based
        const daysUntilNext = (dayIndex - currentDayIndex + 7) % 7;
        
        const nextDate = new Date(today);
        nextDate.setDate(today.getDate() + daysUntilNext);
        
        // If the calculated date is today and the session has already started, move to next week
        if (daysUntilNext === 0) {
            const sessionStartTime = new Date(`2000-01-01T${session.start_time}`);
            const currentTime = new Date();
            currentTime.setHours(currentTime.getHours(), currentTime.getMinutes(), 0, 0);
            
            if (currentTime > sessionStartTime) {
                nextDate.setDate(nextDate.getDate() + 7);
            }
        }

        // Ensure the date is within term range
        if (!isDateInTermRange(nextDate, session)) {
            // If not in term range, find the first valid date in the term
            const startDate = new Date(session.terms!.start_date);
            const dayDiff = (dayIndex - startDate.getDay() + 1 + 7) % 7;
            nextDate.setDate(startDate.getDate() + dayDiff);
        }
        
        return nextDate;
    };

    const getEnrollmentSessionsData = () => {
        return Array.from(selectedSessions).map(sessionId => {
            const session = allSessions.find(s => s.id === sessionId);
            if (!session) return null;

            const enrollmentType = trialDates[sessionId] ? 'trial' :
                partialDates[sessionId]?.length ? 'partial' : 'full';

            return {
                session_id: session.id,
                enrollment_type: enrollmentType,
                trial_date: trialDates[sessionId]?.toISOString(),
                partial_dates: partialDates[sessionId]?.map(date => date.toISOString()),
                fee_amount: calculateSessionFee(session, sessionId),
                session_details: {
                    name: session.name,
                    code: session.code,
                    day_of_week: session.day_of_week,
                    start_time: session.start_time,
                    end_time: session.end_time || undefined,
                    venue_id: session.venue_id,
                    instructor_id: session.instructor_id,
                    exercise_type_id: session.exercise_type_id || '',
                    term_id: session.term_id.toString()
                }
            };
        }).filter(Boolean) as EnrollmentSessionData[];
    };

    console.log(allSessions);

    return (
        <div className="container mx-auto py-8">
            <Card className="mb-8">
                <CardHeader>
                    <CardTitle>Easy Enrollment</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                        {/* Main Content */}
                        <div className="lg:col-span-3 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label>Select Customer</Label>
                                    <Select
                                        value={selectedCustomer || ''}
                                        onValueChange={setSelectedCustomer}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a customer" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {customers.map((customer) => (
                                                <SelectItem key={customer.id} value={customer.id}>
                                                    {customer.first_name} {customer.last_name} ({customer.email})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>Exercise Type</Label>
                                    <Select
                                        value={selectedExerciseType || ''}
                                        onValueChange={handleExerciseTypeChange}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="All exercise types" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">All exercise types</SelectItem>
                                            {exerciseTypes.map((type) => (
                                                <SelectItem key={type.id} value={type.id}>
                                                    {type.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {isLoading ? (
                                <div className="flex justify-center items-center h-64">
                                    <Loader2 className="h-8 w-8 animate-spin" />
                                </div>
                            ) : (
                                <ScrollArea className="h-[600px]">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Select</TableHead>
                                                <TableHead>Session</TableHead>
                                                <TableHead>Day & Time</TableHead>
                                                <TableHead>Venue</TableHead>
                                                <TableHead>Instructor</TableHead>
                                                <TableHead>Fee</TableHead>
                                                <TableHead>Enrollment Type</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {sessions.map((session) => (
                                                <TableRow key={session.id}>
                                                    <TableCell>
                                                        <Checkbox
                                                            checked={selectedSessions.has(session.id)}
                                                            onCheckedChange={() => toggleSession(session.id)}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <div>
                                                            <div className="font-medium">{session.name}</div>
                                                            <div className="text-sm text-gray-500">{session.code}</div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div>
                                                            <div>{session.day_of_week}</div>
                                                            <div className="text-sm text-gray-500">
                                                                {formatTime(session.start_time)}
                                                                {session.end_time && ` - ${formatTime(session.end_time)}`}
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div>
                                                            <div>{session.venue?.name}</div>
                                                            <div className="text-sm text-gray-500">
                                                                {session.venue?.street_address}
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div>
                                                            <div>{session.instructor?.name}</div>
                                                            <div className="text-sm text-gray-500">
                                                                {session.instructor?.contact_no}
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        ${Number(session.fee_amount.toFixed(2))}
                                                    </TableCell>
                                                    <TableCell>
                                                        {selectedSessions.has(session.id) && (
                                                            <div className="space-y-2">
                                                                <RadioGroup
                                                                    value={trialDates[session.id] ? 'trial' :
                                                                        partialDates[session.id]?.length ? 'partial' : 'full'}
                                                                    onValueChange={(value) => {
                                                                        if (value === 'trial') {
                                                                            handleTrialDateSelect(session.id, getNextAvailableDate(session));
                                                                            setPartialDates(prev => {
                                                                                const { [session.id]: _, ...rest } = prev;
                                                                                return rest;
                                                                            });
                                                                        } else if (value === 'partial') {
                                                                            handlePartialDateSelect(session.id, [getNextAvailableDate(session)]);
                                                                            setTrialDates(prev => {
                                                                                const { [session.id]: _, ...rest } = prev;
                                                                                return rest;
                                                                            });
                                                                        } else {
                                                                            setTrialDates(prev => {
                                                                                const { [session.id]: _, ...rest } = prev;
                                                                                return rest;
                                                                            });
                                                                            setPartialDates(prev => {
                                                                                const { [session.id]: _, ...rest } = prev;
                                                                                return rest;
                                                                            });
                                                                        }
                                                                    }}
                                                                >
                                                                    <div className="flex items-center space-x-2">
                                                                        <RadioGroupItem value="full" id={`full-${session.id}`} />
                                                                        <Label htmlFor={`full-${session.id}`}>Full Term</Label>
                                                                    </div>
                                                                    <div className="flex items-center space-x-2">
                                                                        <RadioGroupItem value="trial" id={`trial-${session.id}`} />
                                                                        <Label htmlFor={`trial-${session.id}`}>Trial</Label>
                                                                    </div>
                                                                    <div className="flex items-center space-x-2">
                                                                        <RadioGroupItem value="partial" id={`partial-${session.id}`} />
                                                                        <Label htmlFor={`partial-${session.id}`}>Partial</Label>
                                                                    </div>
                                                                </RadioGroup>

                                                                {trialDates[session.id] && (
                                                                    <Popover>
                                                                        <PopoverTrigger asChild>
                                                                            <Button
                                                                                variant="outline"
                                                                                className={cn(
                                                                                    "w-full justify-start text-left font-normal",
                                                                                    !trialDates[session.id] && "text-muted-foreground"
                                                                                )}
                                                                            >
                                                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                                                {trialDates[session.id] ? (
                                                                                    dateFormat(trialDates[session.id], "PPP")
                                                                                ) : (
                                                                                    <span>Pick a date</span>
                                                                                )}
                                                                            </Button>
                                                                        </PopoverTrigger>
                                                                        <PopoverContent className="w-auto p-0">
                                                                            <Calendar
                                                                                mode="single"
                                                                                selected={trialDates[session.id]}
                                                                                onSelect={(date) => handleTrialDateSelect(session.id, date)}
                                                                                disabled={(date) => !isDateValidForSession(date, session)}
                                                                                initialFocus
                                                                            />
                                                                        </PopoverContent>
                                                                    </Popover>
                                                                )}

                                                                {partialDates[session.id] && (
                                                                    <Popover>
                                                                        <PopoverTrigger asChild>
                                                                            <Button
                                                                                variant="outline"
                                                                                className={cn(
                                                                                    "w-full justify-start text-left font-normal",
                                                                                    !partialDates[session.id]?.length && "text-muted-foreground"
                                                                                )}
                                                                            >
                                                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                                                {partialDates[session.id]?.length ? (
                                                                                    `${partialDates[session.id].length} dates selected`
                                                                                ) : (
                                                                                    <span>Pick dates</span>
                                                                                )}
                                                                            </Button>
                                                                        </PopoverTrigger>
                                                                        <PopoverContent className="w-auto p-0">
                                                                            <Calendar
                                                                                mode="multiple"
                                                                                selected={partialDates[session.id]}
                                                                                onSelect={(dates) => handlePartialDateSelect(session.id, dates)}
                                                                                disabled={(date) => !isDateValidForSession(date, session)}
                                                                                initialFocus
                                                                            />
                                                                        </PopoverContent>
                                                                    </Popover>
                                                                )}
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </ScrollArea>
                            )}
                        </div>

                        {/* Selected Sessions Sidebar */}
                        <div className="lg:col-span-1">
                            <Card>
                                <CardHeader>
                                    <div className="flex justify-between items-center">
                                        <CardTitle className="text-lg">Selected Sessions</CardTitle>
                                        {selectedSessions.size > 0 && (
                                            <Button variant="outline" size="sm" onClick={clearCart}>
                                                Clear All
                                            </Button>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {selectedSessions.size === 0 ? (
                                        <div className="text-center text-muted-foreground py-8">
                                            No sessions selected
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <ScrollArea className="h-[400px]">
                                                <div className="space-y-2">
                                                    {Array.from(selectedSessions).map(sessionId => {
                                                        const session = allSessions.find(s => s.id === sessionId);
                                                        if (!session) return null;

                                                        return (
                                                            <div key={sessionId} className="p-3 bg-gray-50 rounded">
                                                                <div className="flex justify-between items-start mb-2">
                                                                    <div>
                                                                        <div className="font-medium">{session.name}</div>
                                                                        <div className="text-sm text-gray-500">
                                                                            {session.day_of_week} at {formatTime(session.start_time)}
                                                                        </div>
                                                                    </div>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        onClick={() => removeSession(sessionId)}
                                                                    >
                                                                        <X className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                                <div className="text-sm">
                                                                    <div className="font-medium">
                                                                        ${Number(calculateSessionFee(session, sessionId).toFixed(2))}
                                                                    </div>
                                                                    <div className="text-gray-500">
                                                                        {trialDates[sessionId] ? 'Trial' :
                                                                            partialDates[sessionId]?.length ? 'Partial' : 'Full Term'}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </ScrollArea>

                                            <div className="pt-4 border-t">
                                                <div className="flex justify-between items-center mb-4">
                                                    <div>
                                                        <h3 className="text-lg font-semibold">Total Fee</h3>
                                                        <p className="text-2xl font-bold">${Number(calculateTotalFee().toFixed(2))}</p>
                                                    </div>
                                                </div>

                                                <div className="space-y-4">
                                                    <div>
                                                        <Label>Payment Method</Label>
                                                        <RadioGroup
                                                            value={paymentMethod}
                                                            onValueChange={(value: 'cash' | 'cheque') => setPaymentMethod(value)}
                                                            className="flex space-x-4"
                                                        >
                                                            <div className="flex items-center space-x-2">
                                                                <RadioGroupItem value="cash" id="cash" />
                                                                <Label htmlFor="cash">Cash</Label>
                                                            </div>
                                                            <div className="flex items-center space-x-2">
                                                                <RadioGroupItem value="cheque" id="cheque" />
                                                                <Label htmlFor="cheque">Cheque</Label>
                                                            </div>
                                                        </RadioGroup>
                                                    </div>
                                                    <Button 
                                                        className="w-full"
                                                        onClick={handleProceed}
                                                    >
                                                        Proceed to Enrollment
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {isWizardOpen && (
                <EnrollmentWizard
                    isOpen={isWizardOpen}
                    onClose={() => setIsWizardOpen(false)}
                    sessions={getEnrollmentSessionsData()}
                    customerId={selectedCustomer!}
                    paymentMethod={paymentMethod}
                />
            )}
        </div>
    );
} 