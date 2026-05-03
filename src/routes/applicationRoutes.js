import express from 'express';
import { applyToJob, getMyApplications, getJobApplications, updateApplicationStatus, getEmployerApplications } from '../controllers/applicationController.js';
import { protect, authorizeRoles } from '../middlewares/authMiddleware.js';
import { requireSubscription } from '../middlewares/subscriptionMiddleware.js';

const router = express.Router();

router.post('/:jobId', protect, authorizeRoles('seeker'), requireSubscription, applyToJob);
router.get('/my-applications', protect, authorizeRoles('seeker'), getMyApplications);

router.get('/job/:jobId', protect, authorizeRoles('employer'), getJobApplications);
router.get('/employer-all', protect, authorizeRoles('employer'), getEmployerApplications);

router.put('/:applicationId/status', protect, authorizeRoles('employer'), updateApplicationStatus);

export default router;

