const express = require('express');
const router = express.Router();

const { isAuthenticated, authorize } = require('../middleware/auth');

router.use(isAuthenticated);

// Admin Dashboard route
router.get('/admin/dashboard', (req, res) => {
    res.render('admin/dashboard', { title: 'Admin Dashboard' });
});