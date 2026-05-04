import { Application } from '../models/Application.js';
import { Job } from '../models/Job.js';
import { User } from '../models/User.js';
import { sendShortlistEmail } from '../utils/emailUtils.js';

const calculateProfileMatch = (job, user) => {
  let score = 0;
  const profile = user.seekerProfile || {};
  
  // 1. Skills match (up to 50 points)
  const jobReqs = job.requirements || [];
  const userSkills = profile.skills || [];
  if (jobReqs.length > 0) {
    const matchedSkills = jobReqs.filter(req => 
      userSkills.some(skill => skill.toLowerCase().includes(req.toLowerCase()))
    );
    score += (matchedSkills.length / jobReqs.length) * 50;
  } else {
    score += 50; // no specific skill requirements
  }
   
  // 2. Experience level Match (up to 50 points)
  // Simplified matching: if entry-level required, everyone gets 50
  // if senior, we check if they have multiple experience entries
  const numJobs = (profile.experience || []).length;
  if (job.experienceLevel === 'Executive' && numJobs > 4) score += 50;
  else if (job.experienceLevel === 'Senior-Level' && numJobs >= 3) score += 50;
  else if (job.experienceLevel === 'Mid-Level' && numJobs >= 1) score += 50;
  else if (job.experienceLevel === 'Entry-Level') score += 50;
  else score += 25; // Default partial points
  
  return Math.min(100, Math.round(score));
};

import { Exam } from '../models/Exam.js';

export const applyToJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const user = await User.findById(userId);
    if (!user?.hasActiveSubscription) {
      res.status(403).json({ error: 'Active subscription required to apply for jobs' });
      return;
    }

    const job = await Job.findById(jobId);
    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    const existingApplication = await Application.findOne({ jobId, applicantId: userId });
    if (existingApplication) {
      res.status(400).json({ error: 'You have already applied for this job' });
      return;
    }

    // Automatically ensure an Exam exists for this Job (Fallback logic)
    let exam = await Exam.findOne({ jobId });
    if (!exam) {
      exam = await Exam.create({
        jobId,
        title: job.title + ' Assessment',
        timeLimitMinutes: 20,
        passThreshold: 70,
        questions: [
          {
            text: "What is the primary difference between state and props in React?",
            options: [
              "State is meant to be passed down; props are meant to be updated",
              "State is private to a component; props are arguments passed to it",
              "They are completely identical concepts",
              "State handles CSS; props handle HTML"
            ],
            correctOptionIndex: 1
          },
          {
            text: "Which hook should you use to perform side effects in a function component?",
            options: ["useContext", "useState", "useEffect", "useReducer"],
            correctOptionIndex: 2
          },
          {
            text: "What does JSX stand for?",
            options: [
              "JavaScript XML",
              "Java Standard Extension",
              "JavaScript Syntax Extension",
              "JSON Syntax Extension"
            ],
            correctOptionIndex: 0
          }
        ]
      });
    }

    const matchScoreBase = calculateProfileMatch(job, user);

    const application = await Application.create({
      jobId,
      applicantId: userId,
      status: 'Pending Assessment',
      matchScore: matchScoreBase
    });

    res.status(201).json({ message: 'Application submitted perfectly', application });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getMyApplications = async (req, res) => {
  try {
    const applications = await Application.find({ applicantId: req.user?.userId })
      .populate({
        path: 'jobId',
        select: 'title location salary employerId',
        populate: { path: 'employerId', select: 'employerProfile.companyName' }
      })
      .populate('assessmentSessionId', 'isCompleted score');
    res.json(applications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getJobApplications = async (req, res) => {
  try {
    const { jobId } = req.params;
    
    const job = await Job.findById(jobId);
    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    if (job.employerId.toString() !== req.user?.userId) {
      res.status(403).json({ error: 'Not authorized to view these applications' });
      return;
    }

    const applications = await Application.find({ jobId })
      .populate('applicantId', 'email seekerProfile')
      .sort({ matchScore: -1 });
      
    res.json(applications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateApplicationStatus = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { status } = req.body;

    const application = await Application.findById(applicationId).populate('jobId').populate('applicantId');
    if (!application) {
      res.status(404).json({ error: 'Application not found' });
      return;
    }
    
    const job = application.jobId;
    if (job.employerId.toString() !== req.user?.userId) {
      res.status(403).json({ error: 'Not authorized to update this application' });
      return;
    }

    application.status = status;
    await application.save();

    if (status === 'Shortlisted' && application.applicantId?.email) {
      const applicantName = application.applicantId.seekerProfile?.firstName || 'Applicant';
      // send email in background
      sendShortlistEmail(application.applicantId.email, job.title, applicantName);
    }

    res.json({ message: 'Application status updated successfully', application });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getEmployerApplications = async (req, res) => {
  try {
    const employerId = req.user?.userId;
    // Find all jobs by this employer
    const jobs = await Job.find({ employerId }).select('_id');
    const jobIds = jobs.map(j => j._id);
    
    // Find applications for all these jobs
    const applications = await Application.find({ jobId: { $in: jobIds } })
      .populate('applicantId', 'name email profilePicture seekerProfile')
      .populate('jobId', 'title')
      .populate('assessmentSessionId', 'score isCompleted isFlagged flagReason')
      .sort({ appliedAt: -1 });
      
    res.json(applications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
