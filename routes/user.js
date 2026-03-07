const express = require('express');
const router = express.Router();

const { isAuthenticated, authorize } = require('../middleware/auth');

router.use(isAuthenticated);
router.use(authorize('Admin'));