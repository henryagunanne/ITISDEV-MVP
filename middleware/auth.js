// Authentication middleware
const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        return next();
    } else {
        res.status(403).sendFile('login.html', { root: 'public/src/html' });
    }
};

// Role-based authorization middleware
const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (req.session.user && roles.includes(req.session.user.role)) {
            return next();
        } else {
            res.status(403).render('error/access-denied', { 
                title: 'Access Denied',
                isAdmin: req.session.user?.role === 'Admin'
            });  
        }
    };
};

module.exports = {
    isAuthenticated,
    authorize: authorizeRoles
};