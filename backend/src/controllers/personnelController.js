const personnelModel = require('../models/personnelModel');
const cacheService = require('../services/cacheService');

const PERSONNEL_CACHE_KEY = 'personnel:all';
const PERSONNEL_CACHE_TTL = 5 * 60; // 5 minutes

/**
 * Controller for Personnel Data Sheet
 */

async function createPersonnelRecord(req, res, next) {
    try {
        const record = await personnelModel.createPersonnelRecord(req.body);
        await cacheService.del(PERSONNEL_CACHE_KEY);
        res.status(201).json(record);
    } catch (error) {
        next(error);
    }
}

async function getAllPersonnelRecords(req, res, next) {
    try {
        const cached = await cacheService.get(PERSONNEL_CACHE_KEY);
        if (cached) {
            return res.json(cached);
        }
        const records = await personnelModel.getAllPersonnelRecords();
        await cacheService.set(PERSONNEL_CACHE_KEY, records, PERSONNEL_CACHE_TTL);
        res.json(records);
    } catch (error) {
        next(error);
    }
}

async function updatePersonnelRecord(req, res, next) {
    try {
        const id = req.params.id;
        const record = await personnelModel.updatePersonnelRecord(id, req.body);
        await cacheService.del(PERSONNEL_CACHE_KEY);
        res.json(record);
    } catch (error) {
        next(error);
    }
}

async function deletePersonnelRecord(req, res, next) {
    try {
        const id = req.params.id;
        const success = await personnelModel.deletePersonnelRecord(id);
        if (success) {
            await cacheService.del(PERSONNEL_CACHE_KEY);
            res.status(204).send();
        } else {
            const err = new Error('Record not found');
            err.status = 404;
            next(err);
        }
    } catch (error) {
        next(error);
    }
}

async function searchPersonnel(req, res, next) {
    try {
        const queryStr = req.query.q;
        if (!queryStr) {
            const err = new Error('Query parameter q is required');
            err.status = 400;
            return next(err);
        }
        const records = await personnelModel.searchPersonnel(queryStr);
        res.json(records);
    } catch (error) {
        next(error);
    }
}

module.exports = {
    createPersonnelRecord,
    getAllPersonnelRecords,
    updatePersonnelRecord,
    deletePersonnelRecord,
    searchPersonnel,
};

