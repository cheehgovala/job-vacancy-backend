/**
 * Email utility using Brevo (formerly Sendinblue) REST API.
 * Uses native fetch — no npm package needed.
 * Works on Render free tier (HTTP, not SMTP — no port blocking).
 *
 * Setup:
 * 1. Go to https://app.brevo.com → sign up free (300 emails/day)
 * 2. Settings → SMTP & API → API Keys → Generate a new API key
 * 3. Add to Render environment: BREVO_API_KEY=your_key_here
 * 4. Add to Render environment: EMAIL_FROM=fredkaude@gmail.com
 *    (must be a verified sender in Brevo: Settings → Senders & IPs → Add sender)
 */

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

const sendEmail = async (to, subject, html) => {
  const apiKey = process.env.BREVO_API_KEY;
  const fromEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER;
  const fromName = 'Smart Hire Malawi';

  if (!apiKey) {
    console.error('[Email] BREVO_API_KEY is not set — email not sent to', to);
    return false;
  }

  if (!fromEmail) {
    console.error('[Email] EMAIL_FROM is not set — email not sent to', to);
    return false;
  }

  try {
    const response = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: fromName, email: fromEmail },
        to: [{ email: to }],
        subject,
        htmlContent: html
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`[Email] ✅ Sent to ${to} — messageId: ${data.messageId}`);
      return true;
    } else {
      const err = await response.json();
      console.error(`[Email] ❌ Brevo API error for ${to}:`, JSON.stringify(err));
      return false;
    }
  } catch (error) {
    console.error(`[Email] ❌ Network error sending to ${to}:`, error.message);
    return false;
  }
};

export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const sendOTPEmail = (email, otp) => sendEmail(
  email,
  'Smart Hire Malawi — Your Verification Code',
  `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e1e4e8; border-radius: 8px; overflow: hidden;">
    <div style="background-color: #4F46E5; padding: 24px 20px; text-align: center;">
      <h2 style="color: #ffffff; margin: 0; font-size: 20px;">Smart Hire Malawi</h2>
    </div>
    <div style="padding: 32px 24px; text-align: center;">
      <h3 style="color: #111827; margin: 0 0 12px;">Verify Your Email Address</h3>
      <p style="color: #4b5563; font-size: 15px; margin: 0 0 24px;">Use the code below to complete your registration. It expires in <strong>10 minutes</strong>.</p>
      <div style="background-color: #f3f4f6; display: inline-block; margin: 0 auto 24px; padding: 20px 40px; border-radius: 8px;">
        <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #4F46E5;">${otp}</span>
      </div>
      <p style="color: #9ca3af; font-size: 13px; margin: 0;">If you did not request this, please ignore this email.</p>
    </div>
  </div>
  `
);

export const sendShortlistEmail = (email, jobTitle, applicantName) => sendEmail(
  email,
  `Congratulations! You have been shortlisted for ${jobTitle}`,
  `
  <div style="font-family: Arial, sans-serif; text-align: center; max-width: 600px; margin: 0 auto; border: 1px solid #e1e4e8; border-radius: 8px; padding: 20px;">
    <h2 style="color: #4F46E5;">Good News, ${applicantName}!</h2>
    <p style="color: #4b5563; font-size: 16px;">Your application for <strong>${jobTitle}</strong> has been shortlisted.</p>
    <div style="background-color: #f0fdf4; margin: 20px 0; padding: 20px; border-radius: 8px; border: 1px solid #bbf7d0;">
      <p style="font-size: 15px; color: #166534;">The employer will be reaching out to you soon with next steps. Keep an eye on your inbox!</p>
    </div>
    <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
    <p style="color: #9ca3af; font-size: 12px;">Best regards,<br/>The Smart Hire Malawi Team</p>
  </div>
  `
);

export const sendRejectionEmail = (email, jobTitle, applicantName) => sendEmail(
  email,
  `Your Application for ${jobTitle} — Update from Smart Hire Malawi`,
  `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e1e4e8; border-radius: 12px; overflow: hidden;">
    <div style="background-color: #4F46E5; padding: 30px 20px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 22px;">Smart Hire Malawi</h1>
      <p style="color: #c7d2fe; margin: 6px 0 0; font-size: 13px;">Connecting Talent with Opportunity</p>
    </div>
    <div style="padding: 32px 28px; background-color: #ffffff;">
      <p style="color: #374151; font-size: 16px; margin: 0 0 12px;">Dear <strong>${applicantName}</strong>,</p>
      <p style="color: #4b5563; font-size: 15px; line-height: 1.7; margin: 0 0 16px;">
        Thank you for applying for the <strong>${jobTitle}</strong> position through Smart Hire Malawi.
      </p>
      <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; border-radius: 8px; padding: 18px 20px; margin: 20px 0;">
        <p style="color: #991b1b; font-size: 15px; margin: 0; font-weight: 600;">Application Outcome</p>
        <p style="color: #b91c1c; font-size: 14px; margin: 8px 0 0; line-height: 1.6;">
          After careful review, we regret to inform you that your application for <strong>${jobTitle}</strong> has not been successful at this time.
        </p>
      </div>
      <div style="background-color: #f0fdf4; border-left: 4px solid #22c55e; border-radius: 8px; padding: 18px 20px; margin: 20px 0;">
        <p style="color: #15803d; font-size: 15px; margin: 0; font-weight: 600;">Keep Going — Your Opportunity Is Ahead</p>
        <ul style="color: #166534; font-size: 14px; margin: 10px 0 0; padding-left: 18px; line-height: 2;">
          <li>Complete all sections of your CV to boost your profile score above 80%.</li>
          <li>Add more relevant skills and certifications matching your target roles.</li>
          <li>Take platform assessments to demonstrate your expertise to employers.</li>
          <li>Apply to more listings — every application brings you closer.</li>
          <li>Stay persistent — many successful professionals faced rejection before landing their dream role.</li>
        </ul>
      </div>
      <p style="color: #4b5563; font-size: 14px; margin: 16px 0 0;">Wishing you all the best in your job search journey.</p>
    </div>
    <div style="background-color: #f9fafb; padding: 20px 28px; border-top: 1px solid #e5e7eb; text-align: center;">
      <p style="color: #4F46E5; font-size: 14px; font-weight: bold; margin: 0;">The Smart Hire Malawi Team</p>
      <p style="color: #9ca3af; font-size: 11px; margin: 8px 0 0;">This is an automated message. Please do not reply directly to this email.</p>
    </div>
  </div>
  `
);
