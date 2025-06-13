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
import { Navigation } from '@/components/shared/navigation';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { EnrollmentInfo } from './components/enrollment-info';
import { EnrollmentWizard } from './components/enrollment-wizard';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { AuthCheckModal } from './components/auth-check-modal';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format as dateFormat } from "date-fns";
import { format as timeFormat } from "date-fns";

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

const DAYS_OF_WEEK: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const STORAGE_KEYS = {
    SELECTED_EXERCISE_TYPE: 'easy_enroll_selected_exercise_type',
    SELECTED_SESSIONS: 'easy_enroll_selected_sessions',
};

type SelectedSession = {
    id: string;
    trialDate?: string;
    partialDates?: string[]; // Array of ISO date strings
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

export default function EasyEnrollPage() {
    const supabase = createBrowserClient();
    const [sessions, setSessions] = useState<Session[]>([]);
    const [allSessions, setAllSessions] = useState<Session[]>([]);
    const [selectedSessions, setSelectedSessions] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(true);
    const [currentTerm, setCurrentTerm] = useState<{ fiscal_year: number; term_number: number } | null>(null);
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [exerciseTypes, setExerciseTypes] = useState<ExerciseType[]>([]);
    const [selectedExerciseType, setSelectedExerciseType] = useState<string | null>(null);
    const [isAuthCheckOpen, setIsAuthCheckOpen] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [trialDates, setTrialDates] = useState<Record<string, Date | undefined>>({});
    const [partialDates, setPartialDates] = useState<Record<string, Date[]>>({});

    // Load saved state from localStorage on initial load
    useEffect(() => {
        const savedExerciseType = localStorage.getItem(STORAGE_KEYS.SELECTED_EXERCISE_TYPE);
        const savedSessions = localStorage.getItem(STORAGE_KEYS.SELECTED_SESSIONS);

        if (savedExerciseType) {
            setSelectedExerciseType(savedExerciseType);
        }

        if (savedSessions) {
            try {
                const parsedSessions: SelectedSession[] = JSON.parse(savedSessions);
                setSelectedSessions(new Set(parsedSessions.map(s => s.id)));
                
                // Restore trial dates
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

    // Save selected exercise type to localStorage when it changes
    useEffect(() => {
        if (selectedExerciseType) {
            localStorage.setItem(STORAGE_KEYS.SELECTED_EXERCISE_TYPE, selectedExerciseType);
        } 
        // else {
        //     localStorage.removeItem(STORAGE_KEYS.SELECTED_EXERCISE_TYPE);
        // }
    }, [selectedExerciseType]);

    // Save selected sessions to localStorage when they change
    useEffect(() => {
        if (selectedSessions.size > 0) {
            const sessionsToSave: SelectedSession[] = Array.from(selectedSessions).map(id => ({
                id,
                trialDate: trialDates[id]?.toISOString(),
                partialDates: partialDates[id]?.map(date => date.toISOString())
            }));
            localStorage.setItem(STORAGE_KEYS.SELECTED_SESSIONS, JSON.stringify(sessionsToSave));
        } else {
            localStorage.removeItem(STORAGE_KEYS.SELECTED_SESSIONS);
        }
    }, [selectedSessions, trialDates, partialDates]);

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

            // Find current term based on today's date
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

    // Check user authentication status
    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
        };
        checkUser();
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

    // Fetch sessions when current term or selected exercise type changes
    useEffect(() => {
        fetchSessions();
    }, [currentTerm, selectedExerciseType]);

    const formatTime = (time: string) => {
        return format(new Date(`2000-01-01T${time}`), 'h:mm a');
    };

    const handleExerciseTypeChange = (typeId: string | null) => {
        setSelectedExerciseType(typeId);
        // Don't clear selected sessions when changing exercise type
    };

    const toggleSession = (sessionId: string) => {
        setSelectedSessions(prev => {
            const newSet = new Set(prev);
            if (newSet.has(sessionId)) {
                newSet.delete(sessionId);
                // Clear trial date when removing session
                setTrialDates(prev => {
                    const newDates = { ...prev };
                    delete newDates[sessionId];
                    return newDates;
                });
            } else {
                newSet.add(sessionId);
            }
            return newSet;
        });
    };

    const handleTrialDateSelect = (sessionId: string, date: Date | undefined) => {
        setTrialDates(prev => ({
            ...prev,
            [sessionId]: date
        }));
    };

    const handlePartialDateSelect = (sessionId: string, dates: Date[]) => {
        setPartialDates(prev => ({
            ...prev,
            [sessionId]: dates
        }));
    };

    const isDateInTermRange = (date: Date, session: Session) => {
        if (!session.terms?.start_date || !session.terms?.end_date) return false;
        
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate date comparison
        
        const startDate = new Date(session.terms.start_date);
        const endDate = new Date(session.terms.end_date);
        
        // Check if date is before today
        if (date < today) return false;
        
        // Check if date is within term range
        if (date < startDate || date > endDate) return false;

        // Check if date matches the session's day of week
        const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
        return dayOfWeek === session.day_of_week;
    };

    const calculateSessionFee = (session: Session, sessionId: string) => {
        // If trial date is selected, fee is 0
        if (trialDates[sessionId]) return 0;

        // If partial dates are selected, calculate proportional fee
        if (partialDates[sessionId]?.length) {
            const totalWeeks = getTotalWeeksInTerm(session);
            const selectedWeeks = partialDates[sessionId].length;
            const proportionalFee = (session.fee_amount / totalWeeks) * selectedWeeks;
            return proportionalFee;
        }

        // Full term fee
        return session.fee_amount;
    };

    const calculateTotalFee = () => {
        let total = 0;
        Array.from(selectedSessions).forEach(sessionId => {
            const session = allSessions.find(s => s.id === sessionId);
            if (session) {
                total += calculateSessionFee(session, sessionId);
            }
        });
        return total;
    };

    const getTotalWeeksInTerm = (session: Session) => {
        if (!session.terms?.start_date || !session.terms?.end_date) return 0;
        const startDate = new Date(session.terms.start_date);
        const endDate = new Date(session.terms.end_date);
        const weeks = Math.ceil((endDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
        return weeks;
    };

    const removeSession = (sessionId: string) => {
        setSelectedSessions(prev => {
            const newSet = new Set(prev);
            newSet.delete(sessionId);
            return newSet;
        });
        // Clear trial date when removing session
        setTrialDates(prev => {
            const newDates = { ...prev };
            delete newDates[sessionId];
            return newDates;
        });
    };

    // Clear cart function
    const clearCart = () => {
        setSelectedExerciseType(null);
        setSelectedSessions(new Set());
        setTrialDates({});
        setPartialDates({});
        localStorage.removeItem(STORAGE_KEYS.SELECTED_EXERCISE_TYPE);
        localStorage.removeItem(STORAGE_KEYS.SELECTED_SESSIONS);
    };

    const handleProceed = () => {
        if (!user) {
            setIsAuthCheckOpen(true);
        } else {
            setIsWizardOpen(true);
        }
    };

    // Get all exercise types that have selected sessions
    const getSelectedExerciseTypes = () => {
        const selectedTypes = new Set<string>();
        
        // Add the currently selected exercise type if it exists
        if (selectedExerciseType) {
            selectedTypes.add(selectedExerciseType);
        }

        // Add exercise types from selected sessions
        Array.from(selectedSessions).forEach(sessionId => {
            const session = sessions.find(s => s.id === sessionId);
            if (session?.exercise_type_id) {
                selectedTypes.add(session.exercise_type_id);
            }
        });

        return Array.from(selectedTypes);
    };

    const getNextAvailableDate = (session: Session): Date => {
        const today = new Date();
        const startDate = new Date(session.terms?.start_date || '');
        const endDate = new Date(session.terms?.end_date || '');
        
        // If today is after end date, return start date
        if (today > endDate) return startDate;
        
        // If today is before start date, return start date
        if (today < startDate) return startDate;

        // Get the day of week number (0-6, where 0 is Sunday)
        const sessionDayNumber = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].indexOf(session.day_of_week);
        const todayDayNumber = today.getDay();

        // Calculate days until next session day
        let daysUntilNext = sessionDayNumber - todayDayNumber;
        if (daysUntilNext <= 0) {
            daysUntilNext += 7; // Add a week if the day has passed
        }

        // Create date for next session
        const nextDate = new Date(today);
        nextDate.setDate(today.getDate() + daysUntilNext);

        // If next date is after end date, return start date
        if (nextDate > endDate) return startDate;

        return nextDate;
    };

    const getEnrollmentSessionsData = () => {
        return Array.from(selectedSessions)
            .map(id => {
                const session = allSessions.find(s => s.id === id);
                if (!session) return null;

                const enrollmentData: EnrollmentSessionData = {
                    session_id: session.id,
                    enrollment_type: trialDates[id] ? 'trial' : 
                                  partialDates[id]?.length ? 'partial' : 'full',
                    fee_amount: calculateSessionFee(session, id),
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

                // Add trial date if exists
                if (trialDates[id]) {
                    enrollmentData.trial_date = trialDates[id]?.toISOString();
                }

                // Add partial dates if exist
                if (partialDates[id]?.length) {
                    enrollmentData.partial_dates = partialDates[id]?.map(date => date.toISOString());
                }

                return enrollmentData;
            })
            .filter((data): data is EnrollmentSessionData => data !== null);
    };

    // console.log("selectedExerciseType", selectedExerciseType);
    console.log("selectedSessions", selectedSessions);
    // console.log("sessions", sessions);
    // console.log("trialDate", trialDates);

    return (
        <div className="min-h-screen bg-background">
            <Navigation />
            <div className="flex h-[calc(100vh-64px)]">
                {/* Main Content */}
                <ScrollArea className="flex-1">
                    <div className="p-6 space-y-6">
                        <Card className="bg-gradient-to-br from-secondary/10 via-background to-tertiary/10 border-none shadow-lg">
                            <CardHeader>
                                <CardTitle className="text-primary">Enrollment</CardTitle>                            
                                {currentTerm && (
                                    <p className="text-sm text-muted-foreground">
                                        Current Term: FY {currentTerm.fiscal_year} - Term {currentTerm.term_number}
                                    </p>
                                )}
                                <AlertDescription className="mt-2">
                                    {!selectedExerciseType ? (
                                        <p className="mb-2">Select an exercise type to view available classes.</p>
                                    ) : (
                                        <div className="flex items-center justify-between">
                                            <p className="mb-2">
                                                Showing classes for: <span className="font-medium">
                                                    {exerciseTypes.find(t => t.id === selectedExerciseType)?.name}
                                                </span>
                                            </p>
                                            <div className="flex items-center space-x-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleExerciseTypeChange(null)}
                                                >
                                                    Change Exercise Type
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={clearCart}
                                                >
                                                    Clear Cart
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </AlertDescription>
                            </CardHeader>
                            <CardContent>
                                {!selectedExerciseType ? (
                                    // Exercise Type Selection
                                    <div className="space-y-4">
                                        <RadioGroup
                                            value={selectedExerciseType || ""}
                                            onValueChange={handleExerciseTypeChange}
                                            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                                        >
                                            {exerciseTypes.map((type) => (
                                                <div key={type.id}>
                                                    <RadioGroupItem
                                                        value={type.id}
                                                        id={type.id}
                                                        className="peer sr-only"
                                                    />
                                                    <Label
                                                        htmlFor={type.id}
                                                        className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                                                    >
                                                        <div className="space-y-1 text-center">
                                                            <div className="font-medium">{type.name}</div>
                                                        </div>
                                                    </Label>
                                                </div>
                                            ))}
                                        </RadioGroup>
                                    </div>
                                ) : (
                                    // Sessions List
                                    <div className="space-y-8">
                                        {isLoading ? (
                                            <div className="flex justify-center items-center h-64">
                                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                            </div>
                                        ) : (
                                            DAYS_OF_WEEK.map(day => {
                                                const dayClasses = sessions.filter(session => session.day_of_week === day);
                                                return (
                                                    <div key={day} className="space-y-2">
                                                        <h3 className="font-semibold text-lg text-primary">{day}</h3>
                                                        {dayClasses.length > 0 ? (
                                                            <Table>
                                                                <TableHeader>
                                                                    <TableRow className="bg-muted/50">
                                                                        <TableHead className="w-[50px]">Select</TableHead>
                                                                        <TableHead>Time</TableHead>
                                                                        <TableHead>Class</TableHead>
                                                                        <TableHead>Exercise Type</TableHead>
                                                                        <TableHead>Venue</TableHead>
                                                                        <TableHead>Instructor</TableHead>
                                                                        <TableHead>Fee</TableHead>
                                                                    </TableRow>
                                                                </TableHeader>
                                                                <TableBody>
                                                                    {dayClasses.map(session => (
                                                                        <TableRow key={session.id} className="hover:bg-muted/30">
                                                                            <TableCell>
                                                                                <Checkbox
                                                                                    checked={selectedSessions.has(session.id)}
                                                                                    onCheckedChange={() => toggleSession(session.id)}
                                                                                />
                                                                            </TableCell>
                                                                            <TableCell>
                                                                                {formatTime(session.start_time)}
                                                                                {session.end_time && ` - ${formatTime(session.end_time)}`}
                                                                                <br />
                                                                                {session?.terms?.start_date} to {session?.terms?.end_date}
                                                                            </TableCell>
                                                                            <TableCell>
                                                                                <div className="font-medium">{session.name}</div>
                                                                                <div className="text-sm text-muted-foreground">{session.code}</div>
                                                                            </TableCell>
                                                                            <TableCell>
                                                                                {session.exercise_type?.name}
                                                                            </TableCell>
                                                                            <TableCell>
                                                                                {session.venue?.name}
                                                                                <br />
                                                                                <span className="text-sm text-muted-foreground">
                                                                                    {session.address}
                                                                                    {session.zip_code && `, ${session.zip_code}`}
                                                                                </span>
                                                                            </TableCell>
                                                                            <TableCell>{session.instructor?.name}</TableCell>
                                                                            <TableCell>
                                                                                ${calculateSessionFee(session, session.id).toFixed(2)}
                                                                            </TableCell>
                                                                        </TableRow>
                                                                    ))}
                                                                </TableBody>
                                                            </Table>
                                                        ) : (
                                                            <div className="text-center py-4 bg-muted/30 rounded-md text-muted-foreground">
                                                                No classes available for {day}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </ScrollArea>

                {/* Sidebar */}
                <div className="w-[400px] border-l bg-gradient-to-br from-secondary/5 via-background to-tertiary/5">
                    <ScrollArea className="h-full">
                        <div className="p-6 space-y-4">
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <h2 className="text-lg font-semibold text-primary">Selected Sessions</h2>
                                    {selectedSessions.size > 0 && (
                                        <div className="flex items-center space-x-2">
                                            <Button 
                                                size="sm" 
                                                variant="outline"
                                                onClick={clearCart}
                                            >
                                                Clear
                                            </Button>
                                            <Button 
                                                size="sm" 
                                                className="bg-primary hover:bg-primary/90"
                                                onClick={handleProceed}
                                            >
                                                Proceed
                                            </Button>
                                        </div>
                                    )}
                                </div>
                                {selectedSessions.size > 0 && (
                                    <div className="flex justify-between items-center text-sm">
                                        <div className="space-x-4">
                                            <span className="text-muted-foreground">
                                                {selectedSessions.size} session{selectedSessions.size !== 1 ? 's' : ''} selected
                                            </span>
                                            <span className="text-muted-foreground">•</span>
                                            <span className="font-medium text-primary">
                                                Total: ${calculateTotalFee().toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                            {selectedSessions.size === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    {selectedExerciseType ? 'No sessions selected' : 'Select an exercise type to view sessions'}
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {Array.from(selectedSessions)
                                        .map(id => allSessions.find(s => s.id === id))
                                        .filter((session): session is Session => session !== undefined)
                                        .map(session => (
                                            <Card key={session.id} className="relative bg-gradient-to-br from-secondary/5 via-background to-tertiary/5 border-none shadow-sm hover:shadow-md transition-shadow">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:text-primary"
                                                    onClick={() => removeSession(session.id)}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                                <CardContent className="pt-6">
                                                    <div className="space-y-2">
                                                        <div className="font-medium text-primary">{session.name}</div>
                                                        <div className="text-sm text-muted-foreground">{session.code}</div>
                                                        <div className="text-sm">
                                                            {session.day_of_week} • {formatTime(session.start_time)}
                                                            {session.end_time && ` - ${formatTime(session.end_time)}`}
                                                            <br />
                                                            {session.terms?.start_date} to {session.terms?.end_date}
                                                        </div>
                                                        <div className="text-sm">
                                                            {session.venue?.name}
                                                        </div>
                                                        <div className="text-sm text-muted-foreground">
                                                            {session.instructor?.name}
                                                        </div>
                                                        <div className="flex flex-col space-y-2 pt-2">
                                                            <div className="flex items-center space-x-2">
                                                                <Checkbox
                                                                    id={`trial-${session.id}`}
                                                                    checked={!!trialDates[session.id]}
                                                                    onCheckedChange={(checked) => {
                                                                        if (checked) {
                                                                            const nextDate = getNextAvailableDate(session);
                                                                            handleTrialDateSelect(session.id, nextDate);
                                                                            // Clear partial dates if trial is selected
                                                                            handlePartialDateSelect(session.id, []);
                                                                        } else {
                                                                            handleTrialDateSelect(session.id, undefined);
                                                                        }
                                                                    }}
                                                                />
                                                                <Label htmlFor={`trial-${session.id}`} className="text-sm">
                                                                    Book as Trial Class
                                                                </Label>
                                                            </div>
                                                            <div className="flex items-center space-x-2">
                                                                <Checkbox
                                                                    id={`partial-${session.id}`}
                                                                    checked={!!partialDates[session.id]?.length}
                                                                    onCheckedChange={(checked) => {
                                                                        if (checked) {
                                                                            // Initialize with next available date
                                                                            const nextDate = getNextAvailableDate(session);
                                                                            handlePartialDateSelect(session.id, [nextDate]);
                                                                            // Clear trial date if partial is selected
                                                                            handleTrialDateSelect(session.id, undefined);
                                                                        } else {
                                                                            handlePartialDateSelect(session.id, []);
                                                                        }
                                                                    }}
                                                                />
                                                                <Label htmlFor={`partial-${session.id}`} className="text-sm">
                                                                    Book Partial Classes
                                                                </Label>
                                                            </div>
                                                            {trialDates[session.id] && (
                                                                <div className="flex items-center space-x-2">
                                                                    <Popover>
                                                                        <PopoverTrigger asChild>
                                                                            <Button
                                                                                variant="outline"
                                                                                className={cn(
                                                                                    "w-[240px] justify-start text-left font-normal",
                                                                                    !trialDates[session.id] && "text-muted-foreground"
                                                                                )}
                                                                            >
                                                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                                                {trialDates[session.id] ? (
                                                                                    dateFormat(trialDates[session.id]!, "PPP")
                                                                                ) : (
                                                                                    <span>Pick a date</span>
                                                                                )}
                                                                            </Button>
                                                                        </PopoverTrigger>
                                                                        <PopoverContent className="w-auto p-0" align="start">
                                                                            <Calendar
                                                                                mode="single"
                                                                                selected={trialDates[session.id]}
                                                                                onSelect={(date) => handleTrialDateSelect(session.id, date)}
                                                                                disabled={(date) => !isDateInTermRange(date, session)}
                                                                                initialFocus
                                                                                className="rounded-md border"
                                                                                modifiers={{
                                                                                    available: (date) => isDateInTermRange(date, session)
                                                                                }}
                                                                                modifiersStyles={{
                                                                                    available: {
                                                                                        fontWeight: 'bold',
                                                                                        color: 'var(--primary)'
                                                                                    }
                                                                                }}
                                                                            />
                                                                        </PopoverContent>
                                                                    </Popover>
                                                                </div>
                                                            )}
                                                            {partialDates[session.id]?.length > 0 && (
                                                                <div className="space-y-2">
                                                                    <div className="flex items-center space-x-2">
                                                                        <Popover>
                                                                            <PopoverTrigger asChild>
                                                                                <Button
                                                                                    variant="outline"
                                                                                    className={cn(
                                                                                        "w-[240px] justify-start text-left font-normal",
                                                                                        !partialDates[session.id]?.length && "text-muted-foreground"
                                                                                    )}
                                                                                >
                                                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                                                    <span>Select Dates</span>
                                                                                </Button>
                                                                            </PopoverTrigger>
                                                                            <PopoverContent className="w-auto p-0" align="start">
                                                                                <Calendar
                                                                                    mode="multiple"
                                                                                    selected={partialDates[session.id]}
                                                                                    onSelect={(dates) => handlePartialDateSelect(session.id, dates || [])}
                                                                                    disabled={(date) => !isDateInTermRange(date, session)}
                                                                                    initialFocus
                                                                                    className="rounded-md border"
                                                                                />
                                                                            </PopoverContent>
                                                                        </Popover>
                                                                    </div>
                                                                    <div className="flex flex-wrap gap-2">
                                                                        {partialDates[session.id]?.map((date, index) => (
                                                                            <Badge key={index} variant="secondary" className="flex items-center gap-1">
                                                                                {dateFormat(date, "MMM d, yyyy")}
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    size="icon"
                                                                                    className="h-4 w-4 p-0 hover:bg-transparent"
                                                                                    onClick={() => {
                                                                                        const newDates = [...partialDates[session.id]];
                                                                                        newDates.splice(index, 1);
                                                                                        handlePartialDateSelect(session.id, newDates);
                                                                                    }}
                                                                                >
                                                                                    <X className="h-3 w-3" />
                                                                                </Button>
                                                                            </Badge>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                            <div className="flex justify-between items-center">
                                                                <span className="font-medium text-primary">
                                                                    ${calculateSessionFee(session, session.id).toFixed(2)}
                                                                </span>
                                                                {session.is_subsidised && !trialDates[session.id] && !partialDates[session.id]?.length && (
                                                                    <Badge variant="secondary" className="bg-primary/10 text-primary">Subsidised</Badge>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </div>
            </div>

            <AuthCheckModal
                isOpen={isAuthCheckOpen}
                onClose={() => setIsAuthCheckOpen(false)}
            />

            <EnrollmentWizard
                isOpen={isWizardOpen}
                onClose={() => {
                    setIsWizardOpen(false);
                    clearCart();
                }}
                selectedSessions={Array.from(selectedSessions)
                    .map(id => allSessions.find(s => s.id === id))
                    .filter((session): session is Session => session !== null)}
                totalAmount={calculateTotalFee()}
                enrollmentSessionsData={getEnrollmentSessionsData()}
            />
        </div>
    );
} 