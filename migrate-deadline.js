import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const JobSchema = new mongoose.Schema({
  title: String,
  applicationDeadline: Date,
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, expires: 0 }
}, { strict: false });

const Job = mongoose.model('Job', JobSchema);

async function migrate() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  // 1. Drop old indexes
  console.log('Dropping old indexes...');
  try {
    const collection = mongoose.connection.collections['jobs'];
    const indexes = await collection.indexes();
    
    // Find the old createdAt index if it exists
    for (const index of indexes) {
      if (index.name === 'createdAt_1' && index.expireAfterSeconds) {
        await collection.dropIndex('createdAt_1');
        console.log('Dropped old createdAt TTL index.');
      }
    }
  } catch (error) {
    console.log('Error checking/dropping indexes:', error.message);
  }

  // 2. Sync new indexes (this will create expiresAt_1)
  console.log('Syncing new indexes...');
  await Job.syncIndexes();
  console.log('New indexes synced.');

  // 3. Backfill missing applicationDeadline and expiresAt
  const jobs = await Job.find({});
  console.log(`Found ${jobs.length} jobs. Checking for missing deadlines...`);

  let updatedCount = 0;
  for (const job of jobs) {
    let needsUpdate = false;
    
    if (!job.applicationDeadline) {
      // Default to 30 days from creation if missing
      const deadline = new Date(job.createdAt || Date.now());
      deadline.setDate(deadline.getDate() + 30);
      job.applicationDeadline = deadline;
      needsUpdate = true;
    }

    if (!job.expiresAt) {
      // Default to applicationDeadline + 5 days
      const expiresAt = new Date(job.applicationDeadline);
      expiresAt.setDate(expiresAt.getDate() + 5);
      job.expiresAt = expiresAt;
      needsUpdate = true;
    }

    if (needsUpdate) {
      await job.save();
      updatedCount++;
    }
  }

  console.log(`Migration complete. Updated ${updatedCount} jobs with deadlines.`);
  process.exit(0);
}

migrate().catch(err => {
  console.error(err);
  process.exit(1);
});
