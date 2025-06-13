'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createBrowserClient } from '@/lib/supabase/client';
import { format } from 'date-fns';

type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';

interface Venue {
  id: string;
  name: string;
  street_address: string;
  city: string;
  status: 'active' | 'inactive';
}

interface Instructor {
  id: string;
  name: string;
  contact_no: string;
}

interface ExerciseType {
  id: string;
  name: string;
}

interface Term {
  id: number;
  fiscal_year: number;
  term_number: number;
  start_date: string;
  end_date: string;
}

interface SessionFormProps {
  type: 'create' | 'edit';
  defaultValues?: SessionFormValues;
  sessionId?: string;
  onSuccess?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const sessionFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().min(1, 'Code is required'),
  venue_id: z.string().uuid('Invalid venue ID'),
  instructor_id: z.string().uuid('Invalid instructor ID'),
  fee_criteria: z.string().min(1, 'Fee criteria is required'),
  term: z.string().min(1, 'Term is required'),
  fee_amount: z.number().min(0, 'Fee amount must be positive'),
  exercise_type_id: z.string().uuid('Invalid exercise type ID').nullable(),
  term_id: z.number().int('Invalid term ID'),
  zip_code: z.string().nullable(),
  day_of_week: z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']),
  start_time: z.string().min(1, 'Start time is required'),
  end_time: z.string().nullable(),
  is_subsidised: z.boolean().default(false),
  class_capacity: z.number().int().nullable(),
});

type SessionFormValues = z.infer<typeof sessionFormSchema>;

export function SessionForm({ type, defaultValues, sessionId, onSuccess, open: externalOpen, onOpenChange: externalOnOpenChange }: SessionFormProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [exerciseTypes, setExerciseTypes] = useState<ExerciseType[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const supabase = createBrowserClient();
  
  const open = type === 'edit' ? externalOpen : internalOpen;
  const onOpenChange = type === 'edit' ? externalOnOpenChange : setInternalOpen;

  const form = useForm<SessionFormValues>({
    resolver: zodResolver(sessionFormSchema),
    defaultValues: defaultValues || {
      name: '',
      code: '',
      venue_id: '',
      instructor_id: '',
      fee_criteria: '',
      term: '',
      fee_amount: 0,
      exercise_type_id: null,
      term_id: 0,
      zip_code: null,
      day_of_week: 'Monday',
      start_time: '',
      end_time: null,
      is_subsidised: false,
      class_capacity: null,
    },
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const [instructorsRes, exerciseTypesRes, termsRes, venuesRes] = await Promise.all([
          supabase.from('instructors').select('id, name, contact_no').order('name'),
          supabase.from('exercise_types').select('id, name').order('name'),
          supabase.from('terms').select('*').order('fiscal_year', { ascending: false }).order('term_number'),
          supabase.from('venues').select('*').eq('status', 'active').order('name')
        ]);

        if (instructorsRes.error) throw instructorsRes.error;
        if (exerciseTypesRes.error) throw exerciseTypesRes.error;
        if (termsRes.error) throw termsRes.error;
        if (venuesRes.error) throw venuesRes.error;

        setInstructors(instructorsRes.data);
        setExerciseTypes(exerciseTypesRes.data);
        setTerms(termsRes.data);
        setVenues(venuesRes.data);
      } catch (error) {
        console.error('Error fetching form data:', error);
      }
    }

    fetchData();
  }, []);

  const onSubmit = async (values: SessionFormValues) => {
    setIsLoading(true);
    try {
      if (type === 'create') {
        const { error } = await supabase.from('sessions').insert(values);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('sessions')
          .update(values)
          .eq('id', sessionId);
        if (error) throw error;
      }
      
      onOpenChange?.(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {type === 'create' ? (
        <DialogTrigger asChild>
          <Button>Create Session</Button>
        </DialogTrigger>
      ) : null}
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{type === 'create' ? 'Create Session' : 'Edit Session'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Code</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="venue_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Venue</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select venue" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {venues.map((venue) => (
                        <SelectItem key={venue.id} value={venue.id}>
                          {venue.name} - {venue.street_address}, {venue.city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="instructor_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Instructor</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select instructor" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {instructors.map((instructor) => (
                        <SelectItem key={instructor.id} value={instructor.id}>
                          {instructor.name} - {instructor.contact_no}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="fee_criteria"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fee Criteria</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="term"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Term</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="fee_amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fee Amount</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="exercise_type_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Exercise Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select exercise type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {exerciseTypes.map((exerciseType) => (
                        <SelectItem key={exerciseType.id} value={exerciseType.id}>
                          {exerciseType.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="term_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Term ID</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="zip_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Zip Code</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="day_of_week"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Day of Week</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="start_time"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Time</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="end_time"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>End Time</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_subsidised"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Is Subsidised</FormLabel>
                  <FormControl>
                    <Switch {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="class_capacity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Class Capacity</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>Loading...</>
              ) : type === 'create' ? (
                'Create Session'
              ) : (
                'Update Session'
              )}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 