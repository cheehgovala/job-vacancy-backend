import { AssessmentSession } from '../models/AssessmentSession.js';
import { Exam } from '../models/Exam.js';
import { Application } from '../models/Application.js';
import cloudinary from '../config/cloudinary.js';

export const getExamDetails = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const applicantId = req.user?.userId;

    const application = await Application.findOne({ _id: applicationId, applicantId });
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const exam = await Exam.findOne({ jobId: application.jobId });
    if (!exam) {
      return res.status(404).json({ error: 'Exam not found for this job' });
    }

    res.status(200).json({
      title: exam.title,
      timeLimitMinutes: exam.timeLimitMinutes,
      passThreshold: exam.passThreshold,
      questionCount: exam.questions.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const startAssessment = async (req, res) => {
  try {
    const { applicationId } = req.body;
    const applicantId = req.user?.userId;

    const application = await Application.findOne({ _id: applicationId, applicantId });
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const exam = await Exam.findOne({ jobId: application.jobId });
    if (!exam) {
      return res.status(404).json({ error: 'Exam not found for this job' });
    }
    const examId = exam._id;

    //
      let session = await AssessmentSession.findOne({ applicationId, examId });
    if (session) {
      if (session.isCompleted) {
        return res.status(403).json({ error: 'Assessment already completed. Wait for employer review.' });
      }
      // If started but not completed, allow resume if within time limit
      const timeElapsed = (Date.now() - session.startTime.getTime()) / 1000 / 60;
      if (timeElapsed > exam.timeLimitMinutes + 1) {
         // Auto fail if expired
         session.isCompleted = true;
         session.score = 0;
         await session.save();
         return res.status(403).json({ error: 'Time expired for this assessment.' });
      }
    } else {
      // Create a new session
      const shuffledQuestions = [...exam.questions].sort(() => Math.random() - 0.5);
      const questionOrder = shuffledQuestions.map(q => q._id);

      session = await AssessmentSession.create({
        applicationId,
        applicantId,
        examId,
        startTime: Date.now(),
        questionOrder
      });

      application.assessmentSessionId = session._id;
      await application.save();
    }

    // Strip out correct answers to prevent client side cheating
    const publicQuestions = exam.questions.map(q => ({
      _id: q._id,
      text: q.text,
      type: q.type,
      options: q.type === 'text' ? [] : q.options
    }));

    res.status(200).json({
      sessionId: session._id,
      title: exam.title,
      passThreshold: exam.passThreshold,
      timeLimitMinutes: exam.timeLimitMinutes,
      startTime: session.startTime,
      questions: publicQuestions
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const submitAssessment = async (req, res) => {
  try {
    const { sessionId, answers } = req.body; // answers is a record/object mapping questionId -> selectedOptionIndex
    const applicantId = req.user?.userId;

    const session = await AssessmentSession.findOne({ _id: sessionId, applicantId });
    if (!session) return res.status(404).json({ error: 'Session not found' });
    
    if (session.isCompleted) {
      return res.status(403).json({ error: 'Assessment already submitted.' });
    }

    const exam = await Exam.findById(session.examId);
    const application = await Application.findById(session.applicationId);

    // Enforce server side time limits
    const timeElapsedMins = (Date.now() - session.startTime.getTime()) / 1000 / 60;
    const bufferMins = 1; // 1 minute padding for network delay
    
    let finalScore = 0;
    if (timeElapsedMins > (exam.timeLimitMinutes + bufferMins)) {
      // Applicant cheated the timer
      finalScore = 0;
      session.isFlagged = true;
      session.flagReason = 'Exceeded server time limit.';
    } else {
      // Grade the responses securely
      let correctCount = 0;
      exam.questions.forEach(q => {
        if (q.type === 'text') {
          const userAnswer = (answers[q._id] || '').toString().trim().toLowerCase();
          const correctAns = (q.options[0] || '').toString().trim().toLowerCase();
          if (userAnswer && userAnswer === correctAns) {
            correctCount++;
          }
        } else {
          if (answers[q._id] !== undefined && Number(answers[q._id]) === q.correctOptionIndex) {
            correctCount++;
          }
        }
      });
      finalScore = Math.round((correctCount / exam.questions.length) * 100);
    }

    session.endTime = Date.now();
    session.score = finalScore;
    session.isCompleted = true;
    await session.save();

    // Re-evaluate application score and status
    // Old matchScore (skills + exp) + ExamScore combined weighting
    const combinedScore = Math.round((application.matchScore + finalScore) / 2);
    application.matchScore = combinedScore;

    // Automatic pre-screening threshold
    if (finalScore < exam.passThreshold) {
      application.status = 'Rejected';
    } else {
      application.status = 'Under Review';
    }

    await application.save();

    res.status(200).json({ 
      message: 'Assessment submitted successfully.', 
      score: finalScore,
      passed: finalScore >= exam.passThreshold 
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const logViolation = async (req, res) => {
  try {
    const { sessionId, event } = req.body;
    const applicantId = req.user?.userId;

    const session = await AssessmentSession.findOne({ _id: sessionId, applicantId });
    if (!session) return res.status(404).json({ error: 'Session not found' });
    
    if (session.isCompleted) {
      return res.status(400).json({ error: 'Assessment already completed.' });
    }

    session.violationLogs.push({ event, timestamp: Date.now() });
    
    // Auto flag if too many violations (limit set to 2)
    if (session.violationLogs.length >= 2 && !session.isFlagged) {
      session.isFlagged = true;
      session.flagReason = 'Excessive environment violations (e.g. Tab switching, exiting full-screen).';
    }
    
    await session.save();
    res.status(200).json({ 
      message: 'Violation logged', 
      isFlagged: session.isFlagged,
      violationCount: session.violationLogs.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const uploadSnapshot = async (req, res) => {
  try {
    const { sessionId, imageBase64 } = req.body;
    const applicantId = req.user?.userId;

    const session = await AssessmentSession.findOne({ _id: sessionId, applicantId });
    if (!session) return res.status(404).json({ error: 'Session not found' });
    
    if (session.isCompleted) {
      return res.status(400).json({ error: 'Assessment already completed.' });
    }

    if (!imageBase64) {
      return res.status(400).json({ error: 'Image data is required' });
    }

    // Upload to cloudinary
    const result = await cloudinary.uploader.upload(imageBase64, {
      folder: 'assessments/snapshots',
    });

    session.snapshots.push(result.secure_url);
    await session.save();

    res.status(200).json({ message: 'Snapshot saved' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createExam = async (req, res) => {
  try {
    const { jobId, title, timeLimitMinutes, passThreshold, questions } = req.body;
    
    // Check if exam already exists for this job
    let exam = await Exam.findOne({ jobId });
    
    if (exam) {
      // Update existing
      exam.title = title;
      exam.timeLimitMinutes = timeLimitMinutes;
      exam.passThreshold = passThreshold;
      exam.questions = questions;
      await exam.save();
    } else {
      // Create new
      exam = await Exam.create({
        jobId,
        title,
        timeLimitMinutes,
        passThreshold,
        questions
      });
    }
    
    res.status(201).json({ message: 'Exam saved successfully', exam });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
