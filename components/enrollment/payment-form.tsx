'use client';

import { useState, useEffect } from 'react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CreditCard, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Session } from '@/app/easy-enroll/page';
import type { EnrollmentSessionData } from '@/app/easy-enroll/components/enrollment-wizard';

// Initialize Stripe with publishable key
const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY 
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) 
  : null;

interface CheckoutFormProps {
  selectedClasses: Session[];
  enrollmentSessionsData: EnrollmentSessionData[];
  enrollmentData: any;
  enrollmentId: string;
  onComplete: () => void;
  totalAmount: number;
  customer: any;
}

function CheckoutForm({ selectedClasses, enrollmentSessionsData, enrollmentData, enrollmentId, onComplete, totalAmount, customer }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!stripe || !elements) {
      setError('Payment system is not ready. Please try again.');
      return;
    }

    setLoading(true);

    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        throw submitError;
      }

      const response = await fetch('/api/stripe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Math.round(totalAmount * 100),
          currency: 'aud',
          metadata: {      
            customerId: customer.id,
            enrollmentData: JSON.stringify(enrollmentSessionsData.map(session => ({
              id: session.session_id,
              type: session.enrollment_type,
              dates: session.enrollment_type === 'trial' ? session.trial_date :
                     session.enrollment_type === 'partial' ? session.partial_dates?.join(',') : 'full',
              fee: session.fee_amount
            })))
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to initialize payment');
      }

      const { clientSecret } = await response.json();

      const { error: confirmError } = await stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/enrollment/confirmation`,
        },
        redirect: 'if_required',
      });

      if (confirmError) {
        throw confirmError;
      }

      toast({
        title: 'Payment successful',
        description: 'Your enrollment is complete!',
      });
      onComplete();
    } catch (err: any) {
      setError(err.message);
      toast({
        title: 'Payment failed',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      {error && (
        <div className="text-sm text-destructive">{error}</div>
      )}
      <Button 
        type="submit" 
        className="w-full" 
        disabled={!stripe || loading}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <CreditCard className="mr-2 h-4 w-4" />
            Pay Now
          </>
        )}
      </Button>
    </form>
  );
}

type PaymentFormProps = {
    selectedClasses: Session[];
    enrollmentSessionsData: EnrollmentSessionData[];
    enrollmentData: any;
    enrollmentId: string;
    onComplete: () => void;
    customer: any;
};

export function PaymentForm({ 
    selectedClasses, 
    enrollmentSessionsData,
    enrollmentData, 
    enrollmentId, 
    onComplete, 
    customer 
}: PaymentFormProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  // Calculate total amount
  const totalAmount = selectedClasses.reduce((sum, cls) => sum + cls.fee_amount, 0);

  // Only render if we have a positive amount
  if (totalAmount <= 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Payment</h2>
          <p className="text-muted-foreground">
            No payment is required for this enrollment.
          </p>
        </div>
        <Button onClick={onComplete} className="w-full">
          Complete Enrollment
        </Button>
      </div>
    );
  }

  console.log("enrollmentSessionsDataXXX", enrollmentSessionsData);
  console.log("customerxxx", customer);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Payment</h2>
        <p className="text-muted-foreground">
          Complete your enrollment by making the payment.
        </p>
      </div>

      <Card className="p-6">
        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="font-semibold">Selected Classes</h3>
            {selectedClasses.map((cls) => (
              <div key={cls.id} className="flex justify-between items-start border-b pb-3">
                <div>
                  <h4 className="font-medium">{cls.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    {cls.day_of_week} • {cls.start_time}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">${cls.fee_amount.toFixed(2)}</p>
                </div>
              </div>
            ))}
            <div className="flex justify-between items-center pt-2 font-bold">
              <span>Total</span>
              <span>${totalAmount.toFixed(2)}</span>
            </div>
          </div>

          <div className="border-t pt-6">
            {stripePromise && totalAmount > 0 ? (
              <Elements 
                stripe={stripePromise} 
                options={{
                  mode: 'payment',
                  amount: Math.round(totalAmount * 100),
                  currency: 'aud',
                  appearance: {
                    theme: 'stripe',
                    variables: {
                      colorPrimary: '#0066cc',
                      colorBackground: '#ffffff',
                      colorText: '#1a1a1a',
                    },
                  },
                }}
              >
                <CheckoutForm 
                  selectedClasses={selectedClasses}
                  enrollmentSessionsData={enrollmentSessionsData}
                  enrollmentData={enrollmentData}
                  enrollmentId={enrollmentId}
                  onComplete={onComplete}
                  totalAmount={totalAmount}
                  customer={customer}
                />
              </Elements>
            ) : (
              <div className="text-center py-4">
                <p className="text-muted-foreground">Payment system is not available.</p>
              </div>
            )}
          </div>

          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Secure payment powered by Stripe
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}