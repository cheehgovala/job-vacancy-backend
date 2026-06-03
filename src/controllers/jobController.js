import { Job } from '../models/Job.js';
import { User } from '../models/User.js';

export const createJob = async (req, res) => {
  try {
    const { 
      title, institution, jobType, duration, rolePurpose, 
      keyResponsibilities, qualifications, termsAndConditions, submissionEmail,
      description, skills, requirements, location, experienceLevel, category,
      applicationDeadline, hasAssessment, strictRestriction 
    } = req.body;

    let finalDeadline = applicationDeadline;
    if (!finalDeadline) {
      finalDeadline = new Date();
      finalDeadline.setDate(finalDeadline.getDate() + 30); // Default to 30 days
    }

    const job = await Job.create({
      employerId: req.user?.userId,
      title,
      institution,
      jobType: jobType || 'Full-time',
      duration,
      rolePurpose,
      keyResponsibilities,
      qualifications,
      termsAndConditions,
      submissionEmail,
      description,
      skills: skills || requirements, // fallback to requirements for backward compatibility
      location,
      experienceLevel,
      category,
      applicationDeadline: finalDeadline,
      hasAssessment,
      strictRestriction
    });

    res.status(201).json(job);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getAllJobs = async (req, res) => {
  try {
    const jobs = await Job.find()
      .select('-keyResponsibilities -qualifications -termsAndConditions -description')
      .sort({ createdAt: -1 })
      .lean();
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

    const { applicationDeadline } = req.body;

    if (req.body.requirements && !req.body.skills) {
        req.body.skills = req.body.requirements;
    }

    const updatedJob = await Job.findByIdAndUpdate(
      req.params.id,
      { ...req.body, isUpdated: true },
      { new: true }
    );
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
