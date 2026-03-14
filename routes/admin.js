const express = require('express');
const router = express.Router();

const { isAuthenticated, authorize } = require('../middleware/auth');

router.use(isAuthenticated);

// Admin Dashboard route
router.get('/dashboard', (req, res) => {
    res.render('pages/dashboard', { 
        title: 'Green Archers Analytics - Dashboard',
        user: req.session.user
    });
});


module.exports = router;