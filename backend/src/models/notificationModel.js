/**
 * Notification Model
 * Firestore DAL for the "notifications" collection (capstone-31b9e / Project B)
 */

const { firestoreB } = require('../config/firebaseProjectB');

const NOTIFS = () => firestoreB.collection('notifications');

const Notification = {
  create: async ({ user_id, type, title, message, data }) => {
    const doc = {
      userId:    user_id,
      type,
      title,
      message,
      data:      data || {},
      isRead:    false,
      createdAt: new Date().toISOString(),
    };
    const ref = await NOTIFS().add(doc);
    return ref.id;
  },

  getAllForUser: async (userId, limit = 50, offset = 0) => {
    const snap = await NOTIFS()
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(limit + offset)
      .get();

    return snap.docs.slice(offset).map(doc => ({
      id:         doc.id,
      user_id:    doc.data().userId,
      type:       doc.data().type,
      title:      doc.data().title,
      message:    doc.data().message,
      data:       doc.data().data,
      is_read:    doc.data().isRead,
      created_at: doc.data().createdAt,
    }));
  },

  markAsRead: async (id) => {
    await NOTIFS().doc(id).update({ isRead: true });
    return true;
  },

  markAllAsRead: async (userId) => {
    const snap = await NOTIFS()
      .where('userId', '==', userId)
      .where('isRead', '==', false)
      .get();
    const batch = firestoreB.batch();
    snap.docs.forEach(doc => batch.update(doc.ref, { isRead: true }));
    await batch.commit();
    return true;
  },

  deleteAllForUser: async (userId) => {
    const snap = await NOTIFS().where('userId', '==', userId).get();
    const batch = firestoreB.batch();
    snap.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    return true;
  },

  createAndNotify: async (payload, io, userSockets) => {
    const { user_id, type, title, message, data } = payload;
    const id = await Notification.create({ user_id, type, title, message, data });

    if (io && userSockets) {
      const sockets = userSockets.get(String(user_id));
      if (sockets) {
        const notification = {
          id,
          type,
          title,
          message,
          data,
          created_at: new Date().toISOString(),
          is_read:    false,
        };
        sockets.forEach(sid => io.to(sid).emit('notification:new', notification));
      }
    }
    return id;
  },
};

module.exports = Notification;
