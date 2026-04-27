import mongoose from 'mongoose';

const ExamSchema = new mongoose.Schema({
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
  title: { type: String, required: true },
  timeLimitMinutes: { type: Number, default: 20 },
  passThreshold: { type: Number, default: 70 },
  questions: [{
    text: { type: String, required: true },
    options: [{ type: String, required: true }],
    correctOptionIndex: { type: Number, required: true }
  }],
  createdAt: { type: Date, default: Date.now }
});

export const Exam = mongoose.model('Exam', ExamSchema);
