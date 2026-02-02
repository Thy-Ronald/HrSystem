const personnelModel = require('../models/personnelModel');

/**
 * Controller for Personnel Data Sheet
 */

async function createPersonnelRecord(req, res) {
    try {
        const record = await personnelModel.createPersonnelRecord(req.body);
        res.status(201).json(record);
    } catch (error) {
        console.error('Controller error creating personnel record:', error);
        res.status(500).json({ error: 'Failed to create personnel record' });
    }
}

async function getAllPersonnelRecords(req, res) {
    try {
        const records = await personnelModel.getAllPersonnelRecords();
        res.json(records);
    } catch (error) {
        console.error('Controller error getting personnel records:', error);
        res.status(500).json({ error: 'Failed to fetch personnel records' });
    }
}

module.exports = {
    createPersonnelRecord,
    getAllPersonnelRecords
};
