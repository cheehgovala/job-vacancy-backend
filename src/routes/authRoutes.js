import express from 'express';
import { register, login, getProfile, updateSubscription, verifyOTP, updateProfile, updateProfilePicture, verifyUserDocuments } from '../controllers/authController.js';
import { protect, authorizeRoles } from '../middlewares/authMiddleware.js';
import { upload } from '../middlewares/upload.js';

const router = express.Router();

router.post('/register', register);
router.post('/verify-otp', verifyOTP);
router.post('/login', login);
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.post('/profile-picture', protect, upload.single('image'), updateProfilePicture);
router.put('/subscription', protect, updateSubscription);
router.put('/:id/verify-documents', protect, authorizeRoles('employer'), verifyUserDocuments);

export default router;
