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

const venueFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  street_address: z.string().min(1, 'Street address is required'),
  city: z.string().min(1, 'City is required'),
  status: z.enum(['active', 'inactive']),
});

type VenueFormValues = z.infer<typeof venueFormSchema>;

interface VenueFormProps {
  type: 'create' | 'edit';
  defaultValues?: VenueFormValues;
  venueId?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
}

export function VenueForm({ 
  type, 
  defaultValues, 
  venueId, 
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
  onSuccess 
}: VenueFormProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createBrowserClient();
  
  const open = type === 'edit' ? externalOpen : internalOpen;
  const onOpenChange = type === 'edit' ? externalOnOpenChange : setInternalOpen;

  const form = useForm<VenueFormValues>({
    resolver: zodResolver(venueFormSchema),
    defaultValues: defaultValues || {
      name: '',
      street_address: '',
      city: '',
      status: 'active',
    },
  });

  async function onSubmit(values: VenueFormValues) {
    setIsLoading(true);
    try {
      if (type === 'create') {
        const { error } = await supabase
          .from('venues')
          .insert([values])
          .single();
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('venues')
          .update(values)
          .eq('id', venueId)
          .single();
        
        if (error) throw error;
      }
      
      onOpenChange?.(false);
      form.reset();
      onSuccess?.();
    } catch (error) {
      console.error('Error saving venue:', error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {type === 'create' ? (
        <DialogTrigger asChild>
          <Button>Add Venue</Button>
        </DialogTrigger>
      ) : null}
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{type === 'create' ? 'Add Venue' : 'Edit Venue'}</DialogTitle>
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
              name="street_address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Street Address</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>City</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
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