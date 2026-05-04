import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  password: { type: String },
  role: { type: String, enum: ['seeker', 'employer'], required: true },
  isVerified: { type: Boolean, default: false },
  documentStatus: { type: String, enum: ['Pending', 'Verified', 'Rejected'], default: 'Pending' },
  otp: { type: String },
  otpExpiry: { type: Date },
  hasActiveSubscription: { type: Boolean, default: false },
  subscriptionPlan: { type: String },
  subscriptionExpiry: { type: Date },
  savedJobs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Job' }],
  profilePicture: { type: String },
  seekerProfile: {
    personal: {
      fullName: String,
      title: String,
      bio: String,
      location: String,
      nationalIdUrl: String
    },
     resume: String,
    skills: [{ type: String }],
    experience: [{
      company: String,
      title: String,
      startDate: Date,
      endDate: Date,
      description: String
    }],
    education: [{
      institution: String,
      degree: String,
      fieldOfStudy: String,
      startDate: Date,
      endDate: Date
    }],
    certifications: [{
      name: String,
      organization: String,
      year: String,
      attachmentUrl: String
    }],
    references: [{
      name: String,
      role: String,
      contact: String
    }],
    completeness: { type: Number, default: 0 }
  },
   employerProfile: {
    companyName: String,
    companyDescription: String,
    companyWebsite: String,
    companyLogo: String
  },
  createdAt: { type: Date, default: Date.now }
});

export const User = mongoose.model('User', UserSchema);
