/*  This file defines the User model using Mongoose, which is used to interact 
    with the MongoDB database. It includes fields for username, email, password, 
    and role, as well as methods for hashing passwords and comparing them.
*/
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Define the schema for a User
const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true,
        trim: true
    },
    lastName: {
        type: String,
        required: true,
        trim: true
    },
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ["Admin", "Coach", "Statistician"],
        default: "Coach"
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Pre-save hook to hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next(); // Only hash if password is new or modified
    try {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
      next();
    } catch (err) {
      next(err);
    }
});

// Method to compare password for login
userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// pre-save hook to update the updatedAt field
userSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

// Export the model for use in other files
module.exports = mongoose.model('User', userSchema);