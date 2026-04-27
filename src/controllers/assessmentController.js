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
      options: q.options
    }));

    res.status(200).json({
      sessionId: session._id,
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
        if (answers[q._id] !== undefined && answers[q._id] === q.correctOptionIndex) {
          correctCount++;
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
    
    // Auto flag if too many violations
    if (session.violationLogs.length >= 3 && !session.isFlagged) {
      session.isFlagged = true;
      session.flagReason = 'Excessive environment violations (e.g. Tab switching).';
    }
    
    await session.save();
    res.status(200).json({ message: 'Violation logged', isFlagged: session.isFlagged });
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
