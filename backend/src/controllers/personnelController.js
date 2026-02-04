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

async function updatePersonnelRecord(req, res) {
    try {
        const id = req.params.id;
        const record = await personnelModel.updatePersonnelRecord(id, req.body);
        res.json(record);
    } catch (error) {
        console.error('Controller error updating personnel record:', error);
        res.status(500).json({ error: 'Failed to update personnel record' });
    }
}

async function deletePersonnelRecord(req, res) {
    try {
        const id = req.params.id;
        const success = await personnelModel.deletePersonnelRecord(id);
        if (success) {
            res.status(204).send();
        } else {
            res.status(404).json({ error: 'Record not found' });
        }
    } catch (error) {
        console.error('Controller error deleting personnel record:', error);
        res.status(500).json({ error: 'Failed to delete personnel record' });
    }
}

module.exports = {
    createPersonnelRecord,
    getAllPersonnelRecords,
    updatePersonnelRecord,
    deletePersonnelRecord,
    searchPersonnel
};

async function searchPersonnel(req, res) {
    try {
        const queryStr = req.query.q;
        if (!queryStr) {
            return res.status(400).json({ error: 'Query parameter q is required' });
        }
        const records = await personnelModel.searchPersonnel(queryStr);
        res.json(records);
    } catch (error) {
        console.error('Controller error searching personnel:', error);
        res.status(500).json({ error: 'Failed to search personnel' });
    }
}
