'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase/client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';

const customerSchema = z.object({
  surname: z.string().min(1, 'Surname is required'),
  first_name: z.string().min(1, 'First name is required'),
  street_number: z.string().min(1, 'Street number is required'),
  street_name: z.string().min(1, 'Street name is required'),
  suburb: z.string().min(1, 'Suburb is required'),
  post_code: z.string().min(1, 'Post code is required'),
  contact_no: z.string().min(1, 'Contact number is required'),
  email: z.string().email('Invalid email address'),
  country_of_birth: z.string().min(1, 'Country of birth is required'),
  date_of_birth: z.string().min(1, 'Date of birth is required'),
  work_mobile: z.string().optional(),
  paq_form: z.boolean(),
  australian_citizen: z.boolean(),
  language_other_than_english: z.string().optional(),
  english_proficiency: z.enum(['Very Well', 'Well', 'Not Well', 'Not at All']),
  indigenous_status: z.enum(['Yes', 'No', 'Prefer not to say']),
  reason_for_class: z.string().min(1, 'Reason for class is required'),
  how_did_you_hear: z.string().min(1, 'How did you hear is required'),
  occupation: z.string().min(1, 'Occupation is required'),
  next_of_kin_name: z.string().min(1, 'Next of kin name is required'),
  next_of_kin_relationship: z.string().min(1, 'Next of kin relationship is required'),
  next_of_kin_mobile: z.string().min(1, 'Next of kin mobile is required'),
  next_of_kin_phone: z.string().optional(),
  equipment_purchased: z.array(z.string()).default([]),
});

type CustomerFormValues = z.infer<typeof customerSchema>;

interface EnrollmentInfoProps {
  supportPhone?: string;
  onFormDataUpdate?: (data: any) => void;
}

export function EnrollmentInfo({ supportPhone = "(555) 123-4567", onFormDataUpdate }: EnrollmentInfoProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [customer, setCustomer] = useState<any>(null);
  const { toast } = useToast();
  const supabase = createBrowserClient();

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      paq_form: false,
      australian_citizen: false,
      equipment_purchased: [],
    },
  });

  useEffect(() => {
    const fetchCustomer = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: customerData, error } = await supabase
          .from('customers')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (customerData && !error) {
          setCustomer(customerData);
          // Set form values from existing customer data
          Object.entries(customerData).forEach(([key, value]) => {
            if (key in form.getValues()) {
              let castValue = value;
              const current = form.getValues()[key as keyof CustomerFormValues];
              if (Array.isArray(current)) {
                castValue = Array.isArray(value) ? value : [];
              } else if (typeof current === 'boolean') {
                castValue = typeof value === 'boolean' ? value : false;
              } else if (typeof current === 'string') {
                castValue = typeof value === 'string' ? value : '';
              }
              form.setValue(key as keyof CustomerFormValues, castValue as any);
            }
          });
        }
      }
    };

    fetchCustomer();
  }, []);

  const onSubmit = async (data: CustomerFormValues) => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      if (customer) {
        // Update existing customer
        const { error } = await supabase
          .from('customers')
          .update({
            ...data,
            updated_at: new Date().toISOString(),
          })
          .eq('id', customer.id);

        if (error) throw error;
        toast({
          title: 'Success',
          description: 'Your information has been updated successfully.',
        });
      } else {
        // Insert new customer
        const { error } = await supabase
          .from('customers')
          .insert({
            ...data,
            user_id: user.id,
            status: 'Active',
          });

        if (error) throw error;
        toast({
          title: 'Success',
          description: 'Your information has been saved successfully.',
        });
      }

      // Call onFormDataUpdate with the form data
      onFormDataUpdate?.(data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="bg-gradient-to-br from-secondary/10 via-background to-tertiary/10 border-none shadow-lg">
      <CardContent className="pt-6">
        <div className="space-y-4">
          <Alert className="bg-primary/5 border-primary/20">
            <Info className="h-4 w-4 text-primary" />
            <AlertTitle className="text-primary">Welcome to Easy Enrollment!</AlertTitle>
            <AlertDescription className="mt-2">
              <p className="mb-2">Please fill in your details to proceed with enrollment:</p>
            </AlertDescription>
          </Alert>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="first_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="surname"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Surname</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contact_no"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Number</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="work_mobile"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Work Mobile (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="date_of_birth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of Birth</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="street_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Street Number</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="street_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Street Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="suburb"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Suburb</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="post_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Post Code</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="country_of_birth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country of Birth</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="english_proficiency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>English Proficiency</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select proficiency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Very Well">Very Well</SelectItem>
                          <SelectItem value="Well">Well</SelectItem>
                          <SelectItem value="Not Well">Not Well</SelectItem>
                          <SelectItem value="Not at All">Not at All</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="language_other_than_english"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Language Other Than English (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="indigenous_status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Indigenous Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Yes">Yes</SelectItem>
                          <SelectItem value="No">No</SelectItem>
                          <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="australian_citizen"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Australian Citizen</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="paq_form"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>PAQ Form Completed</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="reason_for_class"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reason for Class</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="how_did_you_hear"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>How did you hear about us?</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="occupation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Occupation</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="next_of_kin_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Next of Kin Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="next_of_kin_relationship"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Next of Kin Relationship</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="next_of_kin_mobile"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Next of Kin Mobile</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="next_of_kin_phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Next of Kin Phone (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Saving...' : customer ? 'Update Information' : 'Save Information'}
              </Button>
            </form>
          </Form>
        </div>
      </CardContent>
    </Card>
  );
} 