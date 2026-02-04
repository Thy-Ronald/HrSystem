const express = require('express');
const router = express.Router();
const monitoringRequestController = require('../controllers/monitoringRequestController');
// const { verifyToken } = require('../middlewares/authMiddleware'); 

// We need an auth middleware. 
// Looking at `auth.js`, it uses `verifyToken` util but `server.js` uses `socketAuth`.
// For REST routes, let's check if there is an auth middleware.
// If not, I will create a simple one or assume `server.js` will mount it with auth? 
// No, `server.js` mounts routes directly.
// I will reuse `middlewares/monitoringAuth.js` if suitable or create one.

// Let's assume we have a standard `protect` middleware or similar. 
// I'll define a simple inline middleware for now if needed, or import `verifyToken` from utils and make one.
const { generateToken, verifyToken: verifyJwt } = require('../utils/jwt');

const protect = (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({ error: 'Not authorized, no token' });
    }

    try {
        const decoded = verifyJwt(token);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Not authorized, token failed' });
    }
};

router.post('/', protect, monitoringRequestController.createRequest);
router.get('/', protect, monitoringRequestController.getMyRequests);
router.put('/:id/respond', protect, monitoringRequestController.respondToRequest);

module.exports = router;
