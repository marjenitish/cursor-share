'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { createBrowserClient } from '@/lib/supabase/client';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export type EnrollmentSessionData = {
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

type EnrollmentWizardProps = {
    isOpen: boolean;
    onClose: () => void;
    sessions: EnrollmentSessionData[];
    customerId: string;
    paymentMethod: 'cash' | 'cheque';
};

export function EnrollmentWizard({
    isOpen,
    onClose,
    sessions,
    customerId,
    paymentMethod
}: EnrollmentWizardProps) {
    const [currentStep, setCurrentStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const supabase = createBrowserClient();
    const [ createdEnrollment, setCreatedEnrollment ] = useState<any>(null);
    const router = useRouter();

    const handleEnroll = async () => {
        setIsLoading(true);
        setError(null);

        try {
            // Create enrollment record
            const { data: enrollment, error: enrollmentError } = await supabase
                .from('enrollments')
                .insert({
                    customer_id: customerId,
                    enrollment_type: 'direct', // Using 'direct' as per schema constraint
                    status: 'active',
                    payment_status: 'paid'
                })
                .select()
                .single();

            if (enrollmentError) throw enrollmentError;
            setCreatedEnrollment(enrollment);

            // Create enrollment sessions
            const enrollmentSessions = sessions.map(session => ({
                enrollment_id: enrollment.id,
                session_id: session.session_id,
                booking_date: new Date().toISOString().split('T')[0],
                is_free_trial: session.enrollment_type === 'trial',
                trial_date: session.trial_date,
                partial_dates: session.partial_dates,
                enrollment_type: session.enrollment_type
            }));

            const { error: sessionsError } = await supabase
                .from('enrollment_sessions')
                .insert(enrollmentSessions);

            if (sessionsError) throw sessionsError;

            // Create payment record
            const totalAmount = sessions.reduce((sum, session) => sum + session.fee_amount, 0);
            const { error: paymentError } = await supabase
                .from('payments')
                .insert({
                    enrollment_id: enrollment.id,
                    amount: Number(totalAmount.toFixed(2)),
                    payment_method: paymentMethod,
                    payment_status: 'completed',
                    receipt_number: `RCP-${Date.now()}` // Generate a unique receipt number
                });

            if (paymentError) throw paymentError;

            setIsSuccess(true);
            setCurrentStep(2);
        } catch (err) {
            console.error('Error creating enrollment:', err);
            setError('Failed to create enrollment. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        if (isSuccess) {
            // Clear any stored data
            localStorage.removeItem('dashboard_easy_enroll_selected_sessions');
            localStorage.removeItem('dashboard_easy_enroll_selected_exercise_type');
            localStorage.removeItem('dashboard_easy_enroll_selected_customer');
        }
        onClose();
        router.push(`/dashboard/view-enrollment/${createdEnrollment?.id}`);
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>
                        {currentStep === 1 ? 'Confirm Enrollment' : 'Enrollment Complete'}
                    </DialogTitle>
                </DialogHeader>

                {currentStep === 1 ? (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <h3 className="font-medium">Selected Sessions</h3>
                            {sessions.map((session, index) => (
                                <div key={index} className="p-2 bg-gray-50 rounded">
                                    <div className="font-medium">{session.session_details.name}</div>
                                    <div className="text-sm text-gray-500">
                                        {session.enrollment_type === 'trial' ? 'Trial' :
                                            session.enrollment_type === 'partial' ? 'Partial' : 'Full Term'}
                                    </div>
                                    <div className="text-sm">Fee: ${session.fee_amount}</div>
                                </div>
                            ))}
                        </div>

                        <div className="space-y-2">
                            <h3 className="font-medium">Payment Method</h3>
                            <div className="text-sm">
                                {paymentMethod === 'cash' ? 'Cash Payment' : 'Cheque Payment'}
                            </div>
                        </div>

                        {error && (
                            <div className="p-2 bg-red-50 text-red-600 rounded text-sm">
                                {error}
                            </div>
                        )}

                        <div className="flex justify-end space-x-2">
                            <Button
                                variant="outline"
                                onClick={handleClose}
                                disabled={isLoading}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleEnroll}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    'Confirm Enrollment'
                                )}
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex flex-col items-center justify-center py-4">
                            <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
                            <h3 className="text-lg font-medium text-center">
                                Enrollment Successful
                            </h3>
                            <p className="text-sm text-gray-500 text-center mt-2">
                                The customer has been enrolled in all selected sessions.
                            </p>
                        </div>

                        <div className="flex justify-end">
                            <Button onClick={handleClose}>
                                Close
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
} 