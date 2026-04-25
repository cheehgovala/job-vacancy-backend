import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  try {
    console.log('Connecting to:', process.env.MONGODB_URI);
    await mongoose.connect(process.env.MONGODB_URI || '');
    console.log('Connected!');
    process.exit(0);
  } catch (e) {
    console.error('ERROR DETAILS:');
    console.error(e);
    process.exit(1);
  }
}
run();
