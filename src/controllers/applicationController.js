import { Application } from '../models/Application.js';
import { Job } from '../models/Job.js';
import { User } from '../models/User.js';
import { Exam } from '../models/Exam.js';
import { Notification } from '../models/Notification.js';
import { sendShortlistEmail, sendRejectionEmail } from '../utils/emailUtils.js';

import stringSimilarity from 'string-similarity';

const calculateCVCompleteness = (profile) => {
  // Use the completeness score calculated and saved by the CV Builder if it exists
  if (profile.completeness && profile.completeness > 0) {
    return profile.completeness;
  }

  // Fallback calculation for older profiles
  let score = 0;
  const maxScore = 5; 
  
  if (profile.personal?.fullName && (profile.personal?.title || profile.personal?.email)) score += 1;
  if (profile.skills && profile.skills.length > 0) score += 1;
  if (profile.experience && profile.experience.length > 0) score += 1;
  if (profile.education && profile.education.length > 0) score += 1;
  if (profile.resume || (profile.certifications && profile.certifications.length > 0) || (profile.references && profile.references.length > 0)) score += 1;

  return Math.round((score / maxScore) * 100);
};

const calculateProfileMatch = (job, user) => {
  const profile = user.seekerProfile || {};
  
  // 1. CV Completeness (10%)
  const cvCompletenessScore = calculateCVCompleteness(profile);
  
  // 2. Title Match (10%)
  let titleMatchScore = 0;
  const profileTitle = profile.personal?.title || (profile.experience && profile.experience.length > 0 ? profile.experience[0].title : '');
  if (job.title && profileTitle) {
    const similarity = stringSimilarity.compareTwoStrings(job.title.toLowerCase(), profileTitle.toLowerCase());
    titleMatchScore = Math.round(similarity * 100);
  }

  // 3. Skills Match (35%)
  let skillsScore = 0;
  const jobReqs = job.skills && job.skills.length > 0 ? job.skills : (job.requirements || []);
  const userSkills = profile.skills || [];
  if (jobReqs.length > 0) {
    let matchedCount = 0;
    const userSkillsArr = userSkills.length > 0 ? userSkills.map(s => s.toLowerCase()) : [''];
    
    jobReqs.forEach(req => {
       const reqLower = req.toLowerCase();
       const bestMatch = stringSimilarity.findBestMatch(reqLower, userSkillsArr);
       if (bestMatch.bestMatch.rating > 0.6 || userSkills.some(skill => skill.toLowerCase().includes(reqLower))) {
          matchedCount++;
       }
    });
    skillsScore = Math.round((matchedCount / jobReqs.length) * 100);
  } else {
    skillsScore = 100; // if no skills required, give full marks
  }
   
  // 4. Experience Level Match (20%)
  let expScore = 0;
  let totalYearsExp = 0;
  (profile.experience || []).forEach(exp => {
      if (exp.startDate) {
          const start = new Date(exp.startDate);
          const end = exp.endDate ? new Date(exp.endDate) : new Date();
          const diffMs = end - start;
          if (diffMs > 0) {
              totalYearsExp += diffMs / (1000 * 60 * 60 * 24 * 365.25);
          }
      }
  });
  const expLevel = job.experienceLevel || job.experience || '0-1 Year';
  if (expLevel === '5+ Years' && totalYearsExp >= 5) expScore = 100;
  else if (expLevel === '3-4 Years' && totalYearsExp >= 3) expScore = 100;
  else if (expLevel === '2 Years' && totalYearsExp >= 2) expScore = 100;
  else if (expLevel === '0-1 Year') expScore = 100;
  else expScore = 50; // Partial match fallback

  // 5. Final Hybrid Weighting
  let finalScore = 0;
  if (job.hasAssessment) {
     // Max 75 points here. The remaining 25 points are added in assessmentController.js
     finalScore = (skillsScore * 0.35) + (expScore * 0.20) + (cvCompletenessScore * 0.10) + (titleMatchScore * 0.10);
  } else {
     // Scale to 100 points because there is no assessment (multiply weights by 100/75)
     finalScore = (skillsScore * (0.35/0.75)) + (expScore * (0.20/0.75)) + (cvCompletenessScore * (0.10/0.75)) + (titleMatchScore * (0.10/0.75));
  }
  
  return {
    combinedScore: Math.min(100, Math.round(finalScore)),
    cvCompletenessScore,
    skillsScore,
    expScore,
    titleMatchScore
  };
};


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

    if (new Date() > new Date(job.applicationDeadline)) {
      res.status(400).json({ error: 'Due date is over for this job' });
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

    const matchData = calculateProfileMatch(job, user);

    if (matchData.cvCompletenessScore < 65) {
      res.status(400).json({ error: 'Your CV completeness is less than 65%. Please update your profile before applying.' });
      return;
    }

    // Auto-reject if combined match score is below 50%
    // For jobs with assessments, the score is out of 75 at this point (assessment adds 25 later)
    // So the threshold is 37.5 for assessment jobs, 50 for non-assessment jobs
    const autoRejectThreshold = job.hasAssessment ? 37.5 : 50;
    if (matchData.combinedScore < autoRejectThreshold) {
      // Create the application as Rejected immediately
      const rejectedApplication = await Application.create({
        jobId,
        applicantId: userId,
        status: 'Rejected',
        matchScore: matchData.combinedScore
      });

      // Send rejection email in background
      const applicantName = user.seekerProfile?.personal?.fullName || user.name || 'Applicant';
      sendRejectionEmail(user.email, job.title, applicantName);

      // Create in-app notification
      await Notification.create({
        userId,
        title: 'Application Not Successful',
        message: `Your application for ${job.title} did not meet the minimum match score required (50%). Please improve your CV and skills to increase your chances.`,
        type: 'error'
      });

      res.status(400).json({
        error: `Your profile match score (${matchData.combinedScore}%) is below the minimum required 50%. Please update your CV, skills, and experience to improve your match score.`
      });
      return;
    }

    const application = await Application.create({
      jobId,
      applicantId: userId,
      status: job.hasAssessment ? 'Pending Assessment' : 'Applied',
      matchScore: matchData.combinedScore
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
        select: 'title location institution employerId',
        populate: { path: 'employerId', select: 'employerProfile.companyName' }
      })
      .populate({
        path: 'assessmentSessionId',
        select: 'isCompleted score examId',
        populate: { path: 'examId', select: 'passThreshold' }
      });
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

    if (status === 'Shortlisted' && application.status === 'Rejected') {
      res.status(400).json({ error: 'Cannot shortlist a candidate whose application was automatically rejected.' });
      return;
    }

    application.status = status;
    await application.save();

    if (status === 'Shortlisted' && application.applicantId?.email) {
      const applicantName = application.applicantId.seekerProfile?.personal?.fullName || application.applicantId.seekerProfile?.firstName || 'Applicant';
      sendShortlistEmail(application.applicantId.email, job.title, applicantName);
    }

    if (status === 'Rejected' && application.applicantId?.email) {
      const applicantName = application.applicantId.seekerProfile?.personal?.fullName || application.applicantId.seekerProfile?.firstName || 'Applicant';
      sendRejectionEmail(application.applicantId.email, job.title, applicantName);
    }

    // Create In-App Notification
    let notificationTitle = '';
    let notificationMessage = '';
    let notificationType = 'info';

    if (status === 'Shortlisted') {
      notificationTitle = 'Application Shortlisted! 🎉';
      notificationMessage = `Congratulations! You have been shortlisted for the position of ${job.title}.`;
      notificationType = 'success';
    } else if (status === 'Rejected') {
      notificationTitle = 'Application Update';
      notificationMessage = `Your application for ${job.title} has been reviewed. Unfortunately, you were not selected at this time.`;
      notificationType = 'error';
    } else if (status === 'Interview Invited') {
      notificationTitle = 'Interview Invitation 📅';
      notificationMessage = `You have been invited to interview for ${job.title}! Check your email for details.`;
      notificationType = 'success';
    } else {
      notificationTitle = 'Application Status Changed';
      notificationMessage = `Your application for ${job.title} is now: ${status}.`;
      notificationType = 'info';
    }

    await Notification.create({
      userId: application.applicantId._id,
      title: notificationTitle,
      message: notificationMessage,
      type: notificationType
    });

    res.json({ message: 'Application status updated successfully', application });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getEmployerApplications = async (req, res) => {
  try {
    const employerId = req.user?.userId;
    const jobs = await Job.find({ employerId }).select('_id').lean();
    const jobIds = jobs.map(j => j._id);
    
    const applications = await Application.find({ jobId: { $in: jobIds } })
      .populate('applicantId', 'name email profilePicture seekerProfile')
      .populate('jobId', 'title')
      .populate('assessmentSessionId', 'score isCompleted isFlagged flagReason')
      .sort({ appliedAt: -1 })
      .lean();
      
    res.json(applications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
