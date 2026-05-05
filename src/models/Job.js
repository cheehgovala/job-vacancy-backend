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
    enum: ['Full-time', 'Part-time', 'Contract', 'Internship', 'Remote'],
    default: 'Full-time' 
  },
  experienceLevel: {
    type: String,
    enum: ['Entry Level', 'Mid Level', 'Senior', 'Executive']
  },
  category: { 
    type: String,
    enum: ['Technology', 'Design', 'Finance', 'Telecommunications', 'Other']
  },
  applicationDeadline: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, expires: 0 }
});

export const Job = mongoose.model('Job', JobSchema);
