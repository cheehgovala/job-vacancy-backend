import { AssessmentSession } from '../models/AssessmentSession.js';
import { Exam } from '../models/Exam.js';
import { Application } from '../models/Application.js';
import cloudinary from '../config/cloudinary.js';

export const startAssessment = async (req, res) => {
  try {
    const { applicationId, examId } = req.body;
    const applicantId = req.user?.userId;

    const application = await Application.findOne({ _id: applicationId, applicantId });
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    //