const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// GET /api/users/search - Search users
router.get('/search', userController.searchUsers);

module.exports = router;
