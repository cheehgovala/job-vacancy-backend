import { User } from '../models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { generateOTP, sendOTPEmail } from '../utils/emailUtils.js';

const generateToken = (userId, role) => {
  return jwt.sign({ userId, role }, process.env.JWT_SECRET || 'supersecretjwtkey123', {
    expiresIn: '30d'
  });
};

export const register = async (req, res) => {
  try {
    const { name, email, phone, password, role, personal } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      if (userExists.isVerified) {
        return res.status(400).json({ error: 'User already exists' });
      } else {
        // User exists but is not verified, let them request OTP again implicitly
        const otp = generateOTP();
        const salt = await bcrypt.genSalt(10);
        const hashedOtp = await bcrypt.hash(otp, salt);
        userExists.otp = hashedOtp;
        userExists.otpExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes
        
        await userExists.save();
        await sendOTPEmail(email, otp);
        return res.status(200).json({ message: 'OTP sent to your email. Please verify.', requireOTP: true });
      }
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Generate OTP
    const otp = generateOTP();
    const hashedOtp = await bcrypt.hash(otp, salt);

    const user = await User.create({
      name,
      email,
      phone,
      password: hashedPassword,
      role,
      seekerProfile: role === 'seeker' ? { personal } : undefined,
      isVerified: false,
      otp: hashedOtp,
      otpExpiry: Date.now() + 10 * 60 * 1000 // 10 minutes
    });
    
    if (user) {
      // Send OTP Email
      await sendOTPEmail(email, otp);
      
      res.status(201).json({
        message: 'Registration successful. Please verify your email with the OTP sent to you.',
        requireOTP: true,
        email: user.email
      });
    } else {
      res.status(400).json({ error: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.isVerified) {
      return res.status(400).json({ error: 'User is already verified' });
    }

    if (!user.otp || !user.otpExpiry || Date.now() > user.otpExpiry) {
      return res.status(400).json({ error: 'OTP expired or not found' });
    }
