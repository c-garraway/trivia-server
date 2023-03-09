const express = require('express');
const passport = require('passport');
const { checkAuthenticated, checkNotAuthenticated } = require('../utilities/utility')
const Team = require('../config/teams')

const teamRouter = express.Router();

teamRouter.get('/getTeam/:id', checkNotAuthenticated, async (req, res) => {
    const id = String(req.params.id);
    //TODO: Change to get team by userID!
    if(id) {
        try {
            const team = await Team.findOne({ 
                _id: id,
            });

            if (team.length === 0) {
                return res.status(200).json({message: 'Team Info Not Found', status: 'error'});
            };

            res.status(200).json({team});
    
        } catch (error) {
            console.log(error.message)
        } 
    } else {
        res.status(404).json({message: 'Team id missing', status: 'error'});}
});


/* members: {
    lead: String,
    partner: String,
}, */
teamRouter.post('/addTeam', checkNotAuthenticated, async (req, res) => {
    const { name, lead, partner } = req.body;

    let errors = [];

    if(!name ) {
        errors.push('Team name required! ');
    };

    if(!lead && !partner) {
        errors.push('Team role required! ');
    };
    //TODO: check if user already belongs to a team!
    if(errors.length > 0) {
        res.status(401).json({message: errors, status: 'error'})

    } else {

        try {
            const teamCheck = await Team.findOne({ 
                name: name,
            });

            if(teamCheck) {
                return res.status(401).json({message: 'Team Already Exists', status: 'error'});
            } else {

                const team = await Team.create({ 
                    name: name,
                    members: {
                        lead: lead,
                        partner: partner
                    },
                });
    
                res.status(200).json({team});
            }
    
        } catch (error) {
            console.log(error.message)
        }  
    }
});

teamRouter.put('/updateTeam/:id', checkNotAuthenticated, async (req, res) => {
    const id = String(req.params.id);
    const { name, lead, partner } = req.body;

    let errors = [];

    if(!name ) {
        errors.push('Team name required! ');
    };

    if(!lead && !partner) {
        errors.push('Team role required! ');
    };

    if(errors.length > 0) {
        res.status(401).json({message: errors, status: 'error'})

    } else {

        try {
            const teamCheck = await Team.findOne({ 
                _id: id,
            });

            if(!teamCheck) {
                return res.status(401).json({message: 'Does not Exists', status: 'error'});
            } else {

                const updateResponse = await Team.updateOne({ 
                    name: name,
                    members: {
                        lead: lead,
                        partner: partner
                    },
                }).where('_id').equals(id);
    
                res.status(200).json({updateResponse});
            }
    
        } catch (error) {
            console.log(error.message)
        }  
    }
});

module.exports = teamRouter;
