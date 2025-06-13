'use client';

import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/client';
import { format } from 'date-fns';
import { Loader2, Calendar, Clock, MapPin } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

declare module 'jspdf' {
    interface jsPDF {
        autoTable: (options: any) => jsPDF;
        lastAutoTable: {
            finalY: number;
        };
    }
}

type Payment = {
    id: string;
    amount: number;
    payment_method: string;
    payment_status: string;
    transaction_id: string | null;
    receipt_number: string;
    payment_date: string;
    notes: string | null;
};

type Enrollment = {
    id: string;
    enrollment_type: string;
    status: string;
    payment_status: string;
    created_at: string;
    customer: {
        first_name: string;
        surname: string;
        email: string;
        contact_no: string;
    };
    payments: Payment[];
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
};

export default function ViewEnrollmentPage() {
  const { id } = useParams<{ id: string }>();
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [enrollmentSessions, setEnrollmentSessions] = useState<EnrollmentSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createBrowserClient();

  useEffect(() => {
    if (!id) return;

    const fetchEnrollment = async () => {
      setIsLoading(true);
      try {
        const { data: enrollmentData, error: enrollmentError } = await supabase
          .from('enrollments')
          .select(`
            *,
            customer:customers(*),
            payments:payments(*)
          `)
          .eq('id', id)
          .single();

        if (enrollmentError) throw enrollmentError;
        setEnrollment(enrollmentData);

        // Fetch enrollment sessions
        const { data: sessionsData, error: sessionsError } = await supabase
          .from('enrollment_sessions')
          .select(`
            *,
            session:sessions(
              *,
              exercise_type:exercise_types(*),
              instructor:instructors(*),
              venue:venues(*)
            )
          `)
          .eq('enrollment_id', id);

        if (sessionsError) throw sessionsError;
        setEnrollmentSessions(sessionsData || []);
      } catch (err) {
        console.error('Error fetching enrollment:', err);
        setError('Failed to load enrollment details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchEnrollment();
  }, [id]);

  const calculateTotalPaid = () => {
    if (!enrollment?.payments) return 0;
    return enrollment.payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
  };

  const exportReceiptToPdf = () => {
    if (!enrollment || !enrollment.payments || enrollment.payments.length === 0) return;

    const latestPayment = enrollment.payments[enrollment.payments.length - 1];
    const doc = new jsPDF();
    let yPos = 20;

    // Header
    doc.setFontSize(20);
    doc.text('Payment Receipt', 105, yPos, { align: 'center' });
    yPos += 20;

    // Receipt Details
    doc.setFontSize(12);
    doc.text('Receipt For:', 10, yPos);
    doc.text(`${enrollment.customer?.first_name} ${enrollment.customer?.surname}`, 10, yPos + 5);
    doc.text(`${enrollment.customer?.email}`, 10, yPos + 10);
    if (enrollment.customer?.contact_no) {
      doc.text(`${enrollment.customer?.contact_no}`, 10, yPos + 15);
    }
    yPos += 25;

    // Payment Details
    doc.text('Payment Details:', 10, yPos);
    doc.text(`Receipt Number: ${latestPayment.receipt_number}`, 10, yPos + 5);
    doc.text(`Payment Method: ${latestPayment.payment_method}`, 10, yPos + 10);
    doc.text(`Payment Date: ${format(new Date(latestPayment.payment_date), 'PPP')}`, 10, yPos + 15);
    yPos += 25;

    // Sessions Table Header
    doc.setFontSize(12);
    doc.text('Enrolled Sessions:', 10, yPos);
    yPos += 10;

    const tableHeaders = ['Session', 'Type', 'Schedule', 'Venue'];
    const tableData = enrollmentSessions.map(session => [
      session.session?.name || '',
      session.is_free_trial ? 'Trial' : session.enrollment_type === 'partial' ? 'Partial' : 'Full',
      `${session.session?.day_of_week} at ${session.session?.start_time}`,
      session.session?.venue?.name || ''
    ]);

    doc.autoTable({
      startY: yPos,
      head: [tableHeaders],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 10 },
      headStyles: { fillColor: [41, 128, 185] }
    });

    // Total Amount
    doc.setFontSize(12);
    doc.text(`Total Amount: $${latestPayment.amount.toFixed(2)}`, 10, doc.lastAutoTable.finalY + 10);

    // Footer
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(10);
    doc.text('Thank you for your business!', 105, pageHeight - 20, { align: 'center' });

    doc.save(`receipt-${latestPayment.receipt_number}.pdf`);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error || !enrollment) {
    return (
      <div className="text-center text-red-500">
        {error || 'Enrollment not found'}
      </div>
    );
  }

  console.log("enrollment", enrollment)
  console.log("enrollmentSessions", enrollmentSessions)

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">
        Enrollment Details (ID: {enrollment.id.slice(0, 8)})
      </h1>

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="payment">Payment History</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Enrollment Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div>
                  <h3 className="font-medium">Customer</h3>
                  <p>{enrollment.customer?.first_name} {enrollment.customer?.surname}</p>
                </div>
                <div>
                  <h3 className="font-medium">Enrollment Type</h3>
                  <p>{enrollment.enrollment_type}</p>
                </div>
                <div>
                  <h3 className="font-medium">Payment</h3>
                  <p>Method: {enrollment.payments[0]?.payment_method}</p>
                  <p>Amount: ${enrollment.payments[0]?.amount}</p>
                  <p>Receipt: {enrollment.payments[0]?.receipt_number}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Enrolled Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {enrollmentSessions.map((enrollmentSession) => (
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
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Payment History</CardTitle>
              <button onClick={() => exportReceiptToPdf()} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Export Latest Receipt</button>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <p className="text-sm text-muted-foreground">Customer:</p>
                  <p className="text-lg font-semibold">
                    {enrollment.customer?.first_name} {enrollment.customer?.surname}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {enrollment.customer?.email}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {enrollment.customer?.contact_no}
                  </p>
                </div>

                <div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Receipt Number</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {enrollment.payments?.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>{payment.receipt_number}</TableCell>
                          <TableCell>
                            {format(new Date(payment.payment_date), 'dd/MM/yyyy HH:mm')}
                          </TableCell>
                          <TableCell className="capitalize">{payment.payment_method}</TableCell>
                          <TableCell>${payment.amount.toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge variant={payment.payment_status === 'completed' ? 'default' : 'secondary'}>
                              {payment.payment_status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between font-medium">
                    <span>Total Paid:</span>
                    <span>${calculateTotalPaid().toFixed(2)}</span>
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-semibold mb-4">Enrolled Sessions</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Session</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Schedule</TableHead>
                        <TableHead>Venue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {enrollmentSessions.map((session) => (
                        <TableRow key={session.id}>
                          <TableCell>{session.session?.name}</TableCell>
                          <TableCell>
                            {session.is_free_trial ? 'Trial' : 
                             session.enrollment_type === 'partial' ? 'Partial' : 'Full'}
                          </TableCell>
                          <TableCell>
                            {session.session?.day_of_week} at {session.session?.start_time}
                          </TableCell>
                          <TableCell>{session.session?.venue?.name}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}