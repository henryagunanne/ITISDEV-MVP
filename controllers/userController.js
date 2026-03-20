const User = require('../models/User');


// Create User
exports.registerUser = async (req, res) => {
    try {
      const { firstName, lastName, username, email, password, role } = req.body;
      const user = new User({ 
          firstName: firstName, 
          lastName: lastName, 
          username: username.toLowerCase(), 
          email: email.toLowerCase(), 
          password: password, 
          role: role
      });
  
      // check if email already exists
      const existingUser = User.findOne({email: email}).lean();
      if (existingUser) {
          return res
          .status(400)
          .json({ success: false, message: 'Email already registered' });
      }
  
      // check if username already exists
      const duplicateUsername = User.findOne({username: username}).lean();
      if (duplicateUsername) {
          return res
          .status(400)
          .json({ success: false, message: `Username ${username} already exists`})
      }
  
      await user.save();
  
      res.status(201).json({ 
          success: true,
          message: 'User registered successfully' 
      });
    } catch (error) {
      res.status(500).json({ message: 'Error registering user', error: error.message });
    }
};
  


// Update user profile
exports.updateUserProfile = async (req, res) => {
    try {
      const userId = req.session.user._id; // Get user ID from session
      const { firstName, lastName, username, email } = req.body; // Get updated fields from request body
  
      const user = await User.findById(userId);
  
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
  
      // Update user fields
      user.firstName = firstName || user.firstName;
      user.lastName = lastName || user.lastName;
      user.username = username ? username.toLowerCase() : user.username;
      user.email = email ? email.toLowerCase() : user.email;
  
      await user.save();
  
      res.status(200).json({ success: true, message: 'User profile updated successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Error updating user profile', error: error.message });
    }
};

// Change user password
exports.changeUserPassword = async (req, res) => {
    try {
        const userId = req.session.user._id; // Get user ID from session
        const { currentPassword, newPassword } = req.body; // Get current and new password from request body
    
        const user = await User.findById(userId);
    
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
    
        // Check if current password is correct
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Current password is incorrect' });
        }

        // ensure that current password and new passwords are not the same
        if (currentPassword === newPassword) {
        return res.status(400).json({ success: false, message: 'New password must be different from current password' });
        }
    
        // Update password
        user.password = newPassword;
        await user.save();
    
        res.status(200).json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error changing password', error: error.message });
    }
};

// Delete user account
exports.deleteUserAccount = async (req, res) => {
    // const { userId } = req.params; // Get user ID from request parameters
    try {
        const userId = req.session.user._id; // Get user ID from session
  
        const user = await User.findByIdAndDelete(userId);
    
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
    
        // Destroy session after account deletion
        req.session.destroy(err => {
            if (err) {
            console.error('Error destroying session after account deletion:', err);
            }
        });
    
        res.status(200).json({ success: true, message: 'User account deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting user account', error: error.message });
    }
};


// Admin - Get user by ID (for admin dashboard)
exports.getUserById = async (req, res) => {
    const { userId } = req.params; // Get user ID from request parameters
    try {
        const user = await User.findById(userId).select('-password').lean(); // Exclude password field
    
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
    
        res.status(200).json({ success: true, user });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching user', error: error.message });
    }
};


// Admin - Get all users (for admin dashboard)
exports.getAllUsers = async (req, res) => {
    try {
      const users = await User.find().select('-password').lean(); // Exclude password field
      res.status(200).json({ success: true, users });
    } catch (error) {
      res.status(500).json({ message: 'Error fetching users', error: error.message });
    }
};


// Admin - Delete user by ID (for admin dashboard)
exports.deleteUserById = async (req, res) => {
    try {
        const { userId } = req.params; // Get user ID from request parameters
        const deletedUser = await User.findByIdAndDelete(userId).lean();

        if (!deletedUser) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.status(200).json({ 
            success: true, 
            message: 'User deleted successfully', 
            data: deletedUser 
        });
    } catch (error) {
        console.error("Delete User Error: ", error)
        res.status(500).json({ 
            message: 'Error deleting user', 
            error: error.message 
        });
    }
};

// Admin - Deactivate user account by changing status
exports.deactivateUserAccount = async (req, res) => {
    try {
        const { userId } = req.params; // Get user ID from request parameters
        const updatedUser = await User.findByIdAndUpdate(
            userId, 
            { status: 'Inactive' }, 
            { new: true }
        ).select('-password').lean(); // Exclude password field

        if (!updatedUser) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.status(200).json({ 
            success: true, 
            message: 'User account deactivated successfully', 
            data: updatedUser 
        });
    } catch (error) {
        console.error("Deactivate User Account Error: ", error)
        res.status(500).json({ 
            message: 'Error deactivating user account', 
            error: error.message 
        });
    }
};


// Admin - Reactivate user account by changing status
exports.reactivateUserAccount = async (req, res) => {
    try {
        const { userId } = req.params; // Get user ID from request parameters
        const updatedUser = await User.findByIdAndUpdate(
            userId, 
            { status: 'Active' }, 
            { new: true }
        ).select('-password').lean(); // Exclude password field

        if (!updatedUser) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.status(200).json({ 
            success: true, 
            message: 'User account reactivated successfully', 
            data: updatedUser 
        });
    } catch (error) {
        console.error("Reactivate User Account Error: ", error)
        res.status(500).json({ 
            message: 'Error reactivating user account', 
            error: error.message 
        });
    }
};