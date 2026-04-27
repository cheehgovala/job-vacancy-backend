import express from 'express';
import { protect, authorizeRoles } from '../middlewares/authMiddleware.js';
import { requireSubscription } from '../middlewares/subscriptionMiddleware.js';
import { startAssessment, submitAssessment, logViolation, uploadSnapshot } from '../controllers/assessmentController.js';

const router = express.Router();

router.post('/start', protect, authorizeRoles('seeker'), requireSubscription, startAssessment);
router.post('/submit', protect, authorizeRoles('seeker'), submitAssessment);
router.post('/log-violation', protect, authorizeRoles('seeker'), logViolation);
router.post('/proctoring-snapshot', protect, authorizeRoles('seeker'), uploadSnapshot);

export default router;
