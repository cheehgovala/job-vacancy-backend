import mongoose from 'mongoose';

const ImageRecordSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  url: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

export const ImageRecord = mongoose.model('ImageRecord', ImageRecordSchema);
