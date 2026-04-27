import { Job } from '../models/Job.js';
import { User } from '../models/User.js';

export const createJob = async (req, res) => {
  try {
    const { title, description, requirements, location, salary, jobType, applicationDeadline } = req.body;

    const job = await Job.create({
      employerId: req.user?.userId,
      title,
      description,
      requirements,
      location,
      salary,
      jobType,
      applicationDeadline
    });

    res.status(201).json(job);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getAllJobs = async (req, res) => {
  try {
    const jobs = await Job.find().populate('employerId', 'email profilePicture');
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getJobById = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id).populate('employerId', 'email profilePicture');
    if (job) {
      res.json(job);
    } else {
      res.status(404).json({ error: 'Job not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const saveJob = async (req, res) => {
  try {
    const user = await User.findById(req.user?.userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const jobId = req.params.id;
    if (user.savedJobs.includes(jobId)) {
      res.status(400).json({ error: 'Job already saved' });
      return; 
    }

    user.savedJobs.push(jobId);
    await user.save();

    res.json({ message: 'Job saved successfully', savedJobs: user.savedJobs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
