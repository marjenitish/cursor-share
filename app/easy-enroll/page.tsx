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

    // Load saved state from localStorage on initial load
    useEffect(() => {
        const savedExerciseType = localStorage.getItem(STORAGE_KEYS.SELECTED_EXERCISE_TYPE);
        const savedSessions = localStorage.getItem(STORAGE_KEYS.SELECTED_SESSIONS);

        if (savedExerciseType) {
            setSelectedExerciseType(savedExerciseType);
        }

        if (savedSessions) {
            try {
                const parsedSessions = JSON.parse(savedSessions);
                setSelectedSessions(new Set(parsedSessions));
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
            localStorage.setItem(STORAGE_KEYS.SELECTED_SESSIONS, JSON.stringify(Array.from(selectedSessions)));
        } else {
            localStorage.removeItem(STORAGE_KEYS.SELECTED_SESSIONS);
        }
    }, [selectedSessions]);

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
            } else {
                newSet.add(sessionId);
            }
            return newSet;
        });
    };

    const calculateTotalFee = () => {
        return Array.from(selectedSessions).reduce((total, sessionId) => {
            const session = sessions.find(s => s.id === sessionId);
            return total + (session?.fee_amount || 0);
        }, 0);
    };

    const removeSession = (sessionId: string) => {
        setSelectedSessions(prev => {
            const newSet = new Set(prev);
            newSet.delete(sessionId);
            return newSet;
        });
    };

    // Clear cart function
    const clearCart = () => {
        setSelectedExerciseType(null);
        setSelectedSessions(new Set());
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

    console.log("selectedExerciseType", selectedExerciseType);
    console.log("selectedSessions", selectedSessions);
    console.log("sessions", sessions);

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
                                                                                ${session.fee_amount.toFixed(2)}
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
                                                        <div className="flex justify-between items-center pt-2">
                                                            <span className="font-medium text-primary">
                                                                ${session.fee_amount.toFixed(2)}
                                                            </span>
                                                            {session.is_subsidised && (
                                                                <Badge variant="secondary" className="bg-primary/10 text-primary">Subsidised</Badge>
                                                            )}
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
                selectedSessions={Array.from(selectedSessions).map(id => sessions.find(s => s.id === id)).filter(Boolean)}
                totalAmount={calculateTotalFee()}
            />
        </div>
    );
} 