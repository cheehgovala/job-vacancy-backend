import dotenv from 'dotenv';
dotenv.config();

import { sendOTPEmail } from './src/utils/emailUtils.js';

async function test() {
  console.log('Testing sendOTPEmail with fake email...');
  const success = await sendOTPEmail('fake-invalid-email-123456789@example.com', '123456');
  console.log('Result:', success);
  process.exit();
}

test();
