import express from 'express';
import { createJob, getAllJobs, getJobById, saveJob, getEmployerJobs, updateJob, deleteJob } from '../controllers/jobController.js';
import { protect, authorizeRoles } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/', protect, authorizeRoles('employer'), createJob);
router.post('/:id/save', protect, authorizeRoles('seeker'), saveJob);

router.get('/employer', protect, authorizeRoles('employer'), getEmployerJobs);
router.get('/', getAllJobs);
router.get('/:id', getJobById);

router.put('/:id', protect, authorizeRoles('employer'), updateJob);
router.delete('/:id', protect, authorizeRoles('employer'), deleteJob);

export default router;
