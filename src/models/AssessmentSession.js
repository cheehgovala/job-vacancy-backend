import mongoose from 'mongoose';

const AssessmentSessionSchema = new mongoose.Schema({
  applicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', required: true },
  applicantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date },
  isCompleted: { type: Boolean, default: false },
  score: { type: Number, default: null },
  questionOrder: [{ type: mongoose.Schema.Types.ObjectId }], // Or strings depending on how questions are uniquely identified
  
  // Anti-cheating fields
  violationLogs: [{ 
    event: String, 
    timestamp: { type: Date, default: Date.now } 
  }],
  snapshots: [{ type: String }], // Cloudinary URLs
  isFlagged: { type: Boolean, default: false },
  flagReason: { type: String, default: null }
});

export const AssessmentSession = mongoose.model('AssessmentSession', AssessmentSessionSchema);
