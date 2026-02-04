const userService = require('../services/userService');

/**
 * Controller for User operations
 */

async function searchUsers(req, res) {
    try {
        const queryStr = req.query.q;
        if (!queryStr) {
            return res.status(400).json({ error: 'Query parameter q is required' });
        }
        const users = await userService.searchUsers(queryStr);
        res.json(users);
    } catch (error) {
        console.error('Controller error searching users:', error);
        res.status(500).json({ error: 'Failed to search users' });
    }
}

module.exports = {
    searchUsers
};
