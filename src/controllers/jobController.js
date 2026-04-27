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