const express = require('express');
const router = express.Router();
const gameEventsController = require('../controllers/gameEventsController');

const { isAuthenticated, authorize } = require('../middleware/auth');

router.use(isAuthenticated);


module.exports = router;