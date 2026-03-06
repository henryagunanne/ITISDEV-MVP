const session = require('express-session'); // Session management
const MongoStore = require('connect-mongo'); // MongoDB session store

const sessionConfig = {
    secret:  process.env.SESSION_SECRET || 'DLSU1234!', // Secret for signing session ID cookies (use env variable in production)
    resave: false,  // Don't save session if unmodified
    saveUninitialized: false,   // Don't create session until something stored
    store: MongoStore.create({ 
        mongoUrl: process.env.MONGODB_URI ||'mongodb://127.0.0.1:27017/collegeBasketballDB',
        ttl: 7 * 24 * 60 * 60 // Session expiration time (7 days)
    }),   // Store sessions in MongoDB
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // secure cookies in prod
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 // 1 day
    }
};

module.exports = session(sessionConfig);