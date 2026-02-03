const { query } = require('../config/database');

/**
 * Data Access Layer for personnel_data_sheet table
 */

async function createPersonnelRecord(data) {
    const sql = `
        INSERT INTO personnel_data_sheet (
            date_started, surname, first_name, middle_name,
            date_of_birth, place_of_birth, sex, civil_status, citizenship,
            height, weight, blood_type,
            sss_number, pag_ibig_number, philhealth_number, tin, employee_number,
            residential_address, permanent_address, zip_code, telephone_number, 
            cellphone_number, email_address,
            emergency_name, emergency_relationship, emergency_address, 
            emergency_occupation, emergency_contact_number,
            father_name, mother_maiden_name, parents_address,
            education_background
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
        data.dateStarted, data.surname, data.firstName, data.middleName || null,
        data.dateOfBirth || null, data.placeOfBirth || null, data.sex || null, data.civilStatus || null, data.citizenship || null,
        data.height || null, data.weight || null, data.bloodType || null,
        data.sssNumber || null, data.pagIbigNumber || null, data.philHealthNumber || null, data.tin || null, data.employeeNumber || null,
        data.residentialAddress || null, data.permanentAddress || null, data.zipCode || null, data.telephoneNumber || null,
        data.cellphoneNumber, data.emailAddress,
        data.emergencyName, data.emergencyRelationship || null, data.emergencyAddress || null,
        data.emergencyOccupation || null, data.emergencyContactNumber,
        data.fatherName || null, data.motherMaidenName || null, data.parentsAddress || null,
        JSON.stringify(data.education)
    ];

    try {
        const result = await query(sql, params);
        return { id: result.insertId, ...data };
    } catch (error) {
        console.error('Error creating personnel record:', error);
        throw error;
    }
}

async function getAllPersonnelRecords() {
    const sql = `
        SELECT 
            id, 
            DATE_FORMAT(date_started, '%Y-%m-%d') as dateStarted, 
            surname, first_name as firstName, middle_name as middleName,
            DATE_FORMAT(date_of_birth, '%Y-%m-%d') as dateOfBirth, 
            place_of_birth as placeOfBirth, sex, civil_status as civilStatus, citizenship,
            height, weight, blood_type as bloodType,
            sss_number as sssNumber, pag_ibig_number as pagIbigNumber, philhealth_number as philHealthNumber, 
            tin, employee_number as employeeNumber,
            residential_address as residentialAddress, permanent_address as permanentAddress, 
            zip_code as zipCode, telephone_number as telephoneNumber, 
            cellphone_number as cellphoneNumber, email_address as emailAddress,
            emergency_name as emergencyName, emergency_relationship as emergencyRelationship, 
            emergency_address as emergencyAddress, emergency_occupation as emergencyOccupation, 
            emergency_contact_number as emergencyContactNumber,
            father_name as fatherName, mother_maiden_name as motherMaidenName, 
            parents_address as parentsAddress,
            education_background as education,
            created_at as createdAt, updated_at as updatedAt
        FROM personnel_data_sheet
        ORDER BY created_at DESC
    `;

    try {
        const records = await query(sql);
        return records.map(record => ({
            ...record,
            education: typeof record.education === 'string' ? JSON.parse(record.education) : record.education
        }));
    } catch (error) {
        console.error('Error getting all personnel records:', error);
        throw error;
    }
}

async function updatePersonnelRecord(id, data) {
    const sql = `
        UPDATE personnel_data_sheet SET
            date_started = ?, surname = ?, first_name = ?, middle_name = ?,
            date_of_birth = ?, place_of_birth = ?, sex = ?, civil_status = ?, citizenship = ?,
            height = ?, weight = ?, blood_type = ?,
            sss_number = ?, pag_ibig_number = ?, philhealth_number = ?, tin = ?, employee_number = ?,
            residential_address = ?, permanent_address = ?, zip_code = ?, telephone_number = ?, 
            cellphone_number = ?, email_address = ?,
            emergency_name = ?, emergency_relationship = ?, emergency_address = ?, 
            emergency_occupation = ?, emergency_contact_number = ?,
            father_name = ?, mother_maiden_name = ?, parents_address = ?,
            education_background = ?,
            updated_at = NOW()
        WHERE id = ?
    `;

    const params = [
        data.dateStarted, data.surname, data.firstName, data.middleName || null,
        data.dateOfBirth || null, data.placeOfBirth || null, data.sex || null, data.civilStatus || null, data.citizenship || null,
        data.height || null, data.weight || null, data.bloodType || null,
        data.sssNumber || null, data.pagIbigNumber || null, data.philHealthNumber || null, data.tin || null, data.employeeNumber || null,
        data.residentialAddress || null, data.permanentAddress || null, data.zipCode || null, data.telephoneNumber || null,
        data.cellphoneNumber, data.emailAddress,
        data.emergencyName, data.emergencyRelationship || null, data.emergencyAddress || null,
        data.emergencyOccupation || null, data.emergencyContactNumber,
        data.fatherName || null, data.motherMaidenName || null, data.parentsAddress || null,
        JSON.stringify(data.education),
        id
    ];

    try {
        await query(sql, params);
        return { id, ...data };
    } catch (error) {
        console.error('Error updating personnel record:', error);
        throw error;
    }
}


async function deletePersonnelRecord(id) {
    const sql = 'DELETE FROM personnel_data_sheet WHERE id = ?';
    try {
        const result = await query(sql, [id]);
        return result.affectedRows > 0;
    } catch (error) {
        console.error('Error deleting personnel record:', error);
        throw error;
    }
}

module.exports = {
    createPersonnelRecord,
    getAllPersonnelRecords,
    updatePersonnelRecord,
    deletePersonnelRecord
};
