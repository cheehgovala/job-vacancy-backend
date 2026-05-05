import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const JobSchema = new mongoose.Schema({
  title: String,
  jobType: String,
  experienceLevel: String,
  category: String
}, { strict: false });

const Job = mongoose.model('Job', JobSchema);

async function migrate() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const jobs = await Job.find({});
  console.log(`Found ${jobs.length} jobs. Migrating...`);

  let updatedCount = 0;
  for (const job of jobs) {
    let needsUpdate = false;
    
    // Normalize jobType
    if (job.jobType === 'Full-Time') { job.jobType = 'Full-time'; needsUpdate = true; }
    if (job.jobType === 'Part-Time') { job.jobType = 'Part-time'; needsUpdate = true; }
    
    // Normalize experienceLevel
    if (job.experienceLevel === 'Entry-Level') { job.experienceLevel = 'Entry Level'; needsUpdate = true; }
    if (job.experienceLevel === 'Mid-Level') { job.experienceLevel = 'Mid Level'; needsUpdate = true; }
    if (job.experienceLevel === 'Senior-Level') { job.experienceLevel = 'Senior'; needsUpdate = true; }
    
    if (needsUpdate) {
      await job.save();
      updatedCount++;
    }
  }

  console.log(`Migration complete. Updated ${updatedCount} jobs.`);
  process.exit(0);
}

migrate().catch(err => {
  console.error(err);
  process.exit(1);
});
