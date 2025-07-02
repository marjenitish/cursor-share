import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

// Create reusable transporter object using SMTP transport
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
};

export async function sendEmail(options: EmailOptions) {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
    };

    const info = await transporter.sendMail(mailOptions);
    
    console.log('Email sent successfully:', {
      messageId: info.messageId,
      to: mailOptions.to,
      subject: mailOptions.subject,
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export function createCustomerProfileEmailHTML(customerData: any, action: 'created' | 'updated') {
  const actionText = action === 'created' ? 'Created' : 'Updated';
  const timestamp = new Date(customerData.updated_at || customerData.created_at).toLocaleString();
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Customer Profile ${actionText}</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
        .header h1 { margin: 0; color: #2c3e50; }
        .details { background-color: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
        .detail-row { margin-bottom: 10px; }
        .label { font-weight: bold; color: #555; }
        .value { color: #333; }
        .footer { margin-top: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 5px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Customer Profile ${actionText}</h1>
          <p>A customer profile has been ${action} in the system.</p>
        </div>
        
        <div class="details">
          <h2>Customer Details</h2>
          
          <div class="detail-row">
            <span class="label">Name:</span>
            <span class="value">${customerData.first_name} ${customerData.surname}</span>
          </div>
          
          <div class="detail-row">
            <span class="label">Email:</span>
            <span class="value">${customerData.email || 'Not provided'}</span>
          </div>
          
          <div class="detail-row">
            <span class="label">Contact Number:</span>
            <span class="value">${customerData.contact_no || 'Not provided'}</span>
          </div>
          
          <div class="detail-row">
            <span class="label">Work Mobile:</span>
            <span class="value">${customerData.work_mobile || 'Not provided'}</span>
          </div>
          
          <div class="detail-row">
            <span class="label">Address:</span>
            <span class="value">${customerData.street_number || ''} ${customerData.street_name || ''}, ${customerData.suburb || ''} ${customerData.post_code || ''}</span>
          </div>
          
          <div class="detail-row">
            <span class="label">Date of Birth:</span>
            <span class="value">${customerData.date_of_birth || 'Not provided'}</span>
          </div>
          
          <div class="detail-row">
            <span class="label">Country of Birth:</span>
            <span class="value">${customerData.country_of_birth || 'Not provided'}</span>
          </div>
          
          <div class="detail-row">
            <span class="label">Occupation:</span>
            <span class="value">${customerData.occupation || 'Not provided'}</span>
          </div>
          
          <div class="detail-row">
            <span class="label">Next of Kin:</span>
            <span class="value">${customerData.next_of_kin_name || 'Not provided'} (${customerData.next_of_kin_relationship || ''})</span>
          </div>
          
          <div class="detail-row">
            <span class="label">Next of Kin Contact:</span>
            <span class="value">${customerData.next_of_kin_mobile || customerData.next_of_kin_phone || 'Not provided'}</span>
          </div>
          
          <div class="detail-row">
            <span class="label">Australian Citizen:</span>
            <span class="value">${customerData.australian_citizen ? 'Yes' : 'No'}</span>
          </div>
          
          <div class="detail-row">
            <span class="label">English Proficiency:</span>
            <span class="value">${customerData.english_proficiency || 'Not specified'}</span>
          </div>
          
          <div class="detail-row">
            <span class="label">Indigenous Status:</span>
            <span class="value">${customerData.indigenous_status || 'Not specified'}</span>
          </div>
          
          <div class="detail-row">
            <span class="label">Reason for Class:</span>
            <span class="value">${customerData.reason_for_class || 'Not provided'}</span>
          </div>
          
          <div class="detail-row">
            <span class="label">How Did You Hear:</span>
            <span class="value">${customerData.how_did_you_hear || 'Not provided'}</span>
          </div>
        </div>
        
        <div class="footer">
          <p><strong>${actionText} at:</strong> ${timestamp}</p>
          <p><strong>Customer ID:</strong> ${customerData.id}</p>
          <p>This is an automated notification from the Share CRM system.</p>
        </div>
      </div>
    </body>
    </html>
  `;
} 