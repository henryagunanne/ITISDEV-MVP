// Authentication middleware
const isAuthenticated = (req, res, next) => {
    // If there is NO user session (Not logged in OR Session Timeout)
    if (!req.session.user) {
        
        // If this is an AJAX request or the client expects JSON (e.g., API call)
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.status(401).json({ 
                error: 'Session timeout - please login again.',
                code: 'SESSION_TIMEOUT'
            });
        }

        // If this is a normal page load in the browser
        return res.status(401).render('error/access-denied', {
            title: 'Session Expired',
            layout: 'error',
            code: 401,
            message: 'Session Timeout',
            description: 'Your session has expired or you are not logged in. Please login again.',
            isAuthenticated: false
        });
    }

    // User exists in session, but their account was manually disabled
    if (req.session.user.isActive === false) {
        return res.status(403).render('error/access-denied', {
            layout: 'error',
            title: 'Account Disabled',
            code: 403,
            message: 'Account Deactivated',
            description: 'Your account has been deactivated. Contact an administrator.',
            isAuthenticated: true
        });
    }

    // User is valid and active!
    return next();
};

// Role-based authorization middleware
const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.session.user) {
            return res.status(401).render('error/access-denied', {
                layout: 'error',
                title: 'Unauthorized',
                code: 401,
                message: 'Unauthorized',
                description: 'You must be logged in.',
                isAuthenticated: false
            });
        }

        if (!roles.includes(req.session.user.role)) {
            return res.status(403).render('error/access-denied', {
                layout: 'error',
                title: 'Access Denied',
                code: 403,
                message: 'Forbidden',
                description: 'You do not have permission to access this page.',
                isAuthenticated: true,
                isAdmin: req.session.user.role === 'Admin'
            });
        }

        next();
    };
};

module.exports = {
    isAuthenticated,
    authorize: authorizeRoles
};