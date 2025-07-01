'use client';

import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Navigation } from '@/components/shared/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { createBrowserClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Download, Edit, Calendar, Clock, MapPin, AlertCircle } from 'lucide-react';
import { PAQProfileForm } from '@/components/profile/paq-profile-form';
import { CancelBookingModal } from '@/components/bookings/cancel-booking-modal';
import { PAQModal } from '@/components/profile/paq-modal';
import { format } from 'date-fns';
import { TerminationModal } from '@/components/customers/termination-modal';
import { getDayName } from '@/lib/utils';
import Link from 'next/link';
import { Table, TableHeader, TableBody, TableCell, TableRow, TableHead } from '@/components/ui/table';
import { CancellationRequestModal } from './components/cancellation-request-modal';

const customerSchema = z.object({
  surname: z.string().min(1, 'Surname is required'),
  first_name: z.string().min(1, 'First name is required'),
  street_number: z.string().optional(),
  street_name: z.string().optional(),
  suburb: z.string().optional(),
  post_code: z.string().optional(),
  contact_no: z.string().optional(),
  email: z.string().email('Invalid email address'),
  country_of_birth: z.string().optional(),
  date_of_birth: z.string().optional(),
  work_mobile: z.string().optional(),
  australian_citizen: z.boolean().default(false),
  language_other_than_english: z.string().optional(),
  english_proficiency: z.enum(['Very Well', 'Well', 'Not Well', 'Not at All']).optional(),
  indigenous_status: z.enum(['Yes', 'No', 'Prefer not to say']).optional(),
  reason_for_class: z.string().optional(),
  how_did_you_hear: z.string().optional(),
  occupation: z.string().optional(),
  next_of_kin_name: z.string().optional(),
  next_of_kin_relationship: z.string().optional(),
  next_of_kin_mobile: z.string().optional(),
  next_of_kin_phone: z.string().optional(),
});

type Payment = {
    id: string;
    amount: number;
    payment_method: string;
    payment_status: string;
    transaction_id: string | null;
    receipt_number: string;
    payment_date: string;
    notes: string | null;
    enrollment: {
        id: string;
        enrollment_type: string;
        status: string;
    };
};

type EnrollmentSession = {
    id: string;
    enrollment_id: string;
    session_id: string;
    booking_date: string;
    is_free_trial: boolean;
    trial_date: string | null;
    partial_dates: string[] | null;
    enrollment_type: string;
    session: {
        id: string;
        name: string;
        code: string;
        day_of_week: string;
        start_time: string;
        end_time: string | null;
        term_details?: {
            fiscal_year: number;
            start_date: string;
            end_date: string;
        };
        exercise_type: {
            id: string;
            name: string;
        };
        instructor: {
            id: string;
            first_name: string;
            last_name: string;
        };
        venue: {
            id: string;
            name: string;
        };
    };
    instructor: {
      id: string;
      name: string;
    }
};

type Enrollment = {
    id: string;
    enrollment_type: string;
    status: string;
    payment_status: string;
    created_at: string;
    payments: Payment[];
};

type EnrollmentWithSessions = Enrollment & {
    sessions: EnrollmentSession[];
};

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [customer, setCustomer] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isPAQModalOpen, setIsPAQModalOpen] = useState(false);
  const [terminationRequest, setTerminationRequest] = useState<any>(null);
  const [isTerminationModalOpen, setIsTerminationModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const { toast } = useToast();
  const supabase = createBrowserClient();
  const [activeTab, setActiveTab] = useState('profile');
  const [enrollments, setEnrollments] = useState<EnrollmentWithSessions[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedEnrollmentSession, setSelectedEnrollmentSession] = useState<any>(null);

  const form = useForm<z.infer<typeof customerSchema>>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      surname: '',
      first_name: '',
      email: '',
      australian_citizen: false,
      english_proficiency: 'Well',
      indigenous_status: 'Prefer not to say',
    },
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!user) throw new Error('Not authenticated');
        setUser(user);

        console.log('User authenticated:', user.id);

        // Get customer profile
        const { data: customerData, error: customerError } = await supabase
          .from('customers')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (customerError) throw customerError;
        if (!customerData) throw new Error('Customer profile not found');
        setCustomer(customerData);

        console.log('Customer profile found:', customerData.id);

        // Fetch enrollments for this customer
        const { data: enrollmentsData, error: enrollmentsError } = await supabase
          .from('enrollments')
          .select(`
            *,
            payments(*)
          `)
          .eq('customer_id', customerData.id)
          .order('created_at', { ascending: false });

        if (enrollmentsError) throw enrollmentsError;

        console.log('Enrollments found:', enrollmentsData?.length || 0);

        // Fetch enrollment sessions for these enrollments
        const enrollmentIds = enrollmentsData?.map(e => e.id) || [];
        const { data: sessionsData, error: sessionsError } = await supabase
          .from('enrollment_sessions')
          .select(`
            *,
            session:sessions(
              *,
              term_details:terms(fiscal_year, start_date, end_date),
              exercise_type:exercise_types(*),
              instructor:instructors(*),
              venue:venues(*)
            )
          `)
          .in('enrollment_id', enrollmentIds)
          .order('booking_date', { ascending: false });

        if (sessionsError) throw sessionsError;

        console.log('Sessions found:', sessionsData?.length || 0);

        // Group sessions by enrollment
        const enrollmentsWithSessions = (enrollmentsData || []).map(enrollment => ({
          ...enrollment,
          sessions: (sessionsData || []).filter(session => session.enrollment_id === enrollment.id)
        }));

        setEnrollments(enrollmentsWithSessions);        

        // Safely handle payments
        const allPayments = (enrollmentsData || []).reduce((acc: Payment[], enrollment) => {
          if (enrollment.payments && Array.isArray(enrollment.payments)) {
            return [...acc, ...enrollment.payments];
          }
          return acc;
        }, []);
        setPayments(allPayments);

      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const onSubmit = async (values: z.infer<typeof customerSchema>) => {
    if (!user) return;

    setSubmitting(true);
    try {
      if (customer) {
        // Update existing customer profile
        const { error } = await supabase
          .from('customers')
          .update({
            ...values,
            updated_at: new Date().toISOString(),
          })
          .eq('id', customer.id);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Profile updated successfully',
        });
      } else {
        // Create new customer profile
        const { error } = await supabase
          .from('customers')
          .insert([{
            ...values,
            user_id: user.id,
            status: 'Active',
          }]);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Profile created successfully',
        });
      }
      setEditing(false);
      setRefreshKey(prev => prev + 1);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handlePAQSubmit = async (data: any) => {
    setIsPAQModalOpen(false);
  };

  const handleCancelBooking = (booking: any) => {
    setSelectedBooking(booking);
    setIsCancelModalOpen(true);
  };

  const handleCancellationSubmitted = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleTerminationSuccess = () => {
    setIsTerminationModalOpen(false);
    // Optionally refresh customer data if needed, or rely on the modal's toast for feedback
  };

  const openImageLink = async (fileName: string) => {
    const { data, error } = await supabase
      .storage
      .from('customers')
      .createSignedUrl(fileName, 10);
  
    if (data?.signedUrl) {
      //const fullUrl = `https://pfoargdymscqqrekzref.supabase.co${data.signedUrl}`;
      window.open(data.signedUrl, '_blank');
    } else {
      console.error('Failed to generate signed URL:', error?.message);
    }
  };

  const calculateTotalPaid = () => {
    return payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
  };

  // console.log("loading", loading)
  // console.log("customer", customer)
  // console.log("enrollments", enrollments)
  // console.log("payments", payments)
  // console.log("user", user)
  // console.log("userProfile", userProfile)

  // if (loading) {
  //   return (
  //     <div className="min-h-screen bg-background">
  //       <Navigation />
  //       <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
  //         <Loader2 className="h-8 w-8 animate-spin" />
  //       </div>
  //     </div>
  //   );
  // }

  if (!customer && !editing) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-3xl font-bold mb-4">Complete Your Profile</h1>
            <p className="text-muted-foreground mb-8">
              Please complete your profile to access all features.
            </p>
            <Button onClick={() => setEditing(true)}>
              Complete Profile
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-3xl font-bold">
                {customer ? 'Edit Profile' : 'Complete Profile'}
              </h1>
              {customer && (
                <Button variant="outline" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              )}
            </div>

            <Card className="p-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2">
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
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
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
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
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
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
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
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
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
                  </div>

                  <FormField
                    control={form.control}
                    name="work_mobile"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Work Mobile</FormLabel>
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

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Next of Kin</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="next_of_kin_name"
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
                        name="next_of_kin_relationship"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Relationship</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="next_of_kin_mobile"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Mobile</FormLabel>
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
                            <FormLabel>Phone</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {customer ? 'Updating...' : 'Creating...'}
                      </>
                    ) : (
                      customer ? 'Update Profile' : 'Create Profile'
                    )}
                  </Button>
                </form>
              </Form>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Profile Header */}
          <div className="flex items-start justify-between mb-8">

            <div className="flex items-center gap-6"></div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditing(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
              <Button variant="destructive" onClick={() => setIsTerminationModalOpen(true)} disabled={!!terminationRequest}>
                {!terminationRequest ? "Terminate Account" : `Terminate: ${terminationRequest.status}`}
              </Button>
            </div>
          </div>
          <div className="flex items-start justify-between mb-8">
            <div className="flex items-center gap-6">
              <Avatar className="h-24 w-24">
                <AvatarImage src={userProfile?.avatar_url} alt={userProfile?.full_name} />
                <AvatarFallback>{userProfile?.full_name?.charAt(0) || 'U'}</AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-3xl font-bold">{customer.first_name} {customer.surname}</h1>
                <p className="text-muted-foreground">{customer.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge>Active Member</Badge>
                  <Badge variant="outline">ID: {customer.id.slice(0, 8)}</Badge>
                  <Badge variant="secondary">Credits: {customer.customer_credit}</Badge>

                  {customer.paq_status == 'pending' ?
                    <Badge variant={'destructive'} onClick={() => openImageLink(customer.paq_document_url)}>
                    PAQ FORM: In-Review
                  </Badge>
                    : null}

                  {customer.paq_status == 'accepted' ?
                    <Badge variant={'default'}>
                      PAQ FORM: Completed
                    </Badge>
                    : null}

                  {(customer.paq_status == 'rejected' || customer.paq_status == null) ?
                    <Badge variant={'destructive'} onClick={() => setIsPAQModalOpen(true)}>
                      PAQ FORM: {'Not Completed'}
                    </Badge>
                    : null}

                </div>
              </div>
            </div>
          </div>

          {/* Profile Content */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList>
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="sessions">Sessions</TabsTrigger>
              <TabsTrigger value="payments">Payments</TabsTrigger>
            </TabsList>

            <TabsContent value="profile">
              <div className="grid gap-6 md:grid-cols-2">
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Contact Information</h3>
                  <dl className="space-y-4">
                    <div>
                      <dt className="text-sm text-muted-foreground">Email</dt>
                      <dd>{customer.email}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground">Phone</dt>
                      <dd>{customer.contact_no || 'Not provided'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground">Work Mobile</dt>
                      <dd>{customer.work_mobile || 'Not provided'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground">Australian Citizen</dt>
                      <dd>{customer.australian_citizen ? 'Yes' : 'No'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground">Language Other Than English</dt>
                      <dd>{customer.language_other_than_english || 'None'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground">English Proficiency</dt>
                      <dd>{customer.english_proficiency || 'Not specified'}</dd>
                    </div>
                  </dl>
                </Card>

                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Address</h3>
                  <dl className="space-y-4">
                    <div>
                      <dt className="text-sm text-muted-foreground">Street Address</dt>
                      <dd>{customer.street_number} {customer.street_name}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground">Suburb</dt>
                      <dd>{customer.suburb}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground">Post Code</dt>
                      <dd>{customer.post_code}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground">Country of Birth</dt>
                      <dd>{customer.country_of_birth || 'Not provided'}</dd>
                    </div>
                  </dl>
                </Card>

                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Personal Details</h3>
                  <dl className="space-y-4">
                    <div>
                      <dt className="text-sm text-muted-foreground">Date of Birth</dt>
                      <dd>{customer.date_of_birth ? format(new Date(customer.date_of_birth), 'dd/MM/yyyy') : 'Not provided'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground">Country of Birth</dt>
                      <dd>{customer.country_of_birth || 'Not provided'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground">Indigenous Status</dt>
                      <dd>{customer.indigenous_status || 'Not specified'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground">Occupation</dt>
                      <dd>{customer.occupation || 'Not provided'}</dd>
                    </div>
                  </dl>
                </Card>

                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Emergency Contact</h3>
                  <dl className="space-y-4">
                    <div>
                      <dt className="text-sm text-muted-foreground">Name</dt>
                      <dd>{customer.next_of_kin_name || 'Not provided'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground">Relationship</dt>
                      <dd>{customer.next_of_kin_relationship || 'Not provided'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground">Contact</dt>
                      <dd>{customer.next_of_kin_mobile || customer.next_of_kin_phone || 'Not provided'}</dd>
                    </div>
                  </dl>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="sessions">
              <Card>
                <CardHeader>
                  <CardTitle>Enrolled Sessions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-8">
                    {enrollments.map((enrollment) => (
                      <div key={enrollment.id} className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-lg font-semibold">
                              Enrollment #{enrollment.id.slice(0, 8)}
                            </h3>
                            <div className="flex gap-2 mt-1">
                              <Badge variant="outline">
                                {enrollment.enrollment_type}
                              </Badge>
                              <Badge variant={enrollment.status === 'active' ? 'default' : 'secondary'}>
                                {enrollment.status}
                              </Badge>
                              <Badge variant={enrollment.payment_status === 'paid' ? 'default' : 'secondary'}>
                                {enrollment.payment_status}
                              </Badge>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Enrolled on {format(new Date(enrollment.created_at), 'PPP')}
                          </p>
                        </div>

                        <div className="space-y-4">
                          {enrollment.sessions.map((enrollmentSession) => (
                            <Card key={enrollmentSession.id}>
                              <CardContent className="pt-6">
                                <div className="grid gap-4">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <h3 className="font-medium">{enrollmentSession.session?.name}</h3>
                                      <p className="text-sm text-gray-500">
                                        {enrollmentSession.session?.exercise_type?.name}
                                      </p>
                                    </div>
                                    <div className="flex gap-2">
                                      {enrollmentSession.is_free_trial && (
                                        <Badge variant="secondary">Trial</Badge>
                                      )}
                                      {enrollmentSession.enrollment_type === 'partial' && (
                                        <Badge variant="secondary">Partial</Badge>
                                      )}
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                      <p className="text-gray-500">Instructor</p>
                                      <p>{enrollmentSession.session?.instructor?.first_name} {enrollmentSession.session?.instructor?.last_name}</p>
                                    </div>
                                    <div>
                                      <p className="text-gray-500">Venue</p>
                                      <p>{enrollmentSession.session?.venue?.name}</p>
                                    </div>
                                    <div>
                                      <p className="text-gray-500">Schedule</p>
                                      <p>{enrollmentSession.session?.day_of_week} at {enrollmentSession.session?.start_time}</p>
                                    </div>
                                    <div>
                                      <p className="text-gray-500">Booking Date</p>
                                      <p>{format(new Date(enrollmentSession.booking_date), 'PPP')}</p>
                                    </div>
                                  </div>

                                  {enrollmentSession.is_free_trial && enrollmentSession.trial_date && (
                                    <div>
                                      <p className="text-gray-500">Trial Date</p>
                                      <p>{format(new Date(enrollmentSession.trial_date), 'PPP')}</p>
                                    </div>
                                  )}

                                  {enrollmentSession.enrollment_type === 'partial' && enrollmentSession.partial_dates && (
                                    <div>
                                      <p className="text-gray-500">Partial Dates</p>
                                      <div className="flex flex-wrap gap-2 mt-1">
                                        {enrollmentSession.partial_dates.map((date: string, index: number) => (
                                          <Badge key={index} variant="outline">
                                            {format(new Date(date), 'PPP')}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  <div className="flex justify-end mt-2">
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedEnrollmentSession(enrollmentSession);
                                        setCancelModalOpen(true);
                                      }}
                                    >
                                      Cancel Class
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="payments">
              <Card>
                <CardHeader>
                  <CardTitle>Payment History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-8">
                    {enrollments.map((enrollment) => (
                      <div key={enrollment.id} className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-lg font-semibold">
                              Enrollment #{enrollment.id.slice(0, 8)}
                            </h3>
                            <div className="flex gap-2 mt-1">
                              <Badge variant="outline">
                                {enrollment.enrollment_type}
                              </Badge>
                              <Badge variant={enrollment.status === 'active' ? 'default' : 'secondary'}>
                                {enrollment.status}
                              </Badge>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Enrolled on {format(new Date(enrollment.created_at), 'PPP')}
                          </p>
                        </div>

                        {enrollment.payments && enrollment.payments.length > 0 ? (
                          <div className="space-y-4">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Receipt #</TableHead>
                                  <TableHead>Date</TableHead>
                                  <TableHead>Method</TableHead>
                                  <TableHead>Amount</TableHead>
                                  <TableHead>Status</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {enrollment.payments.map((payment) => (
                                  <TableRow key={payment.id}>
                                    <TableCell>{payment.receipt_number}</TableCell>
                                    <TableCell>
                                      {format(new Date(payment.payment_date), 'PPP')}
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant="outline">
                                        {payment.payment_method}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>${payment.amount.toFixed(2)}</TableCell>
                                    <TableCell>
                                      <Badge variant={payment.payment_status === 'paid' ? 'default' : 'secondary'}>
                                        {payment.payment_status}
                                      </Badge>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                            <div className="flex justify-end">
                              <p className="text-sm font-medium">
                                Total Paid: ${enrollment.payments.reduce((sum, payment) => sum + (payment.amount || 0), 0).toFixed(2)}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-4 text-muted-foreground">
                            No payments found for this enrollment
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <CancelBookingModal
        open={isCancelModalOpen}
        onOpenChange={setIsCancelModalOpen}
        booking={selectedBooking}
        onCancel={handleCancellationSubmitted}
      />
      <TerminationModal
        open={isTerminationModalOpen}
        onOpenChange={setIsTerminationModalOpen}
        customerId={customer?.id}
        onTerminationSuccess={handleTerminationSuccess}
      />
      <PAQModal
        open={isPAQModalOpen}
        onOpenChange={setIsPAQModalOpen}
        customerId={customer?.id}
        onCancel={handlePAQSubmit}
      />
      {selectedEnrollmentSession && (
        <CancellationRequestModal
          open={cancelModalOpen}
          onOpenChange={setCancelModalOpen}
          enrollmentSession={selectedEnrollmentSession}
          onSuccess={() => {
            setCancelModalOpen(false);
            setSelectedEnrollmentSession(null);
            // Optionally refresh data here
          }}
        />
      )}
    </div>
  );
}