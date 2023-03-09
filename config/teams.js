const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: String,
    members: {
        lead: String,
        partner: String,
    },
    updatedAt: {
        type: Date,
        default: () => Date.now(),
    },
    createdAt: {
        type: Date,
        immutable: true,
        default: () => Date.now(),
    },
});

module.exports = mongoose.model('Team', userSchema)