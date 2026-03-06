const express = require('express');
const router = express.Router();

// Admin Dashboard route
router.get('/admin/dashboard', (req, res) => {
    res.render('admin/dashboard', { title: 'Admin Dashboard' });
});