import { User } from '../models/User.js';

export const requireSubscription = async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await User.findById(userId);
    if (!user || !user.hasActiveSubscription) {
      return res.status(403).json({ error: 'A premium subscription is required for this action.' });
    }

    next();
  } catch (error) {
    res.status(500).json({ error: 'Failed to verify subscription' });
  }
};
