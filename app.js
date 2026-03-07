// Express + Mongoose + Handlebars
require('dotenv').config(); // Load environment variables from .env file
const express = require("express"); // Express framework
const exphbs = require('express-handlebars'); // Handlebars templating engine
const session = require('express-session'); // Session management
const connectDB = require('./config/db');
const sessionConfig = require('./config/session');
const path = require('path');

const app = express(); // Create Express app

// System logging
// logging setup goes here

// Connect to MongoDB
if (process.env.NODE_ENV !== 'test') {
    connectDB();
}

// Configure Handlebars and handlebars helpers
app.engine('hbs', exphbs.engine({
    extname: '.hbs',                   // File extension for Handlebars files
    layoutsDir: 'views/layouts',       // Folder for layout files
    partialsDir: 'views/partials',     // Folder for partial files/reusable components
}));

app.set('view engine', 'hbs'); // Set Handlebars as the view engine
app.set('views', path.join(__dirname, 'views')); // Set views directory

// Middleware
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(session(sessionConfig)); // Session management with MongoDB store
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files from 'public' folder


// Make user data available in all views (for authentication status, etc.)
app.use((req, res, next) => {
    res.locals.user = req.session.user; // Make user data available in all views
    next();
});


// Routes
app.use('/', require('./routes/index')); // Home and general routes
app.use('/users', require('./routes/users')); // User authentication and profile routes
// app.use('/teams', require('./routes/teams')); // College basketball teams routes
app.use('/players', require('./routes/players')); // Players routes
app.use('/games', require('./routes/games')); // Games routes
app.use('/admin', require('./routes/admin')); // Admin routes for managing teams, players, games, etc.
app.use('/analytics', require('./routes/analytics')); // Analytics routes


// 404 handler - for unmatched routes
app.use((err, req, res, next) => {
    console.error(`ERROR: ${err.message}`, { stack: err.stack });
    res.status(404).render('error/404', {
        title: '404 Not Found',
        url: req.originalUrl,
        code: 404,
        message: 'Page Not Found',
        description: `The requested URL "${req.originalUrl}" was not found on this server.`
    });
});


// export the app for use in server.js and testing
module.exports = app; // Export the app for use in server.js and testing


