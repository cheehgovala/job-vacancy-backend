import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  pool: true,
  maxConnections: 3,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 15000
});

async function testSend() {
  try {
    console.log('Sending email...');
    const info = await transporter.sendMail({
      from: `"Smart Hire Malawi" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER, // sending to self
      subject: 'Test Email',
      html: '<p>Test</p>'
    });
    console.log('Success:', info.response);
  } catch (error) {
    console.error('Error sending email:', error.message, error);
  }
  process.exit();
}

testSend();
