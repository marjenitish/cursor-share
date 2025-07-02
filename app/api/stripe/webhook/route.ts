// app/api/stripe/webhook/route.ts
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/email';

// Create a single supabase client for interacting with your database
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY!,)

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// Email notification functions
async function sendEnrollmentNotificationToAdmins(
  enrollment: any,
  enrollmentSessions: any[],
  payment: any,
  customer: any
) {
  try {
    // Fetch admin emails from emailing_list
    const { data: emailingList } = await supabase
      .from('emailing_list')
      .select('enrollments')
      .single();

    const adminEmails = emailingList?.enrollments || [];
    
    if (adminEmails.length === 0) {
      console.log('No admin emails configured for enrollment notifications');
      return;
    }

    const emailSubject = `New Enrollment - ${customer.first_name} ${customer.surname}`;
    const emailHTML = createAdminEnrollmentEmailHTML(enrollment, enrollmentSessions, payment, customer);

    const emailResult = await sendEmail({
      to: adminEmails,
      subject: emailSubject,
      html: emailHTML,
    });

    if (emailResult.success) {
      console.log(`Enrollment notification sent to ${adminEmails.length} admin(s)`);
    } else {
      console.error('Failed to send admin notification:', emailResult.error);
    }
  } catch (error) {
    console.error('Error sending admin notification:', error);
  }
}

async function sendEnrollmentReceiptToCustomer(
  enrollment: any,
  enrollmentSessions: any[],
  payment: any,
  customer: any
) {
  try {
    if (!customer.email) {
      console.log('No customer email available for receipt');
      return;
    }

    const emailSubject = `Enrollment Confirmation - Receipt #${payment.receipt_number}`;
    const emailHTML = createCustomerReceiptEmailHTML(enrollment, enrollmentSessions, payment, customer);

    const emailResult = await sendEmail({
      to: customer.email,
      subject: emailSubject,
      html: emailHTML,
    });

    if (emailResult.success) {
      console.log(`Enrollment receipt sent to customer: ${customer.email}`);
    } else {
      console.error('Failed to send customer receipt:', emailResult.error);
    }
  } catch (error) {
    console.error('Error sending customer receipt:', error);
  }
}

function createAdminEnrollmentEmailHTML(enrollment: any, enrollmentSessions: any[], payment: any, customer: any) {
  const enrollmentDate = new Date(enrollment.created_at).toLocaleDateString();
  const paymentDate = new Date(payment.payment_date).toLocaleDateString();
  
  const sessionsList = enrollmentSessions.map(session => {
    const sessionType = session.enrollment_type === 'trial' ? 'Trial' : 
                       session.enrollment_type === 'partial' ? 'Partial' : 'Full Term';
    const dates = session.trial_date || session.partial_dates?.join(', ') || 'Full term';
    return `<li><strong>${sessionType}:</strong> ${dates}</li>`;
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>New Enrollment - ${customer.first_name} ${customer.surname}</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
        .header h1 { margin: 0; color: #2c3e50; }
        .details { background-color: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 5px; margin-bottom: 20px; }
        .detail-row { margin-bottom: 10px; }
        .label { font-weight: bold; color: #555; }
        .value { color: #333; }
        .sessions { background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .payment { background-color: #e8f5e8; padding: 15px; border-radius: 5px; }
        .footer { margin-top: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 5px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>New Enrollment Received</h1>
          <p>A new enrollment has been completed successfully.</p>
        </div>
        
        <div class="details">
          <h2>Customer Information</h2>
          <div class="detail-row">
            <span class="label">Name:</span>
            <span class="value">${customer.first_name} ${customer.surname}</span>
          </div>
          <div class="detail-row">
            <span class="label">Email:</span>
            <span class="value">${customer.email || 'Not provided'}</span>
          </div>
          <div class="detail-row">
            <span class="label">Contact:</span>
            <span class="value">${customer.contact_no || 'Not provided'}</span>
          </div>
          <div class="detail-row">
            <span class="label">Address:</span>
            <span class="value">${customer.street_number || ''} ${customer.street_name || ''}, ${customer.suburb || ''} ${customer.post_code || ''}</span>
          </div>
        </div>

        <div class="sessions">
          <h2>Enrollment Details</h2>
          <div class="detail-row">
            <span class="label">Enrollment ID:</span>
            <span class="value">${enrollment.id}</span>
          </div>
          <div class="detail-row">
            <span class="label">Enrollment Type:</span>
            <span class="value">${enrollment.enrollment_type}</span>
          </div>
          <div class="detail-row">
            <span class="label">Status:</span>
            <span class="value">${enrollment.status}</span>
          </div>
          <div class="detail-row">
            <span class="label">Enrollment Date:</span>
            <span class="value">${enrollmentDate}</span>
          </div>
          
          <h3>Sessions Enrolled:</h3>
          <ul>
            ${sessionsList}
          </ul>
        </div>

        <div class="payment">
          <h2>Payment Information</h2>
          <div class="detail-row">
            <span class="label">Receipt Number:</span>
            <span class="value">${payment.receipt_number}</span>
          </div>
          <div class="detail-row">
            <span class="label">Amount:</span>
            <span class="value">$${payment.amount.toFixed(2)}</span>
          </div>
          <div class="detail-row">
            <span class="label">Payment Method:</span>
            <span class="value">${payment.payment_method}</span>
          </div>
          <div class="detail-row">
            <span class="label">Transaction ID:</span>
            <span class="value">${payment.transaction_id}</span>
          </div>
          <div class="detail-row">
            <span class="label">Payment Date:</span>
            <span class="value">${paymentDate}</span>
          </div>
        </div>
        
        <div class="footer">
          <p><strong>Enrollment ID:</strong> ${enrollment.id}</p>
          <p><strong>Payment ID:</strong> ${payment.transaction_id}</p>
          <p>This is an automated notification from the Share CRM system.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function createCustomerReceiptEmailHTML(enrollment: any, enrollmentSessions: any[], payment: any, customer: any) {
  const enrollmentDate = new Date(enrollment.created_at).toLocaleDateString();
  const paymentDate = new Date(payment.payment_date).toLocaleDateString();
  
  const sessionsList = enrollmentSessions.map(session => {
    const sessionType = session.enrollment_type === 'trial' ? 'Trial' : 
                       session.enrollment_type === 'partial' ? 'Partial' : 'Full Term';
    const dates = session.trial_date || session.partial_dates?.join(', ') || 'Full term';
    return `<li><strong>${sessionType}:</strong> ${dates}</li>`;
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Enrollment Confirmation - Receipt #${payment.receipt_number}</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #2c3e50; color: white; padding: 20px; border-radius: 5px; margin-bottom: 20px; text-align: center; }
        .header h1 { margin: 0; }
        .details { background-color: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 5px; margin-bottom: 20px; }
        .detail-row { margin-bottom: 10px; }
        .label { font-weight: bold; color: #555; }
        .value { color: #333; }
        .sessions { background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .payment { background-color: #e8f5e8; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .footer { margin-top: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 5px; font-size: 12px; color: #666; text-align: center; }
        .thank-you { text-align: center; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Enrollment Confirmation</h1>
          <p>Thank you for enrolling with Share!</p>
        </div>
        
        <div class="thank-you">
          <h2>Dear ${customer.first_name} ${customer.surname},</h2>
          <p>Thank you for your enrollment. Your payment has been processed successfully.</p>
        </div>

        <div class="details">
          <h2>Enrollment Information</h2>
          <div class="detail-row">
            <span class="label">Enrollment ID:</span>
            <span class="value">${enrollment.id}</span>
          </div>
          <div class="detail-row">
            <span class="label">Enrollment Type:</span>
            <span class="value">${enrollment.enrollment_type}</span>
          </div>
          <div class="detail-row">
            <span class="label">Status:</span>
            <span class="value">${enrollment.status}</span>
          </div>
          <div class="detail-row">
            <span class="label">Enrollment Date:</span>
            <span class="value">${enrollmentDate}</span>
          </div>
        </div>

        <div class="sessions">
          <h2>Your Sessions</h2>
          <ul>
            ${sessionsList}
          </ul>
        </div>

        <div class="payment">
          <h2>Payment Receipt</h2>
          <div class="detail-row">
            <span class="label">Receipt Number:</span>
            <span class="value">${payment.receipt_number}</span>
          </div>
          <div class="detail-row">
            <span class="label">Amount Paid:</span>
            <span class="value">$${payment.amount.toFixed(2)}</span>
          </div>
          <div class="detail-row">
            <span class="label">Payment Method:</span>
            <span class="value">${payment.payment_method}</span>
          </div>
          <div class="detail-row">
            <span class="label">Transaction ID:</span>
            <span class="value">${payment.transaction_id}</span>
          </div>
          <div class="detail-row">
            <span class="label">Payment Date:</span>
            <span class="value">${paymentDate}</span>
          </div>
        </div>
        
        <div class="footer">
          <p><strong>Receipt #${payment.receipt_number}</strong></p>
          <p>If you have any questions, please contact our support team.</p>
          <p>Thank you for choosing Share!</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

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

        const paymentData = {
          enrollment_id: enrollment.id,
          amount: paymentIntent.amount/100,
          payment_method: 'stripe',
          payment_status: 'completed',
          transaction_id: paymentIntent.id,
          receipt_number: receiptNumber,
          payment_date: new Date().toISOString(),
          notes: `Payment for enrollment: ${enrollment.id}`,
        };

        const { data: payment, error: paymentError } = await supabase
          .from('payments')
          .insert(paymentData)
          .select()
          .single();

        if (paymentError) throw paymentError;

        // 4. Fetch customer data for email notifications
        const { data: customer, error: customerError } = await supabase
          .from('customers')
          .select('*')
          .eq('id', customerId)
          .single();

        // 5. Send email notifications (wrapped in try-catch to not affect core functionality)
        try {
          if (customerError) {
            console.error('Error fetching customer data:', customerError);
          } else {
            await sendEnrollmentNotificationToAdmins(enrollment, enrollmentSessions, payment, customer);
            await sendEnrollmentReceiptToCustomer(enrollment, enrollmentSessions, payment, customer);
          }
        } catch (emailError) {
          console.error('Email notification failed, but payment processing completed successfully:', emailError);
          // Don't throw the error - payment processing should not be affected by email failures
        }

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