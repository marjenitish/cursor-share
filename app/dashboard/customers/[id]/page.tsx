'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, ArrowLeft, User, Calendar, CreditCard, CheckCircle, XCircle, Clock, MapPin, FileText, AlertCircle } from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { PAQProfileForm } from '@/components/profile/paq-profile-form';
import { getDayName } from '@/lib/utils';
import { usePermissions } from '@/components/providers/permission-provider';

export default function CustomerDetailsPage({ params }: { params: { id: string } }) {
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createBrowserClient();


  const { hasPermission } = usePermissions();

  useEffect(() => {
    const fetchCustomerData = async () => {
      try {
        const { data: customerData, error: customerError } = await supabase
          .from('customers')
          .select('*')
          .eq('id', params.id)
          .single();

        if (customerError) throw customerError;
        setCustomer(customerData);

        if (customerData.user_id) {
          const { data: userData } = await supabase
            .from('users')
            .select('*')
            .eq('id', customerData.user_id)
            .single();
          setUserProfile(userData);
        }

        // Step 1: Fetch enrollments for the customer
        const { data: enrollments, error: enrollmentsError } = await supabase
          .from('enrollments')
          .select('id, created_at')
          .eq('customer_id', params.id); // Use params.id here

        if (enrollmentsError) {
          console.error('Error fetching enrollments:', enrollmentsError);
          setBookings([]); // Clear bookings if enrollments fetching failed
          setPayments([]); // Clear payments if enrollments fetching failed
          setLoading(false);
          return;
        }

        const enrollmentIds = enrollments.map((e: any) => e.id);

        // If no enrollments, there are no bookings or payments
        if (enrollmentIds.length === 0) {
          setBookings([]);
          setPayments([]);
          setLoading(false);
          return;
        }

        // Step 2: Fetch bookings using the enrollment IDs


        const { data: bookingsData } = await supabase
          .from('bookings')
          .select(`
            *,
            classes (
              id,
              name,
              venue,
              day_of_week,
              start_time,
              end_time,
              instructors (
                name
              )
            )
          `)
          .in('enrollment_id', enrollmentIds) // Filter by enrollment IDs
          .order('created_at', { ascending: false });

        setBookings(bookingsData || []);

        // Step 3: Fetch payments using the enrollment IDs
        const { data: paymentsData } = await supabase
          .from('payments')
          .select(`
            *,
            enrollments (
              id,
              classes (
                name
              )
            )
          `)
          .in('enrollment_id', enrollmentIds) // Filter by enrollment IDs
          .order('payment_date', { ascending: false });

        setPayments(paymentsData || []);

        // Step 4: Fetch comprehensive history data
        const historyData = [];

        // Add customer registration event
        if (customerData.created_at) {
          historyData.push({
            id: `registration-${customerData.id}`,
            type: 'registration',
            title: 'Customer Registered',
            description: `${customerData.first_name} ${customerData.surname} registered as a customer`,
            date: customerData.created_at,
            icon: User,
            color: 'text-blue-600',
            bgColor: 'bg-blue-50'
          });
        }

        // Add PAQ form completion event
        if (customerData.paq_form) {
          historyData.push({
            id: `paq-${customerData.id}`,
            type: 'paq_form',
            title: 'PAQ Form Completed',
            description: 'Physical Activity Questionnaire form submitted',
            date: customerData.updated_at || customerData.created_at,
            icon: FileText,
            color: 'text-green-600',
            bgColor: 'bg-green-50'
          });
        }

        // Add enrollment events
        if (enrollments && enrollments.length > 0) {
          for (const enrollment of enrollments) {
            historyData.push({
              id: `enrollment-${enrollment.id}`,
              type: 'enrollment',
              title: 'Enrollment Created',
              description: `Enrolled in fitness program`,
              date: enrollment.created_at,
              icon: Calendar,
              color: 'text-purple-600',
              bgColor: 'bg-purple-50',
              enrollmentId: enrollment.id
            });
          }
        }

        // Add booking events
        if (bookingsData && bookingsData.length > 0) {
          for (const booking of bookingsData) {
            const bookingEvent = {
              id: `booking-${booking.id}`,
              type: 'booking',
              title: booking.is_free_trial ? 'Trial Class Booked' : 'Class Booked',
              description: `${booking.classes?.name} at ${booking.classes?.venue}`,
              date: booking.booking_date || booking.created_at,
              icon: CheckCircle,
              color: 'text-green-600',
              bgColor: 'bg-green-50',
              bookingId: booking.id,
              classDetails: booking.classes
            };

            // Add cancellation events if applicable
            if (booking.cancellation_status) {
              const cancellationEvent = {
                id: `cancellation-${booking.id}`,
                type: 'cancellation',
                title: `Class Cancelled (${booking.cancellation_status})`,
                description: booking.cancellation_reason || 'No reason provided',
                date: booking.updated_at || booking.created_at,
                icon: XCircle,
                color: 'text-red-600',
                bgColor: 'bg-red-50',
                bookingId: booking.id,
                classDetails: booking.classes
              };
              historyData.push(cancellationEvent);
            }

            historyData.push(bookingEvent);
          }
        }

        // Add payment events
        if (paymentsData && paymentsData.length > 0) {
          for (const payment of paymentsData) {
            historyData.push({
              id: `payment-${payment.id}`,
              type: 'payment',
              title: `Payment ${payment.payment_status === 'completed' ? 'Completed' : payment.payment_status}`,
              description: `$${payment.amount.toFixed(2)} - Receipt #${payment.receipt_number}`,
              date: payment.payment_date,
              icon: CreditCard,
              color: 'text-emerald-600',
              bgColor: 'bg-emerald-50',
              paymentId: payment.id,
              amount: payment.amount,
              status: payment.payment_status
            });
          }
        }

        // Add attendance events (if available)
        const { data: attendanceData } = await supabase
          .from('enrollment_sessions')
          .select(`
            *,
            enrollments!inner(customer_id),
            classes(name, venue)
          `)
          .eq('enrollments.customer_id', params.id)
          .not('attended', 'is', null);

        if (attendanceData && attendanceData.length > 0) {
          for (const attendance of attendanceData) {
            historyData.push({
              id: `attendance-${attendance.id}`,
              type: 'attendance',
              title: attendance.attended ? 'Class Attended' : 'Class Missed',
              description: `${attendance.classes?.name} at ${attendance.classes?.venue}`,
              date: attendance.session_date,
              icon: attendance.attended ? CheckCircle : XCircle,
              color: attendance.attended ? 'text-green-600' : 'text-red-600',
              bgColor: attendance.attended ? 'bg-green-50' : 'bg-red-50',
              attendanceId: attendance.id,
              attended: attendance.attended
            });
          }
        }

        // Add block/unblock events
        if (customerData.blocked_at) {
          historyData.push({
            id: `block-${customerData.id}`,
            type: 'block',
            title: 'Account Blocked',
            description: customerData.block_note || 'Account blocked by administrator',
            date: customerData.blocked_at,
            icon: AlertCircle,
            color: 'text-red-600',
            bgColor: 'bg-red-50'
          });
        }

        // Sort history by date (newest first)
        historyData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setHistory(historyData);

      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCustomerData();
  }, [params.id]);

  const canRead = hasPermission('customer_read');

  if (!canRead) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">You don't have permission to manage CMS content.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-3xl font-bold mb-4">Customer Not Found</h1>
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Customers
        </Button>
      </div>

      {/* Profile Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-6">
          <Avatar className="h-24 w-24">
            <AvatarImage src={userProfile?.avatar_url} alt={customer.first_name} />
            <AvatarFallback>{customer.first_name?.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold">{customer.first_name} {customer.surname}</h1>
            <p className="text-muted-foreground">{customer.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <Badge>{customer.status}</Badge>
              <Badge variant="outline">ID: {customer.id.slice(0, 8)}</Badge>
              <Badge variant="secondary">Credits: {customer.customer_credit}</Badge>
              <Badge variant={customer.paq_form ? 'default' : 'destructive'}>
                PAQ FORM: {customer.paq_form ? 'Completed' : 'Not Completed'}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Content */}
      <Tabs defaultValue="personal" className="space-y-6">
        <TabsList>
          <TabsTrigger value="personal">Personal Details</TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="personal">
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

        <TabsContent value="bookings">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Your Bookings</h3>
            {bookings.length > 0 ? (
              <div className="space-y-6">
                {bookings.map((booking) => (
                  <div key={booking.id} className="border rounded-lg p-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-2">
                        <h4 className="font-semibold text-lg">{booking.classes?.name}</h4>
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            {getDayName(booking.classes?.day_of_week)}
                          </div>
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            {booking.classes?.start_time} - {booking.classes?.end_time}
                          </div>
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 mr-1" />
                            {booking.classes?.venue}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <Badge variant={booking.is_free_trial ? 'secondary' : 'default'}>
                            {booking.is_free_trial ? 'Trial' : booking.term}
                          </Badge>
                          {booking.booking_date && (
                            <Badge variant="outline">
                              {format(new Date(booking.booking_date), 'dd/MM/yyyy')}
                            </Badge>
                          )}
                          {booking.cancellation_status && (
                            <Badge
                              variant={
                                booking.cancellation_status === 'pending' ? 'secondary' :
                                  booking.cancellation_status === 'accepted' ? 'default' : 'destructive'
                              }
                            >
                              Cancellation: {booking.cancellation_status}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {booking.cancellation_reason && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-sm font-medium">Cancellation Reason:</p>
                        <p className="text-sm text-muted-foreground">{booking.cancellation_reason}</p>
                        {booking.medical_certificate_url && (
                          <div className="mt-2">
                            <a
                              href={booking.medical_certificate_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-primary hover:underline"
                            >
                              View Medical Certificate
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">You don't have any bookings yet.</p>
                <Button className="mt-4" asChild>
                  <a href="/search">Find Classes</a>
                </Button>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Payment History</h3>
            {payments.length > 0 ? (
              <div className="space-y-4">
                {payments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between border-b pb-4">
                    <div>
                      <p className="font-medium">Receipt #{payment.receipt_number}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(payment.payment_date), 'dd/MM/yyyy HH:mm')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {payment.bookings?.classes?.name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">${payment.amount.toFixed(2)}</p>
                      <Badge variant={payment.payment_status === 'completed' ? 'default' : 'secondary'}>
                        {payment.payment_status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No payment records found.</p>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-6">Customer History Timeline</h3>
            {history.length > 0 ? (
              <div className="space-y-6">
                {history.map((event, index) => {
                  const IconComponent = event.icon;
                  return (
                    <div key={event.id} className="relative">
                      {/* Timeline line */}
                      {index < history.length - 1 && (
                        <div className="absolute left-6 top-12 w-0.5 h-16 bg-gray-200" />
                      )}
                      
                      <div className="flex items-start gap-4">
                        {/* Icon */}
                        <div className={`flex-shrink-0 w-12 h-12 rounded-full ${event.bgColor} flex items-center justify-center`}>
                          <IconComponent className={`h-6 w-6 ${event.color}`} />
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-gray-900">{event.title}</h4>
                            <span className="text-sm text-gray-500">
                              {format(new Date(event.date), 'dd/MM/yyyy HH:mm')}
                            </span>
                          </div>
                          
                          <p className="text-gray-600 mb-3">{event.description}</p>
                          
                          {/* Additional details based on event type */}
                          {event.type === 'booking' && event.classDetails && (
                            <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                              <div className="flex items-center text-sm text-gray-600">
                                <Clock className="h-4 w-4 mr-2" />
                                {getDayName(event.classDetails.day_of_week)} {event.classDetails.start_time} - {event.classDetails.end_time}
                              </div>
                              <div className="flex items-center text-sm text-gray-600">
                                <MapPin className="h-4 w-4 mr-2" />
                                {event.classDetails.venue}
                              </div>
                              {event.classDetails.instructors && (
                                <div className="text-sm text-gray-600">
                                  Instructor: {event.classDetails.instructors.name}
                                </div>
                              )}
                            </div>
                          )}
                          
                          {event.type === 'payment' && (
                            <div className="flex items-center gap-2">
                              <Badge variant={event.status === 'completed' ? 'default' : 'secondary'}>
                                {event.status}
                              </Badge>
                              <span className="text-sm font-medium text-gray-700">
                                ${event.amount.toFixed(2)}
                              </span>
                            </div>
                          )}
                          
                          {event.type === 'attendance' && (
                            <Badge variant={event.attended ? 'default' : 'destructive'}>
                              {event.attended ? 'Attended' : 'Missed'}
                            </Badge>
                          )}
                          
                          {event.type === 'cancellation' && event.classDetails && (
                            <div className="bg-red-50 rounded-lg p-3">
                              <div className="flex items-center text-sm text-red-700 mb-1">
                                <AlertCircle className="h-4 w-4 mr-2" />
                                Cancellation Reason
                              </div>
                              <p className="text-sm text-red-600">{event.description}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <Clock className="h-8 w-8 text-gray-400" />
                </div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">No History Available</h4>
                <p className="text-gray-500">This customer doesn't have any activity history yet.</p>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}