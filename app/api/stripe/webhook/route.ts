// app/api/stripe/webhook/route.ts
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServerClient } from '@supabase/ssr';

import { createClient } from '@supabase/supabase-js'

// Create a single supabase client for interacting with your database
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY!,)

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const signature = headers().get('stripe-signature')!;

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        webhookSecret
      );
    } catch (err: any) {
      return NextResponse.json(
        { error: `Webhook signature verification failed: ${err.message}` },
        { status: 400 }
      );
    }

    switch (event.type) {
      case 'payment_intent.created':
        // Log the creation of a new payment intent
        console.log('Payment intent created:', event.data.object.id);
        break;

      case 'payment_intent.succeeded':
        console.log("payment_intent.succeeded")
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log("paymentIntent", paymentIntent)

        const customerId = paymentIntent.metadata.customerId;
        const enrollmentData = JSON.parse(paymentIntent.metadata.enrollmentData);

        // 1. Create enrollment
        const { data: enrollment, error: enrollmentError } = await supabase
          .from('enrollments')
          .insert({
            customer_id: customerId,
            enrollment_type: 'direct',
            status: 'active',
            payment_status: 'paid',
            payment_intent: paymentIntent.id,
          })
          .select()
          .single();

        if (enrollmentError) throw enrollmentError;

        // 2. Create enrollment sessions
        const enrollmentSessions = enrollmentData.map((session: any) => {
          const baseSession = {
            enrollment_id: enrollment.id,
            session_id: session.id,
            enrollment_type: session.type,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          if (session.type === 'trial') {
            return {
              ...baseSession,
              is_free_trial: true,
              trial_date: new Date(session.dates).toISOString().split('T')[0],
              booking_date: new Date(session.dates).toISOString().split('T')[0]
            };
          } else if (session.type === 'partial') {
            return {
              ...baseSession,
              is_free_trial: false,
              partial_dates: session.dates.split(',').map((date: string) => 
                new Date(date).toISOString().split('T')[0]
              ),
              booking_date: new Date(session.dates.split(',')[0]).toISOString().split('T')[0]
            };
          } else {
            // Full enrollment
            return {
              ...baseSession,
              is_free_trial: false,
              booking_date: new Date().toISOString().split('T')[0]
            };
        }
        });

        const { error: sessionsError } = await supabase
          .from('enrollment_sessions')
          .insert(enrollmentSessions);

        if (sessionsError) throw sessionsError;

        // 3. Create payment record
        const receiptNumber = Math.floor(10000000 + Math.random() * 90000000).toString();

         const { error: paymentError } = await supabase
         .from('payments')
         .insert({
            enrollment_id: enrollment.id,
           amount: paymentIntent.amount/100,
           payment_method: 'stripe',
           payment_status: 'completed',
           transaction_id: paymentIntent.id,
           receipt_number: receiptNumber,
           payment_date: new Date().toISOString(),
            notes: `Payment for enrollment: ${enrollment.id}`,
         });

        if (paymentError) throw paymentError;
        break;

      case 'payment_intent.payment_failed':
        console.log('payment_intent.payment_failed event received')
        break;

      case 'payment_intent.canceled':
        const canceledPayment = event.data.object as Stripe.PaymentIntent;

        // Update enrollment status to cancelled
        const { error: cancelError } = await supabase
          .from('enrollments')
          .update({
            payment_status: 'cancelled',
            status: 'cancelled',
            updated_at: new Date().toISOString(),
          })
          .eq('id', canceledPayment.metadata.enrollmentId);

        if (cancelError) throw cancelError;
        break;

      case 'payment_intent.requires_action':
        console.log('payment_intent.requires_action event received')
        break;

      case 'charge.refunded':
        console.log('charge.refunded event received')
        break;

      case 'charge.dispute.created':
        console.log('charge.dispute.created event received')
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}