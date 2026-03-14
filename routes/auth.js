const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { isAuthenticated } = require('../middleware/auth');

// Login page
router.get('/login', (req, res) => {
    // render static login page from public folder
    res.sendFile(path.join(__dirname, '../public/src/html/login.html'));
});

// Handle login form submission
router.post('/login', authController.loginUser);

// Handle logout
router.post('/logout', authController.logoutUser);

// Get current user info
router.get('/me', isAuthenticated, authController.getCurrentUser);

// Export the router
module.exports = router;