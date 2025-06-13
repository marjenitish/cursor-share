'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createBrowserClient } from '@/lib/supabase/client';

const termFormSchema = z.object({
  fiscal_year: z.number().min(2020).max(2050),
  term_number: z.number().min(1).max(4),
  day_of_week: z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']),
  start_date: z.string(),
  end_date: z.string(),
  number_of_weeks: z.number().min(1).max(20),
});

type TermFormValues = z.infer<typeof termFormSchema>;

interface TermFormProps {
  type: 'create' | 'edit';
  defaultValues?: TermFormValues;
  termId?: number;
  onSuccess?: () => void;
}

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const termNumbers = [1, 2, 3, 4];

export function TermForm({ type, defaultValues, termId, onSuccess }: TermFormProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createBrowserClient();

  const form = useForm<TermFormValues>({
    resolver: zodResolver(termFormSchema),
    defaultValues: defaultValues || {
      fiscal_year: new Date().getFullYear(),
      term_number: 1,
      day_of_week: 'Monday',
      start_date: '',
      end_date: '',
      number_of_weeks: 9,
    },
  });

  async function onSubmit(values: TermFormValues) {
    setIsLoading(true);
    try {
      if (type === 'create') {
        const { error } = await supabase
          .from('terms')
          .insert([values])
          .single();
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('terms')
          .update(values)
          .eq('id', termId)
          .single();
        
        if (error) throw error;
      }
      
      setOpen(false);
      form.reset();
      onSuccess?.();
    } catch (error) {
      console.error('Error saving term:', error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={type === 'create' ? 'default' : 'outline'}>
          {type === 'create' ? 'Create Term' : 'Edit Term'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{type === 'create' ? 'Create Term' : 'Edit Term'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="fiscal_year"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fiscal Year</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="term_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Term Number</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(parseInt(value))}
                    defaultValue={field.value.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select term number" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {termNumbers.map((num) => (
                        <SelectItem key={num} value={num.toString()}>
                          Term {num}
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
              name="day_of_week"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Day of Week</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select day of week" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {daysOfWeek.map((day) => (
                        <SelectItem key={day} value={day}>
                          {day}
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
              name="start_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="end_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>End Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="number_of_weeks"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Number of Weeks</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save'}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 