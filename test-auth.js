import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

import mongoose from 'mongoose';
import { register, verifyOTP, login, forgotPassword, resetPassword } from './src/controllers/authController.js';
import { User } from './src/models/User.js';

const mockRes = () => {
  const res = {};
  res.statusCode = null;
  res.jsonData = null;
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data) => {
    res.jsonData = data;
    return res;
  };
  return res;
};

async function runTests() {
  console.log('\n--- 🚀 INITIALIZING TEST SUITE ---');
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/job-vacancy');
  console.log('✅ Connected to MongoDB.');

  const TEST_EMAIL = 'smart_hire_test_suite@example.com';
  await User.deleteOne({ email: TEST_EMAIL });

  // 1. TEST REGISTRATION
  console.log('\n[1/6] TESTING: User Registration');
  let res = mockRes();
  const startRegister = Date.now();
  await register({
    body: { name: 'Test Suite', email: TEST_EMAIL, phone: '000', password: 'pass', role: 'seeker' }
  }, res);
  console.log(`⏱️  Duration: ${Date.now() - startRegister}ms`);
  
  if (res.statusCode !== 201) throw new Error(`Registration failed: ${JSON.stringify(res.jsonData)}`);
  console.log('✅ Registration returned 201 Created');

  // Extract OTP
  const user = await User.findOne({ email: TEST_EMAIL });
  if (!user || !user.otp) throw new Error('User or OTP not found in database');
  console.log(`✉️  Background OTP created: ${user.otp}`);

  // 2. TEST OTP VERIFICATION
  console.log('\n[2/6] TESTING: OTP Verification');
  res = mockRes();
  const startVerify = Date.now();
  await verifyOTP({ body: { email: TEST_EMAIL, otp: user.otp } }, res);
  console.log(`⏱️  Duration: ${Date.now() - startVerify}ms`);

  if (!res.jsonData.token) throw new Error('Verification failed, no token returned');
  console.log('✅ OTP verified successfully, received JWT Token');

  // 3. TEST LOGIN
  console.log('\n[3/6] TESTING: User Login');
  res = mockRes();
  const startLogin = Date.now();
  await login({ body: { email: TEST_EMAIL, password: 'pass' } }, res);
  console.log(`⏱️  Duration: ${Date.now() - startLogin}ms`);

  if (!res.jsonData.token) throw new Error('Login failed');
  console.log('✅ Login successful');

  // 4. TEST FORGOT PASSWORD
  console.log('\n[4/6] TESTING: Forgot Password');
  res = mockRes();
  const startForgot = Date.now();
  await forgotPassword({ body: { email: TEST_EMAIL } }, res);
  console.log(`⏱️  Duration: ${Date.now() - startForgot}ms`);

  if (res.jsonData.message !== 'OTP sent to your email.') throw new Error('Forgot password failed');
  console.log('✅ Forgot password initiated successfully');

  // Extract Reset OTP
  const userReset = await User.findOne({ email: TEST_EMAIL });
  if (!userReset || !userReset.resetPasswordOtp) throw new Error('Reset OTP not generated');
  console.log(`✉️  Background Reset OTP created: ${userReset.resetPasswordOtp}`);

  // 5. TEST RESET PASSWORD
  console.log('\n[5/6] TESTING: Reset Password');
  res = mockRes();
  const startReset = Date.now();
  await resetPassword({ body: { email: TEST_EMAIL, otp: userReset.resetPasswordOtp, newPassword: 'newpass' } }, res);
  console.log(`⏱️  Duration: ${Date.now() - startReset}ms`);

  if (res.jsonData.message !== 'Password reset successfully') throw new Error('Password reset failed');
  console.log('✅ Password reset successful');

  // 6. TEST LOGIN WITH NEW PASSWORD
  console.log('\n[6/6] TESTING: Login with New Password');
  res = mockRes();
  const startNewLogin = Date.now();
  await login({ body: { email: TEST_EMAIL, password: 'newpass' } }, res);
  console.log(`⏱️  Duration: ${Date.now() - startNewLogin}ms`);

  if (!res.jsonData.token) throw new Error('Login with new password failed');
  console.log('✅ Login with new password successful');

  // CLEANUP
  console.log('\n--- 🧹 CLEANING UP ---');
  await User.deleteOne({ email: TEST_EMAIL });
  console.log('✅ Test user deleted');
  
  console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! 🎉');
  process.exit(0);
}

runTests().catch(err => {
  console.error('\n❌ TEST SUITE FAILED:', err.message);
  process.exit(1);
});
