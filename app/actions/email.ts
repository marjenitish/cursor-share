'use server';

import { createServerClient } from '@/lib/supabase/server';
import { sendEmail, createCustomerProfileEmailHTML } from '@/lib/email';

interface CustomerProfileData {
  id: string;
  first_name: string;
  surname: string;
  email: string;
  contact_no?: string;
  street_number?: string;
  street_name?: string;
  suburb?: string;
  post_code?: string;
  country_of_birth?: string;
  date_of_birth?: string;
  work_mobile?: string;
  occupation?: string;
  next_of_kin_name?: string;
  next_of_kin_relationship?: string;
  next_of_kin_mobile?: string;
  next_of_kin_phone?: string;
  created_at: string;
  updated_at: string;
}

export async function sendCustomerProfileNotification(
  customerData: CustomerProfileData,
  action: 'created' | 'updated'
) {
  try {
    const supabase = createServerClient();

    // Fetch admin emails from emailing_list table
    const { data: emailingList, error: emailingError } = await supabase
      .from('emailing_list')
      .select('customer_profile_updates')
      .single();

    if (emailingError) {
      console.error('Error fetching emailing list:', emailingError);
      return { success: false, error: 'Failed to fetch admin emails' };
    }

    const adminEmails = emailingList?.customer_profile_updates || [];
    
    if (adminEmails.length === 0) {
      console.log('No admin emails configured for customer profile updates');
      return { success: true, message: 'No admin emails configured' };
    }

    const emailSubject = `Customer Profile ${action === 'created' ? 'Created' : 'Updated'}`;
    const emailHTML = createCustomerProfileEmailHTML(customerData, action);

    // Send email to all admin recipients
    const emailResult = await sendEmail({
      to: adminEmails,
      subject: emailSubject,
      html: emailHTML,
    });

    if (emailResult.success) {
      return { 
        success: true, 
        message: `Email notification sent to ${adminEmails.length} admin(s)`,
        emails: adminEmails,
        messageId: emailResult.messageId
      };
    } else {
      return { 
        success: false, 
        error: `Failed to send email: ${emailResult.error}`,
        emails: adminEmails
      };
    }

  } catch (error) {
    console.error('Error sending customer profile notification:', error);
    return { 
      success: false, 
      error: 'Failed to send notification' 
    };
  }
} 