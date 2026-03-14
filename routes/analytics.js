const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');

const { isAuthenticated, authorize } = require('../middleware/auth');

router.use(isAuthenticated);


module.exports = router;