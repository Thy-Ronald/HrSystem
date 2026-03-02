/**
 * Contract Store
 * Firestore DAL for the "contracts" collection (capstone-31b9e / Project B)
 * Document ID: auto-generated
 */

const { firestoreB } = require('../config/firebaseProjectB');
const { validateContractData, validateContractUpdateData } = require('../utils/sqlValidation');

const CONTRACTS = () => firestoreB.collection('contracts');

/** Compute expiration date from assessment date + term months */
function calcExpiration(assessmentDate, termMonths) {
  const d = new Date(assessmentDate);
  d.setMonth(d.getMonth() + termMonths);
  return d.toISOString().slice(0, 10);
}

/** Firestore doc  camelCase contract object */
function toContract(doc) {
  return { id: doc.id, ...doc.data() };
}

async function createContract(data) {
  const v = validateContractData(data);
  const expirationDate =
    v.expirationDate ||
    (v.assessmentDate && v.termMonths
      ? calcExpiration(v.assessmentDate, v.termMonths)
      : null);

  const doc = {
    name:                 v.name,
    position:             v.position,
    assessmentDate:       v.assessmentDate,
    basicSalary:          v.basicSalary,
    allowance:            v.allowance ?? null,
    attendanceBonus:      v.attendanceBonus ?? null,
    fullAttendanceBonus:  v.fullAttendanceBonus ?? null,
    signingBonus:         v.signingBonus ?? null,
    termMonths:           v.termMonths,
    expirationDate:       expirationDate,
    resignationDate:      v.resignationDate ?? null,
    createdDate:          new Date().toISOString(),
    updatedDate:          new Date().toISOString(),
  };

  const ref = await CONTRACTS().add(doc);
  return { id: ref.id, ...doc };
}

async function getAllContracts() {
  const snap = await CONTRACTS().orderBy('createdDate', 'desc').get();
  return snap.docs.map(toContract);
}

async function getContractById(id) {
  const doc = await CONTRACTS().doc(id).get();
  return doc.exists ? toContract(doc) : null;
}

async function updateContract(id, data) {
  const v = validateContractUpdateData(data);
  const updates = {};

  if (v.name              !== undefined) updates.name              = v.name;
  if (v.position          !== undefined) updates.position          = v.position;
  if (v.assessmentDate    !== undefined) updates.assessmentDate    = v.assessmentDate;
  if (v.basicSalary       !== undefined) updates.basicSalary       = v.basicSalary;
  if (v.allowance         !== undefined) updates.allowance         = v.allowance;
  if (v.attendanceBonus   !== undefined) updates.attendanceBonus   = v.attendanceBonus;
  if (v.fullAttendanceBonus !== undefined) updates.fullAttendanceBonus = v.fullAttendanceBonus;
  if (v.signingBonus      !== undefined) updates.signingBonus      = v.signingBonus;
  if (v.resignationDate   !== undefined) updates.resignationDate   = v.resignationDate;

  if (v.termMonths !== undefined) {
    updates.termMonths = v.termMonths;
    // Recalculate expiration if not explicitly provided
    if (v.expirationDate === undefined) {
      const current = await getContractById(id);
      if (current && current.assessmentDate) {
        updates.expirationDate = calcExpiration(current.assessmentDate, v.termMonths);
      }
    }
  }
  if (v.expirationDate !== undefined) updates.expirationDate = v.expirationDate;

  if (Object.keys(updates).length === 0) throw new Error('No valid fields provided for update');

  updates.updatedDate = new Date().toISOString();
  await CONTRACTS().doc(id).update(updates);
  return getContractById(id);
}

async function deleteContract(id) {
  await CONTRACTS().doc(id).delete();
  return true;
}

/**
 * Contracts expiring within `days` days (resignationDate must be null).
 * Requires a Firestore composite index on (resignationDate ASC, expirationDate ASC).
 */
async function getContractsExpiringInDays(days = 7) {
  const today  = new Date().toISOString().slice(0, 10);
  const cutoff = new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);

  const snap = await CONTRACTS()
    .where('resignationDate', '==', null)
    .where('expirationDate',  '>=', today)
    .where('expirationDate',  '<=', cutoff)
    .orderBy('expirationDate', 'asc')
    .get();

  return snap.docs.map(toContract);
}

module.exports = {
  createContract,
  getAllContracts,
  getContractById,
  updateContract,
  deleteContract,
  getContractsExpiringInDays,
  // Legacy aliases
  addContract:   createContract,
  listContracts: getAllContracts,
};
