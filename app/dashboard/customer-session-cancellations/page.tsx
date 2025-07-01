'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { createBrowserClient } from '@/lib/supabase/client';
import { format } from 'date-fns';
import { Loader2, Eye, Check, X, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CancellationRequest {
  id: string;
  date: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
  medical_certificate_url: string;
  admin_notes?: string;
}

interface EnrollmentSession {
  id: string;
  enrollment_id: string;
  session_id: string;
  booking_date: string;
  is_free_trial: boolean;
  trial_date: string | null;
  partial_dates: string[] | null;
  enrollment_type: string;
  cancelled_dates: CancellationRequest[];
  session: {
    id: string;
    name: string;
    code: string;
    day_of_week: string;
    start_time: string;
    end_time: string | null;
    fee_amount: number;
    exercise_type: {
      id: string;
      name: string;
    };
    instructor: {
      id: string;
      name: string;
    };
    venue: {
      id: string;
      name: string;
      street_address: string;
      city: string;
    };
  };
  enrollment: {
    id: string;
    customer: {
      id: string;
      first_name: string;
      surname: string;
      email: string;
      contact_no: string;
    };
  };
}

export default function CustomerSessionCancellationsPage() {
  const [enrollmentSessions, setEnrollmentSessions] = useState<EnrollmentSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCancellation, setSelectedCancellation] = useState<{
    enrollmentSession: EnrollmentSession;
    cancellation: CancellationRequest;
  } | null>(null);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const [adminNotes, setAdminNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const supabase = createBrowserClient();
  const { toast } = useToast();

  useEffect(() => {
    fetchCancellationRequests();
  }, []);

  const fetchCancellationRequests = async () => {
    setIsLoading(true);
    try {
              const { data, error } = await supabase
          .from('enrollment_sessions')
          .select(`
            *,
            session:sessions(
              id,
              name,
              code,
              day_of_week,
              start_time,
              end_time,
              fee_amount,
              exercise_type:exercise_types(id, name),
              instructor:instructors(id, name),
              venue:venues(id, name, street_address, city)
            ),
            enrollment:enrollments(
              id,
              customer:customers(id, first_name, surname, email, contact_no)
            )
          `)
        .not('cancelled_dates', 'is', null)
        .not('cancelled_dates', 'eq', '[]');

      if (error) throw error;

      // Filter sessions that have pending cancellation requests
      const sessionsWithCancellations = (data || []).filter((session: EnrollmentSession) => {
        return session.cancelled_dates && 
               session.cancelled_dates.some((cancellation: CancellationRequest) => 
                 cancellation.status === 'pending'
               );
      });

      setEnrollmentSessions(sessionsWithCancellations);
    } catch (error) {
      console.error('Error fetching cancellation requests:', error);
      toast({
        title: 'Error',
        description: 'Failed to load cancellation requests',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = (enrollmentSession: EnrollmentSession, cancellation: CancellationRequest, type: 'approve' | 'reject') => {
    setSelectedCancellation({ enrollmentSession, cancellation });
    setActionType(type);
    setAdminNotes('');
    setIsActionModalOpen(true);
  };

  const handleSubmitAction = async () => {
    if (!selectedCancellation) return;

    setIsSubmitting(true);
    try {
      const { enrollmentSession, cancellation } = selectedCancellation;
      
      // Update the specific cancellation in the cancelled_dates array
      const updatedCancelledDates = enrollmentSession.cancelled_dates.map((c: CancellationRequest) => {
        if (c.date === cancellation.date && c.requested_at === cancellation.requested_at) {
          return {
            ...c,
            status: actionType === 'approve' ? 'approved' : 'rejected',
            admin_notes: adminNotes.trim() || undefined,
            processed_at: new Date().toISOString()
          };
        }
        return c;
      });

      // Update the enrollment session
      const { error } = await supabase
        .from('enrollment_sessions')
        .update({ cancelled_dates: updatedCancelledDates })
        .eq('id', enrollmentSession.id);

      if (error) throw error;

      // If approved, handle credit refund logic here if needed
      if (actionType === 'approve') {
        // TODO: Implement credit refund logic based on enrollment type
        console.log('Cancellation approved - credit refund logic needed');
      }

      toast({
        title: 'Success',
        description: `Cancellation request ${actionType === 'approve' ? 'approved' : 'rejected'} successfully`,
      });

      setIsActionModalOpen(false);
      setSelectedCancellation(null);
      fetchCancellationRequests(); // Refresh the list
    } catch (error) {
      console.error('Error processing cancellation request:', error);
      toast({
        title: 'Error',
        description: 'Failed to process cancellation request',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openMedicalCertificate = (url: string) => {
    window.open(url, '_blank');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'approved':
        return <Badge variant="default">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getEnrollmentTypeLabel = (enrollmentType: string) => {
    switch (enrollmentType) {
      case 'full':
        return 'Full Term';
      case 'partial':
        return 'Partial';
      case 'trial':
        return 'Trial';
      default:
        return enrollmentType;
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Customer Session Cancellation Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {enrollmentSessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No pending cancellation requests found
            </div>
          ) : (
            <div className="space-y-6">
              {enrollmentSessions.map((enrollmentSession) => (
                <Card key={enrollmentSession.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-semibold">
                          {enrollmentSession.session.name} - {enrollmentSession.session.code}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {enrollmentSession.session.exercise_type.name} • {enrollmentSession.session.day_of_week} at {enrollmentSession.session.start_time}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {enrollmentSession.session.venue.name}, {enrollmentSession.session.venue.city}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="outline">
                          {getEnrollmentTypeLabel(enrollmentSession.enrollment_type)}
                        </Badge>
                        <Badge variant="outline">
                          ${enrollmentSession.session.fee_amount}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="font-medium">Customer</p>
                          <p>{enrollmentSession.enrollment.customer.first_name} {enrollmentSession.enrollment.customer.surname}</p>
                          <p className="text-muted-foreground">{enrollmentSession.enrollment.customer.email}</p>
                          <p className="text-muted-foreground">{enrollmentSession.enrollment.customer.contact_no}</p>
                        </div>
                        <div>
                          <p className="font-medium">Instructor</p>
                          <p>{enrollmentSession.session.instructor.name}</p>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium mb-2">Cancellation Requests</h4>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead>Reason</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Requested</TableHead>
                              <TableHead>Medical Certificate</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {enrollmentSession.cancelled_dates
                              .filter((cancellation: CancellationRequest) => cancellation.status === 'pending')
                              .map((cancellation: CancellationRequest, index: number) => (
                                <TableRow key={`${cancellation.date}-${cancellation.requested_at}`}>
                                  <TableCell>
                                    {format(new Date(cancellation.date), 'MMM dd, yyyy')}
                                  </TableCell>
                                  <TableCell>{cancellation.reason}</TableCell>
                                  <TableCell>{getStatusBadge(cancellation.status)}</TableCell>
                                  <TableCell>
                                    {format(new Date(cancellation.requested_at), 'MMM dd, yyyy HH:mm')}
                                  </TableCell>
                                  <TableCell>
                                    {cancellation.medical_certificate_url && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => openMedicalCertificate(cancellation.medical_certificate_url)}
                                      >
                                        <Download className="h-4 w-4 mr-1" />
                                        View
                                      </Button>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        onClick={() => handleAction(enrollmentSession, cancellation, 'approve')}
                                      >
                                        <Check className="h-4 w-4 mr-1" />
                                        Approve
                                      </Button>
                                      <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => handleAction(enrollmentSession, cancellation, 'reject')}
                                      >
                                        <X className="h-4 w-4 mr-1" />
                                        Reject
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Modal */}
      <Dialog open={isActionModalOpen} onOpenChange={setIsActionModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' ? 'Approve' : 'Reject'} Cancellation Request
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedCancellation && (
              <div className="space-y-2">
                <p className="text-sm">
                  <strong>Customer:</strong> {selectedCancellation.enrollmentSession.enrollment.customer.first_name} {selectedCancellation.enrollmentSession.enrollment.customer.surname}
                </p>
                <p className="text-sm">
                  <strong>Session:</strong> {selectedCancellation.enrollmentSession.session.name} - {selectedCancellation.enrollmentSession.session.code}
                </p>
                <p className="text-sm">
                  <strong>Date:</strong> {format(new Date(selectedCancellation.cancellation.date), 'MMM dd, yyyy')}
                </p>
                <p className="text-sm">
                  <strong>Reason:</strong> {selectedCancellation.cancellation.reason}
                </p>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="admin-notes">Admin Notes (Optional)</Label>
              <Textarea
                id="admin-notes"
                placeholder="Add any notes about this decision..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsActionModalOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                variant={actionType === 'approve' ? 'default' : 'destructive'}
                onClick={handleSubmitAction}
                disabled={isSubmitting}
              >
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {actionType === 'approve' ? 'Approve' : 'Reject'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 