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