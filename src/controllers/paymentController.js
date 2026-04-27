import { Payment } from "../models/Payment.js";
import { User } from "../models/User.js";
import { pcFetch } from "../utils/helpers.js";
import crypto from "crypto";

const WEBHOOK_SECRET = process.env.PAYCHANGU_WEBHOOK_SECRET;
const CURRENCY = process.env.PAYCHANGU_CURRENCY || "MWK";
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5000";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const CALLBACK_URL = `${BACKEND_URL}/api/payments/verify`;

const PLAN_DETAILS = {
  'employer_premium': { price: 50000, name: 'Employer Premium' },
  'seeker_basic': { price: 2500, name: 'Seeker Basic' },
  'seeker_premium': { price: 10000, name: 'Seeker Premium' }
};

// Initialize the payment
export const initPayment = async (req, res, next) => {
  try {
    const { planId } = req.body;
    const userId = req.user._id;
    
    if (!planId || !PLAN_DETAILS[planId]) {
      return res.status(400).json({
        success: false,
        message: "Valid planId is required",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const amount = PLAN_DETAILS[planId].price;
    const tx_ref = `SUB-${user._id}-${Date.now()}`;
