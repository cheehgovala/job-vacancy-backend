import nodemailer from 'nodemailer';

export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit OTP
};

export const sendOTPEmail = async (email, otp) => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'TalentMw - Verify Your Email',
      html: `
        <div style="font-family: Arial, sans-serif; text-align: center; max-width: 600px; margin: 0 auto; border: 1px solid #e1e4e8; border-radius: 8px; padding: 20px;">
          <h2 style="color: #4F46E5;">Welcome to TalentMw!</h2>
          <p style="color: #4b5563; font-size: 16px;">Thank you for registering. Please use the verification code below to complete your registration.</p>
          <div style="background-color: #f3f4f6; margin: 20px 0; padding: 20px; border-radius: 8px;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #111827;">${otp}</span>
          </div>
          <p style="color: #6b7280; font-size: 14px;">This code will expire in 10 minutes.</p>
          <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="color: #9ca3af; font-size: 12px;">If you did not request this, please ignore this email.</p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent: ' + info.response);
    return true;
  } catch (error) {
    console.error('Error sending OTP email:', error);
    return false;
  }
};

export const sendShortlistEmail = async (email, jobTitle, applicantName) => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: `Congratulations! You have been shortlisted for ${jobTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; text-align: center; max-width: 600px; margin: 0 auto; border: 1px solid #e1e4e8; border-radius: 8px; padding: 20px;">
          <h2 style="color: #4F46E5;">Good News, ${applicantName}!</h2>
          <p style="color: #4b5563; font-size: 16px;">We are excited to let you know that your application for the <strong>${jobTitle}</strong> position has been shortlisted.</p>
          <div style="background-color: #f3f4f6; margin: 20px 0; padding: 20px; border-radius: 8px;">
            <p style="font-size: 16px; color: #111827;">The employer will be reaching out to you soon with next steps. Keep an eye on your inbox!</p>
          </div>
          <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="color: #9ca3af; font-size: 12px;">Best regards,<br/>The TalentMw Team</p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Shortlist Email sent: ' + info.response);
    return true;
  } catch (error) {
    console.error('Error sending Shortlist email:', error);
    return false;
  }
};
