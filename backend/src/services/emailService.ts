// Email Service for Document Signature App
// Uses Resend for email delivery

interface SigningNotificationData {
  signerEmail?: string;
  signerName: string;
  documentTitle: string;
  signingUrl: string;
  expiresAt?: string;
}

interface SignedNotificationData {
  ownerEmail: string;
  ownerName: string;
  documentTitle: string;
  signedAt: string;
}

interface RejectedNotificationData {
  ownerEmail: string;
  ownerName: string;
  documentTitle: string;
  rejectedAt: string;
  reason?: string;
}

// Initialize Resend
let resend: any = null;

async function initResend() {
  if (resend) return resend;
  
  try {
    const { Resend } = await import('resend');
    
    if (process.env.RESEND_API_KEY) {
      resend = new Resend(process.env.RESEND_API_KEY);
      console.log('✅ Resend initialized');
    } else {
      console.log('⚠️ RESEND_API_KEY not set - emails will be logged only');
    }
  } catch (error) {
    console.error('Failed to load Resend:', error);
  }
  
  return resend;
}

/**
 * Send email notification via Resend
 */
async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  await initResend();
  
  try {
    if (process.env.RESEND_API_KEY && resend) {
      // Send real email via Resend
      const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
      
      const { data, error } = await resend.emails.send({
        from: fromEmail,
        to: [to],
        subject: subject,
        html: html,
      });
      
      if (error) {
        console.error('❌ Resend error:', error);
        return false;
      }
      
      console.log(`✅ Email sent to: ${to}, ID: ${data?.id}`);
      return true;
    } else {
      // Development mode - log the email
      console.log('📧 [DEV] Email would be sent:');
      console.log(`   To: ${to}`);
      console.log(`   Subject: ${subject}`);
      return true;
    }
  } catch (error: any) {
    console.error('❌ Email sending failed:', error.message);
    return false;
  }
}

/**
 * Send signing notification to signer
 */
export async function sendSigningRequest(data: SigningNotificationData): Promise<boolean> {
  const subject = `Please sign: ${data.documentTitle}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">You have been requested to sign a document</h2>
      <p>Hello ${data.signerName},</p>
      <p>You have been asked to sign the following document:</p>
      <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <strong>Document:</strong> ${data.documentTitle}
      </div>
      ${data.expiresAt ? `<p style="color: #dc2626;"><strong>Note:</strong> This link expires on ${new Date(data.expiresAt).toLocaleDateString()}</p>` : ''}
      <a href="${data.signingUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 16px 0;">
        Review and Sign Document
      </a>
      <p style="color: #6b7280; font-size: 14px;">
        If you did not expect this email, you can safely ignore it.
      </p>
    </div>
  `;

  if (data.signerEmail) {
    return sendEmail(data.signerEmail, subject, html);
  }
  
  console.log('📧 Signing request notification (no email provided):', data);
  return true;
}

/**
 * Send notification to document owner when signed
 */
export async function sendSignedNotification(data: SignedNotificationData): Promise<boolean> {
  const subject = `✅ Document Signed: ${data.documentTitle}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #16a34a;">Document Signed Successfully!</h2>
      <p>Hello ${data.ownerName},</p>
      <p>Great news! Your document has been signed.</p>
      <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <strong>Document:</strong> ${data.documentTitle}<br>
        <strong>Signed At:</strong> ${new Date(data.signedAt).toLocaleString()}
      </div>
      <p>You can now download the signed PDF from your dashboard.</p>
      <p style="color: #6b7280; font-size: 14px;">
        This is an automated notification from PDF Sign App.
      </p>
    </div>
  `;

  return sendEmail(data.ownerEmail, subject, html);
}

/**
 * Send notification to document owner when rejected
 */
export async function sendRejectedNotification(data: RejectedNotificationData): Promise<boolean> {
  const subject = `❌ Document Declined: ${data.documentTitle}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #dc2626;">Document Declined</h2>
      <p>Hello ${data.ownerName},</p>
      <p>Unfortunately, the signer has declined to sign your document.</p>
      <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <strong>Document:</strong> ${data.documentTitle}<br>
        <strong>Declined At:</strong> ${new Date(data.rejectedAt).toLocaleString()}
        ${data.reason ? `<br><strong>Reason:</strong> ${data.reason}` : ''}
      </div>
      <p>You may want to follow up with the signer or create a new signing request.</p>
      <p style="color: #6b7280; font-size: 14px;">
        This is an automated notification from PDF Sign App.
      </p>
    </div>
  `;

  return sendEmail(data.ownerEmail, subject, html);
}
