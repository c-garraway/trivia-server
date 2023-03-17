const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: String,
    email: {
        type: String,
        required: true,
        lowercase: true,
        unique: true,
        uniqueCaseInsensitive: true, 
    },
    password: {
        type: String,
        minLength: 6,
        required: true,
    },
    userType: {
        type: String,
        lowercase: true
    },
    createdAt: {
        type: Date,
        immutable: true,
        default: () => Date.now(),
    }
});

module.exports = mongoose.model('User', userSchema)