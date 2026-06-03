import express from 'express';
import { createExam, getEmployerExams, getExamByJobId, getExamDetails, logViolation, startAssessment, submitAssessment, uploadSnapshot } from '../controllers/assessmentController.js';
import { authorizeRoles, protect } from '../middlewares/authMiddleware.js';
import { requireSubscription } from '../middlewares/subscriptionMiddleware.js';

const router = express.Router();

router.get('/details/:applicationId', protect, authorizeRoles('seeker'), getExamDetails);
router.post('/start', protect, authorizeRoles('seeker'), requireSubscription, startAssessment);
router.post('/submit', protect, authorizeRoles('seeker'), submitAssessment);
router.post('/log-violation', protect, authorizeRoles('seeker'), logViolation);
router.post('/proctoring-snapshot', protect, authorizeRoles('seeker'), uploadSnapshot);

// Employer Exam Builder
router.post('/exams', protect, authorizeRoles('employer'), createExam);
router.get('/exams/employer', protect, authorizeRoles('employer'), getEmployerExams);
router.get('/exams/:jobId', protect, authorizeRoles('employer'), getExamByJobId);

export default router;
