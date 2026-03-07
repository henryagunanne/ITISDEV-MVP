const express = require('express');
const router = express.Router();

const { isAuthenticated } = require('../middleware/auth');


// Homepage route
router.get('/', (req, res) => {
  res.render('index', { title: 'Home' });
});

