const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { httpAuth } = require('../middlewares/monitoringAuth');

// GET /api/users/search - Search users
router.get('/search', httpAuth, userController.searchUsers);

module.exports = router;
