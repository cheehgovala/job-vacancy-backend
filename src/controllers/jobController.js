import { Job } from '../models/Job.js';
import { User } from '../models/User.js';

export const createJob = async (req, res) => {
  try {
    const { title, description, requirements, location, salary, jobType, applicationDeadline } = req.body;

    if (salary && salary !== 'Negotiable' && salary !== 'Competitive') {
      const match = salary.match(/MWK (.*) - (.*)/);
      if (match) {
        let minStr = match[1].replace(/,/g, '');
        if (minStr.includes('M')) {
          minStr = parseFloat(minStr.replace('M', '')) * 1000000;
        } else if (minStr.includes('K')) {
          minStr = parseFloat(minStr.replace('K', '')) * 1000;
        }
        const minS = parseInt(minStr, 10);
        if (isNaN(minS) || minS < 90000) {
          return res.status(400).json({ error: 'Minimum salary must be at least 90,000 MWK' });
        }
      }
    }

    if (!applicationDeadline) {
      return res.status(400).json({ error: 'Application deadline is required' });
    }

    const expiresAt = new Date(applicationDeadline);
    expiresAt.setDate(expiresAt.getDate() + 5);

    const job = await Job.create({
      employerId: req.user?.userId,
      title,
      description,
      requirements,
      location,
      salary,
      jobType,
      applicationDeadline,
      expiresAt
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
    if (user.savedJobs.some(id => id.toString() === jobId)) {
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

export const getEmployerJobs = async (req, res) => {
  try {
    const jobs = await Job.find({ employerId: req.user?.userId }).sort({ createdAt: -1 });
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.employerId.toString() !== req.user?.userId.toString()) {
      return res.status(403).json({ error: 'Not authorized to update this job' });
    }

    const { salary, applicationDeadline } = req.body;
    
    if (applicationDeadline) {
      const expiresAt = new Date(applicationDeadline);
      expiresAt.setDate(expiresAt.getDate() + 5);
      req.body.expiresAt = expiresAt;
    }

    if (salary && salary !== 'Negotiable' && salary !== 'Competitive') {
      const match = salary.match(/MWK (.*) - (.*)/);
      if (match) {
        let minStr = match[1].replace(/,/g, '');
        if (minStr.includes('M')) {
          minStr = parseFloat(minStr.replace('M', '')) * 1000000;
        } else if (minStr.includes('K')) {
          minStr = parseFloat(minStr.replace('K', '')) * 1000;
        }
        const minS = parseInt(minStr, 10);
        if (isNaN(minS) || minS < 90000) {
          return res.status(400).json({ error: 'Minimum salary must be at least 90,000 MWK' });
        }
      }
    }

    const updatedJob = await Job.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updatedJob);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.employerId.toString() !== req.user?.userId.toString()) {
      return res.status(403).json({ error: 'Not authorized to delete this job' });
    }

    await job.deleteOne();
    res.json({ message: 'Job removed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
