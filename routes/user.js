const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

const { isAuthenticated, authorize } = require('../middleware/auth');

router.use(isAuthenticated);    // All routes in this router require authentication
// router.use(authorize('Admin')); // Only Admins can access these routes

// Create a new user
router.post('/create', authorize('Admin'), userController.registerUser);

// Update user profile
router.put('/update-profile', userController.updateUserProfile);

// Change user password
router.put('/change-password', userController.changeUserPassword);

// Delete user account
router.delete('/delete-account',  authorize('Admin'), userController.deleteUserAccount);

// Get user by ID (Admin only)
router.get('/:id', authorize('Admin'), userController.getUserById);

// Get all users (Admin only)
router.get('/all-users', authorize('Admin'), userController.getAllUsers);

// Delete user by ID (Admin only)
router.delete('/:id/delete', authorize('Admin'), userController.deleteUserById);

// Deactive user account (Admin only)
router.put('/:id/deactivate', authorize('Admin'), userController.deactivateUserAccount);

// activate user account (Admin only)
router.put('/:id/activate', authorize('Admin'), userController.activateUserAccount);


// Export the router to be used in app.js
module.exports = router;