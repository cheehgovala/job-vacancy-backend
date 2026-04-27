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
  const payload = {
      amount: String(amount),
      currency: CURRENCY,
      email: user.email,
      first_name: user.name.split(' ')[0],
      last_name: user.name.split(' ').slice(1).join(' ') || 'User',
      callback_url: CALLBACK_URL,
      return_url: FRONTEND_URL,
      tx_ref,
    };

    // Call PayChangu API
    const resp = await pcFetch("/payment", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const checkoutUrl = resp?.data?.checkout_url;
    if (!checkoutUrl) throw new Error("No checkout_url returned by PayChangu");

    // Save pending payment record
    const newPayment = new Payment({
      user: userId,
      amount: amount,
      currency: CURRENCY,
      planId: planId,
      paymentMethod: 'card', 
      status: 'pending',
      paymentRef: tx_ref,
      createdAt: new Date()
    });

    await newPayment.save();

    return res.status(200).json({
      success: true,
      message: "Checkout session created",
      checkout_url: checkoutUrl,
      tx_ref,
      paymentId: newPayment._id 
    });
  } catch (err) {
    next(err);
  }
};

// Verify payment after redirect