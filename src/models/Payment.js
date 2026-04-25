import mongoose from 'mongoose';

const PaymentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'MWK' },
  planId: { type: String, required: true }, // e.g., 'seeker_basic', 'employer_premium'
  paymentMethod: { type: String, default: 'card' },
  status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
  paymentRef: { type: String, required: true, unique: true }, // PayChangu tx_ref
  transactionId: { type: String }, // Provided by PayChangu upon verification
  paidAt: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

export const Payment = mongoose.model('Payment', PaymentSchema);
