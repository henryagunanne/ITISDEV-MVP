const User = require("../models/User");

// Login a user
exports.loginUser = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        const user = await User.findOne({ username: username.toLowerCase() });

        // check if user is in the database
        if (!user) {
            return res.status(401).json({
                message: "Invalid User"
            });
        }

        // password match check
        const isMatch = await user.comparePassword(password);

        if (!isMatch) {
            return res.status(401).json({
                message: "Invalid Password"
            });
        }

        // check if user is active
        if (!user.isActive) {
            return res.status(401).json({
                message: "User account deactivated. Please contact Admin"
            });
        }

        // store user details in session
        req.session.user = {
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            username: user.username,
            email: user.email,
            role: user.role,
            isActive: user.isActive
        };

        /*res.render('pages/dashboard', {
            title: 'Dashboard - Green Archers Analytics',
            user: req.session.user
        });*/
        res.json({
            message: "Login successful",
            user: req.session.user
        });
    } catch (error) {
        res.status(500).json({
            message: "Login failed",
            error: error.message
        });
    }
};


// logout a user
exports.logoutUser = async (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({
            message: "Logout failed"
            });
        }
    
        // res.clearCookie("connect.sid");
    
        res.json({
            message: "Logged out successfully"
        });
    });
};

// Get current logged in user details
exports.getCurrentUser = async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ message: "Not authenticated" });
    }

    try {
        const user = await User.findById(req.session.user.id).lean();

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json({
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        res.status(500).json({ message: "Failed to retrieve user", error: error.message });
    }
};