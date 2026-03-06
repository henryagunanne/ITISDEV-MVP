// Express + Mongoose + Handlebars
const express = require("express");
const app = express();
const mongoose = require('mongoose'); // MongoDB ODM
const exphbs = require('express-handlebars'); // Handlebars templating engine
const session = require('express-session'); // Session management
const MongoStore = require('connect-mongo'); // MongoDB session store
const path = require('path');

// System logging
// logging setup goes here

// Connect to MongoDB
if (process.env.NODE_ENV !== 'test') {
    mongoose.connect('mongodb://127.0.0.1:27017/collegeBasketballDB')
    .then(async () => {
        console.log('✅ MongoDB connected.');
    })
    .catch(err => console.error('MongoDB connection error:', err));
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
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files from 'public' folder


// Session management with MongoDB store
app.use(session({
    secret: 'DLSU1234!', // Secret for signing session ID cookies (use env variable in production)
    resave: false,  // Don't save session if unmodified
    saveUninitialized: false,   // Don't create session until something stored
    store: MongoStore.create({ mongoUrl: 'mongodb://127.0.0.1:27017/collegeBasketballDB' }),   // Store sessions in MongoDB
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // secure cookies in prod
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 // 1 day
    }
}));


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


