// Authentication middleware
const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        return next();
    }

    if (!req.session.user.isActive) {
        return res.status(403).render('error/access-denied', {
            layout: 'error',
            title: 'Account Disabled',
            code: 403,
            message: 'Account Deactivated',
            description: 'Your account has been deactivated. Contact an administrator.',
            isAuthenticated: true
        });
    }

    return res.status(401).render('error/access-denied', {
        title: 'Unauthorized',
        layout: 'error',
        code: 401,
        message: 'Unauthorized',
        description: 'You must be logged in to access this page.',
        isAuthenticated: false
    });
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