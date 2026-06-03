import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { Job } from './src/models/Job.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const jobs = await Job.find({ title: { $in: ['Software Engineer', 'Data Scientist', 'Systems Administrator'] } });
  jobs.forEach(job => {
    console.log(`Job: ${job.title} | Institution: ${job.institution}`);
  });
  process.exit(0);
}
run();
