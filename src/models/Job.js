import mongoose from 'mongoose';

const JobSchema = new mongoose.Schema({
  employerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  institution: { type: String, required: true },
  duration: { type: String },
  rolePurpose: { type: String, required: true },
  keyResponsibilities: { type: String, required: true },
  qualifications: { type: String, required: true },
  termsAndConditions: { type: String, required: true },
  submissionEmail: { type: String },
  location: { type: String, required: true },
  jobType: { 
    type: String, 
    enum: ['Full-time', 'Part-time', 'Contract', 'Internship', 'Consultant', 'Remote', 'Other'],
    default: 'Full-time' 
  },
  experienceLevel: {
    type: String,
    enum: ['0-1 Year', '2 Years', '3-4 Years', '5+ Years']
  },
  category: { 
    type: String,
    enum: ['Technology', 'Design', 'Finance', 'Telecommunications', 'Other']
  },
  skills: [{ type: String }],
  description: { type: String }, // optional now
  applicationDeadline: { type: Date, required: true },
  hasAssessment: { type: Boolean, default: false },
  strictRestriction: { type: Boolean, default: false },
  isUpdated: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

// Indexes for faster queries
JobSchema.index({ employerId: 1 });
JobSchema.index({ createdAt: -1 });
JobSchema.index({ applicationDeadline: 1 });
JobSchema.index({ category: 1, jobType: 1 });

export const Job = mongoose.model('Job', JobSchema);
