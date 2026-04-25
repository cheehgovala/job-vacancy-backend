import express from 'express';
import { createJob, getAllJobs, getJobById, saveJob } from '../controllers/jobController.js';
import { protect, authorizeRoles } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/', protect, authorizeRoles('employer'), createJob);
router.post('/:id/save', protect, authorizeRoles('seeker'), saveJob);

router.get('/', getAllJobs);
router.get('/:id', getJobById);

export default router;
