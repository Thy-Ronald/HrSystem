/**
 * Personnel Model
 * Firestore DAL for the "personnel" collection (capstone-31b9e / Project B)
 * Document ID: auto-generated
 */

const { firestoreB } = require('../config/firebaseProjectB');

const PERSONNEL = () => firestoreB.collection('personnel');

function toRecord(doc) {
  return { id: doc.id, ...doc.data() };
}

async function createPersonnelRecord(data) {
  const doc = {
    dateStarted:            data.dateStarted,
    surname:                data.surname,
    firstName:              data.firstName,
    middleName:             data.middleName          || null,
    dateOfBirth:            data.dateOfBirth         || null,
    placeOfBirth:           data.placeOfBirth        || null,
    sex:                    data.sex                 || null,
    civilStatus:            data.civilStatus         || null,
    citizenship:            data.citizenship         || null,
    height:                 data.height              || null,
    weight:                 data.weight              || null,
    bloodType:              data.bloodType           || null,
    sssNumber:              data.sssNumber           || null,
    pagIbigNumber:          data.pagIbigNumber       || null,
    philHealthNumber:       data.philHealthNumber    || null,
    tin:                    data.tin                 || null,
    employeeNumber:         data.employeeNumber      || null,
    residentialAddress:     data.residentialAddress  || null,
    permanentAddress:       data.permanentAddress    || null,
    zipCode:                data.zipCode             || null,
    telephoneNumber:        data.telephoneNumber     || null,
    cellphoneNumber:        data.cellphoneNumber,
    emailAddress:           data.emailAddress,
    emergencyName:          data.emergencyName,
    emergencyRelationship:  data.emergencyRelationship   || null,
    emergencyAddress:       data.emergencyAddress        || null,
    emergencyOccupation:    data.emergencyOccupation     || null,
    emergencyContactNumber: data.emergencyContactNumber,
    fatherName:             data.fatherName          || null,
    motherMaidenName:       data.motherMaidenName    || null,
    parentsAddress:         data.parentsAddress      || null,
    education:              data.education           || [],
    createdAt:              new Date().toISOString(),
    updatedAt:              new Date().toISOString(),
  };

  const ref = await PERSONNEL().add(doc);
  return { id: ref.id, ...doc };
}

async function getAllPersonnelRecords() {
  const snap = await PERSONNEL().orderBy('createdAt', 'desc').get();
  return snap.docs.map(toRecord);
}

async function getPersonnelRecordById(id) {
  const doc = await PERSONNEL().doc(id).get();
  return doc.exists ? toRecord(doc) : null;
}

async function updatePersonnelRecord(id, data) {
  const updates = {
    dateStarted:            data.dateStarted,
    surname:                data.surname,
    firstName:              data.firstName,
    middleName:             data.middleName          || null,
    dateOfBirth:            data.dateOfBirth         || null,
    placeOfBirth:           data.placeOfBirth        || null,
    sex:                    data.sex                 || null,
    civilStatus:            data.civilStatus         || null,
    citizenship:            data.citizenship         || null,
    height:                 data.height              || null,
    weight:                 data.weight              || null,
    bloodType:              data.bloodType           || null,
    sssNumber:              data.sssNumber           || null,
    pagIbigNumber:          data.pagIbigNumber       || null,
    philHealthNumber:       data.philHealthNumber    || null,
    tin:                    data.tin                 || null,
    employeeNumber:         data.employeeNumber      || null,
    residentialAddress:     data.residentialAddress  || null,
    permanentAddress:       data.permanentAddress    || null,
    zipCode:                data.zipCode             || null,
    telephoneNumber:        data.telephoneNumber     || null,
    cellphoneNumber:        data.cellphoneNumber,
    emailAddress:           data.emailAddress,
    emergencyName:          data.emergencyName,
    emergencyRelationship:  data.emergencyRelationship   || null,
    emergencyAddress:       data.emergencyAddress        || null,
    emergencyOccupation:    data.emergencyOccupation     || null,
    emergencyContactNumber: data.emergencyContactNumber,
    fatherName:             data.fatherName          || null,
    motherMaidenName:       data.motherMaidenName    || null,
    parentsAddress:         data.parentsAddress      || null,
    education:              data.education           || [],
    updatedAt:              new Date().toISOString(),
  };

  await PERSONNEL().doc(id).update(updates);
  return { id, ...updates };
}

async function deletePersonnelRecord(id) {
  await PERSONNEL().doc(id).delete();
  return true;
}

/**
 * Prefix search on surname then firstName.
 * Requires Firestore index on surname ASC (and separately on firstName ASC).
 */
async function searchPersonnel(queryStr) {
  if (!queryStr) return [];
  const term = queryStr.trim();

  const [bySurname, byFirstName] = await Promise.all([
    PERSONNEL()
      .orderBy('surname')
      .startAt(term)
      .endAt(term + '\uf8ff')
      .limit(20)
      .get(),
    PERSONNEL()
      .orderBy('firstName')
      .startAt(term)
      .endAt(term + '\uf8ff')
      .limit(20)
      .get(),
  ]);

  const seen = new Set();
  const results = [];
  for (const doc of [...bySurname.docs, ...byFirstName.docs]) {
    if (!seen.has(doc.id)) {
      seen.add(doc.id);
      const d = doc.data();
      results.push({ id: doc.id, surname: d.surname, firstName: d.firstName, middleName: d.middleName, employeeNumber: d.employeeNumber });
    }
  }
  return results.slice(0, 20);
}

module.exports = {
  createPersonnelRecord,
  getAllPersonnelRecords,
  getPersonnelRecordById,
  updatePersonnelRecord,
  deletePersonnelRecord,
  searchPersonnel,
};
