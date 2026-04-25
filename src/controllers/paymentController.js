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
export const verify = async (req, res, next) => {
  try {
    const { tx_ref, status } = req.query;
    
    if (!tx_ref) {
      return res.status(400).json({
        success: false,
        message: "tx_ref missing"
      });
    }

    const verifyResponse = await pcFetch(`/verify-payment/${encodeURIComponent(tx_ref)}`, { 
      method: "GET" 
    });

    const isSuccess = verifyResponse?.status === "success" && verifyResponse?.data?.status === "success";
    const amount = verifyResponse?.data?.amount;
    const currency = verifyResponse?.data?.currency;

    const foundPayment = await Payment.findOne({ paymentRef: tx_ref });
    
    if (foundPayment) {
      if (isSuccess) {
        if (Number(foundPayment.amount) === Number(amount) && currency === CURRENCY) {
          foundPayment.status = "completed";
          foundPayment.paidAt = new Date();
        } else {
          foundPayment.status = "failed";
        }
      } else {
        foundPayment.status = "failed";
      }

      if (verifyResponse?.data?.transaction_id) {
        foundPayment.transactionId = verifyResponse.data.transaction_id;
      }

      await foundPayment.save();

      // UPDATE USER SUBSCRIPTION STATUS 
      if (isSuccess && foundPayment.status === "completed") {
        const durationDays = foundPayment.planId === 'seeker_basic' ? 3 : 30; // Basic is 3 days, premium/employer is 30 days
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + durationDays);

        await User.findByIdAndUpdate(
          foundPayment.user,
          { 
            hasActiveSubscription: true,
            subscriptionPlan: foundPayment.planId,
            subscriptionExpiry: expiryDate
          },
          { new: true }
        );
      }
    }

    // Redirect for browser requests
    const dest = isSuccess
      ? `${FRONTEND_URL}/payment-success?plan=${foundPayment?.planId || 'seeker_basic'}`
      : `${FRONTEND_URL}/payment-failed`; 
    
    return res.redirect(dest);

  } catch (err) {
    next(err);
  }
};

// Webhook logic
export const webhookHandler = async (req, res, next) => {
  try {
    const signatureHeader = req.header("Signature") || "";
    const raw = req.body; 
    if (!WEBHOOK_SECRET) {
      console.warn("No PAYCHANGU_WEBHOOK_SECRET configured");
      return res.status(400).send("Webhook secret not configured");
    }

    // Compute HMAC
    const computed = crypto.createHmac("sha256", WEBHOOK_SECRET).update(raw).digest("hex");
    if (computed !== signatureHeader) {
      console.warn("Invalid webhook signature");
      return res.status(400).send("Invalid signature");
    }

    const event = JSON.parse(raw.toString("utf8"));
    const txRef = event?.data?.tx_ref || event?.tx_ref;
    const status = event?.data?.status || event?.status;

    if (!txRef) return res.status(200).send("ok");

    // Process payment success (similar to verify)
    if (status === 'success') {
       const foundPayment = await Payment.findOne({ paymentRef: txRef });
       if (foundPayment && foundPayment.status === 'pending') {
          foundPayment.status = "completed";
          foundPayment.paidAt = new Date();
          await foundPayment.save();

          const durationDays = foundPayment.planId === 'seeker_basic' ? 3 : 30;
          const expiryDate = new Date();
          expiryDate.setDate(expiryDate.getDate() + durationDays);

          await User.findByIdAndUpdate(
            foundPayment.user,
            { 
              hasActiveSubscription: true,
              subscriptionPlan: foundPayment.planId,
              subscriptionExpiry: expiryDate
            }
          );
       }
    }

    return res.status(200).send("ok");
  } catch (err) {
    next(err);
  }
};

// Logic to get payment by User
export const getPaymentsByUser = async (req, res, next) => {
  try {
    const userId = req.user._id; 
    const { status } = req.query;

    const filter = { user: userId };
    if (status) {
      filter.status = status;
    }

    const payments = await Payment.find(filter)
      .sort({ createdAt: -1 }) 
      .lean();

    return res.status(200).json({
      success: true,
      data: payments,
      count: payments.length
    });

  } catch (error) {
      next(error);
  }
};

// Logic to cancel payment
export const cancelPayment = async (req, res, next) => {
  try {
    const { paymentId } = req.params;
    const userId = req.user._id;

    if (!paymentId) {
      return res.status(400).json({
        success: false,
        message: "Payment ID is required"
      });
    }

    const payment = await Payment.findOne({
      _id: paymentId,
      user: userId
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found or you are not authorized to cancel this payment"
      });
    }

    if (payment.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel payment with status: ${payment.status}. Only pending payments can be cancelled.`
      });
    }

    payment.status = 'failed';
    await payment.save();

    return res.status(200).json({
      success: true,
      message: "Payment cancelled successfully",
      data: {
        paymentId: payment._id,
        status: payment.status,
        paymentRef: payment.paymentRef
      }
    });

  } catch (error) {
    next(error);
  }
};
