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
