/**
 * Monitoring Request Model
 * Firestore DAL for "monitoring_requests" collection (capstone-31b9e / Project B)
 * User names/emails are denormalized at write time to avoid JOINs.
 */

const { firestoreB } = require('../config/firebaseProjectB');

const REQUESTS = () => firestoreB.collection('monitoring_requests');
const USERS    = () => firestoreB.collection('users');

async function getUserProfile(uid) {
  const doc = await USERS().doc(uid).get();
  return doc.exists ? { name: doc.data().name, email: doc.data().email } : { name: 'Unknown', email: '' };
}

function toRequest(doc) {
  const d = doc.data();
  return {
    id:             doc.id,
    admin_id:       d.adminId,
    target_user_id: d.targetUserId,
    status:         d.status,
    admin_name:     d.adminName,
    admin_email:    d.adminEmail,
    employee_name:  d.employeeName,
    employee_email: d.employeeEmail,
    created_at:     d.createdAt,
    updated_at:     d.updatedAt,
  };
}

async function createRequest(adminId, targetUserId) {
  const [admin, employee] = await Promise.all([
    getUserProfile(adminId),
    getUserProfile(targetUserId),
  ]);

  const doc = {
    adminId,
    targetUserId,
    status:        'pending',
    adminName:     admin.name,
    adminEmail:    admin.email,
    employeeName:  employee.name,
    employeeEmail: employee.email,
    createdAt:     new Date().toISOString(),
    updatedAt:     new Date().toISOString(),
  };

  const ref = await REQUESTS().add(doc);
  return toRequest({ id: ref.id, data: () => doc });
}

async function getRequestsForUser(userId) {
  const snap = await REQUESTS()
    .where('targetUserId', '==', userId)
    .where('status', 'in', ['pending', 'approved'])
    .orderBy('createdAt', 'desc')
    .get();
  return snap.docs.map(toRequest);
}

async function getRequestsByAdmin(adminId) {
  const snap = await REQUESTS()
    .where('adminId', '==', adminId)
    .where('status', 'in', ['pending', 'approved', 'rejected', 'terminated'])
    .orderBy('createdAt', 'desc')
    .get();
  return snap.docs.map(toRequest);
}

async function updateRequestStatus(requestId, status) {
  await REQUESTS().doc(requestId).update({ status, updatedAt: new Date().toISOString() });
  return { id: requestId, status };
}

async function findPendingRequest(adminId, targetUserId) {
  const snap = await REQUESTS()
    .where('adminId',       '==', adminId)
    .where('targetUserId',  '==', targetUserId)
    .where('status',        '==', 'pending')
    .limit(1)
    .get();
  if (snap.empty) return null;
  return toRequest(snap.docs[0]);
}

async function getById(id) {
  const doc = await REQUESTS().doc(id).get();
  return doc.exists ? toRequest(doc) : null;
}

async function deleteRequest(id) {
  await REQUESTS().doc(id).delete();
  return true;
}

module.exports = {
  createRequest,
  getRequestsForUser,
  getRequestsByAdmin,
  updateRequestStatus,
  findPendingRequest,
  getById,
  deleteRequest,
};
