/**
 * Notification Controller
 */
const Notification = require('../models/Notification');

// GET /api/notifications — get current user's notifications
const getMyNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);
    return res.json(notifications);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to get notifications.' });
  }
};

// PUT /api/notifications/:id/read — mark as read
const markRead = async (req, res) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { isRead: true }
    );
    return res.json({ message: 'Marked as read.' });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to mark notification.' });
  }
};

// PUT /api/notifications/read-all — mark all as read
const markAllRead = async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user._id, isRead: false }, { isRead: true });
    return res.json({ message: 'All notifications marked as read.' });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to mark all notifications.' });
  }
};

module.exports = { getMyNotifications, markRead, markAllRead };
