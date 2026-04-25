import mongoose from 'mongoose';

const JobSchema = new mongoose.Schema({
  employerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  requirements: [{ type: String }],
  location: { type: String, required: true },
  salary: { type: String, required: true },
  jobType: { 
    type: String, 
    enum: ['Full-Time', 'Part-Time', 'Contract', 'Internship', 'Remote'],
    default: 'Full-Time' 
  },
  experienceLevel: {
    type: String,
    enum: ['Entry-Level', 'Mid-Level', 'Senior-Level', 'Executive']
  },
  category: { type: String },
  applicationDeadline: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

export const Job = mongoose.model('Job', JobSchema);
