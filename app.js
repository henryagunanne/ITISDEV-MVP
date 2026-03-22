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
    helpers: {
        // --- Logic Helpers ---
        eq: (a, b) => a === b,
        ne: (a, b) => a !== b,
        gt: (a, b) => a > b,
        gte: (a, b) => a >= b,
        lt: (a, b) => a < b,
        lte: (a, b) => a <= b,

        and: (...args) => args.slice(0, -1).every(Boolean),
        or: (...args) => args.slice(0, -1).some(Boolean),
        not: (a) => !a,

        startsWith: function (str, prefix) {
            return str && str.startsWith(prefix);
        },
        formatDate: function (dateVal) {
            if (!dateVal) return '—';
            const d = new Date(dateVal);
            return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        }
    }
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
    res.locals.activePath = req.path;   // Expose current path for sidebar highlighting
    next();
});


// Routes
app.use('/', require('./routes/index')); // Home and general routes
app.use('/auth', require('./routes/auth')); // Authentication routes (login, register, logout)
app.use('/admin', require('./routes/admin')); // Admin routes for managing teams, players, games, etc.
app.use('/api/users', require('./routes/user')); // User authentication and profile routes
app.use('/api/players', require('./routes/player')); // Players routes
app.use('/api/games', require('./routes/game')); // Games routes
app.use('/api/analytics', require('./routes/analytics')); // Analytics routes
app.use('/api/gameStats', require('./routes/gameStats')); // Game statistics routes
app.use('/api/tournaments', require('./routes/tournament')); // Tournament routes
app.use('/api/gameEvents', require('./routes/gameEvents')); // Game events routes


// 404 handler - unmatched routes
app.use((req, res) => {
    res.status(404).render('error/404', {
        title: '404 Not Found',
        layout: 'error',
        url: req.originalUrl,
        code: 404,
        message: 'Page Not Found',
        description: `The requested URL "${req.originalUrl}" was not found on this server.`,
    });
});

// Error handler (for thrown errors)
app.use((err, req, res, next) => {
    console.error(`ERROR: ${err.message}`, { stack: err.stack });

    res.status(500).render('error/500', {
        title: 'Server Error',
        code: 500,
        message: 'Internal Server Error',
        description: 'Something went wrong on the server. Please try again later.',
        // only show in development
        error: process.env.NODE_ENV === 'development' ? err.stack : null
    });
});


// export the app for use in server.js and testing
module.exports = app; // Export the app for use in server.js and testing


