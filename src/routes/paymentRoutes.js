import express from 'express';
import {
  getPaymentsByUser,
  initPayment,
  webhookHandler,
  verify,
  cancelPayment
} from '../controllers/paymentController.js';

import { protect, authorizeRoles } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Create a checkout session
router.post("/init", protect, authorizeRoles("seeker", "employer"), initPayment);

// Verify the payment (redirect handler)
router.get("/verify", verify);

// Cancel the payment
router.post("/cancel/:paymentId", protect, cancelPayment);

// Webhook (asynchronous). IMPORTANT: raw body ONLY for this route
router.post("/webhook", express.raw({ type: "application/json" }), webhookHandler);

// Get user payments
router.get('/user', protect, getPaymentsByUser);

export default router;
