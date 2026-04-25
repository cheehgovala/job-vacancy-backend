import mongoose from 'mongoose';
import { User } from './src/models/User.js';

const MONGODB_URI = 'mongodb+srv://zolobwayi:zolo1212%40jf@cluster0.nfqf6ub.mongodb.net/job-vacancy?appName=Cluster0';

async function populateDB() {
  try {
    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(MONGODB_URI);
    console.log('Successfully connected to MongoDB Atlas!');

    // Check if user already exists
    const existingUser = await User.findOne({ email: 'test_setup@example.com' });
    if (existingUser) {
        console.log('Test user already exists in Atlas. Your schemas are clearly visible in Atlas now!');
    } else {
        const newUser = new User({
            email: 'test_setup@example.com',
            password: 'hashedpassword123',
            role: 'seeker',
            hasActiveSubscription: false
        });
        await newUser.save();
        console.log('Successfully inserted a test document! Your database and schemas should now be visible in MongoDB Atlas.');
    }

    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error during setup:', error);
    process.exit(1);
  }
}

populateDB();
