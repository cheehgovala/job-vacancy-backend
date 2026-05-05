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

    const isMatch = await bcrypt.compare(otp, user.otp);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    // OTP verified successfully
    user.isVerified = true;
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id.toString(), user.role)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credential' });
    }

    if (!user.isVerified) {
      return res.status(403).json({ error: 'Email not verified. Please verify your email first.' });
    }

    if (user.password && (await bcrypt.compare(password, user.password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        hasActiveSubscription: user.hasActiveSubscription,
        token: generateToken(user._id.toString(), user.role)
      });
    } else {
      res.status(401).json({ error: 'Invalid credential' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const otp = generateOTP();
    const salt = await bcrypt.genSalt(10);
    const hashedOtp = await bcrypt.hash(otp, salt);

    user.resetPasswordOtp = hashedOtp;
    user.resetPasswordOtpExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    await sendOTPEmail(email, otp);

    res.json({ message: 'OTP sent to your email.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.resetPasswordOtp || !user.resetPasswordOtpExpiry || Date.now() > user.resetPasswordOtpExpiry) {
      return res.status(400).json({ error: 'OTP expired or not found' });
    }

    const isMatch = await bcrypt.compare(otp, user.resetPasswordOtp);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    
    // Clear OTP fields
    user.resetPasswordOtp = undefined;
    user.resetPasswordOtpExpiry = undefined;
    await user.save();

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user?.userId).select('-password').populate('savedJobs', 'title location');
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateSubscription = async (req, res) => {
  try {
    const { plan, durationDays } = req.body;
    
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + durationDays);

    const user = await User.findByIdAndUpdate(
      req.user?.userId,
      {
        hasActiveSubscription: true,
        subscriptionPlan: plan,
        subscriptionExpiry: expiryDate
      },
      { new: true }
    ).select('-password');

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user?.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.role === 'seeker') {
      const { personal, resume, skills, experience, education, completeness } = req.body;
      user.seekerProfile = {
        ...user.seekerProfile,
        ...req.body,
        personal: personal || user.seekerProfile?.personal
      };

      if (req.body.personal?.nationalIdUrl || (req.body.certifications && req.body.certifications.some(c => c.attachmentUrl))) {
        user.documentStatus = 'Pending';
      }
    } else if (user.role === 'employer') {
      const { companyName, companyDescription, companyWebsite, companyLogo } = req.body;
      user.employerProfile = {
        ...user.employerProfile,
        companyName: companyName !== undefined ? companyName : user.employerProfile?.companyName,
        companyDescription: companyDescription !== undefined ? companyDescription : user.employerProfile?.companyDescription,
        companyWebsite: companyWebsite !== undefined ? companyWebsite : user.employerProfile?.companyWebsite,
        companyLogo: companyLogo !== undefined ? companyLogo : user.employerProfile?.companyLogo,
      };
      
      // Update top-level name if companyName changed (so frontend register maps cleanly to companyName in profile context as well)
      if (companyName) {
         user.name = companyName;
      }
    }

    await user.save();
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const user = await User.findById(req.user?.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const imageUrl = `/uploads/${req.file.filename}`;
    user.profilePicture = imageUrl;

    // Optional: map to employer logo if they are an employer
    if (user.role === 'employer') {
        user.employerProfile = {
           ...user.employerProfile,
           companyLogo: imageUrl
        };
    }

    await user.save();
    
    res.json({
      message: 'Profile picture updated successfully',
      profilePicture: user.profilePicture,
      user
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const verifyUserDocuments = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['Pending', 'Verified', 'Rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status provided. Must be Pending, Verified, or Rejected.' });
    }

    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    targetUser.documentStatus = status;
    await targetUser.save();

    res.json({
      message: `User documents marked as ${status}`,
      user: targetUser
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
