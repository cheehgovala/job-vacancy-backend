import mongoose from 'mongoose';

const ApplicationSchema = new mongoose.Schema({
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
  applicantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { 
    type: String, 
    enum: ['Pending', 'Pending Assessment', 'Under Review', 'Shortlisted', 'Interview Invited', 'Rejected', 'Hired'], 
    default: 'Pending' 
  },
  matchScore: { type: Number, default: 0 },
  assessmentSessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'AssessmentSession' },
  coverLetter: { type: String },
  resumeUrl: { type: String },
  appliedAt: { type: Date, default: Date.now }
});

// Indexes for faster queries
ApplicationSchema.index({ applicantId: 1 });
ApplicationSchema.index({ jobId: 1 });
ApplicationSchema.index({ jobId: 1, applicantId: 1 }, { unique: true });
ApplicationSchema.index({ matchScore: -1 });

export const Application = mongoose.model('Application', ApplicationSchema);
