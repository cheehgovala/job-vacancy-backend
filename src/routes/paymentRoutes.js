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