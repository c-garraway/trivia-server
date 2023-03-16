const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');

const teamSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true, 
        unique: true,
        uniqueCaseInsensitive: true, 
    },
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

teamSchema.plugin(uniqueValidator)

module.exports = mongoose.model('Team', teamSchema)