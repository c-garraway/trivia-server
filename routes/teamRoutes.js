const express = require('express');
const passport = require('passport');
const { checkAuthenticated, checkNotAuthenticated } = require('../utilities/utility')
const Team = require('../config/teams')
const User = require('../config/users')
const teamRouter = express.Router();

teamRouter.get('/', checkNotAuthenticated, async (req, res) => {
    const searchEmail = req.query.email;
    const searchTeamName = req.query.name;

    if(searchEmail) {
        try {
            const user = await User.findOne({ 
                email: searchEmail,
            });

            if (user === null) {
                throw new Error("User Info Not Found")
            };

            res.status(200).json({email: user.email});
    
        } catch (error) {
            console.log(error.message)
            res.status(404).json(error.message)
        } 
    };

    if(searchTeamName) {
        try {
            const team = await Team.findOne({ 
                name: {'$regex': searchTeamName, "$options": "i" },
            });

            if (team === null) {
                throw new Error("Team Info Not Found")
            };

            console.log(team)

            res.status(200).json({name: team.name});
    
        } catch (error) {
            console.log(error)
            res.status(404).json(error.message)
        } 
    };
});

teamRouter.post('/addTeam', checkNotAuthenticated, async (req, res) => {
    const user = req.session.passport.user;
    const name = req.query.teamName;
    const lead = user?.email
    
    try {
        //Input validation block
        if(!name ) {
            throw new Error('Team name required! ');
        };
    
        if(!lead) {
            throw new Error('User email required! ');
        };

        //Check if user already belongs to another team
        const userCheck = await Team.findOne({ 
            $or: [
                {'members.lead': lead},
                {'members.partner': lead}
            ],
        });
        console.log(userCheck)
        if(userCheck) {
            throw new Error("User already belongs to another team");
        } 

        //Check if team exists
        const teamCheck = await Team.findOne({ 
            name: {'$regex': name, "$options": "i" },
        });
        console.log(teamCheck) 
        if(teamCheck) {
            throw new Error("Team already exists");
        } 

        //Database update block
        const team = await Team.create({ 
            name: name,
            members: {
                lead: lead,
            },
        });

        await User.findOneAndUpdate(
            {email: lead}, {$set: {userType: 'lead'}}
        );
        //Update session user
        req.session.passport.user = await User.findOne({
            email: lead
        })
        res.status(200).json({team});

    } catch (error) {
        console.log(error.message)
        res.status(400).json(error.message)
    }  
});

teamRouter.put('/updateTeam', checkNotAuthenticated, async (req, res) => {
    const sessionUser = req.session.passport.user;
    const user = sessionUser?.email;
    const lead = req.query.teamLeadEmail;

    console.log(user, lead)
    
    try {
        //Input validation block
        if(!user ) {
            throw new Error('User email required! ');
        };
    
        if(!lead) {
            throw new Error('Team lead email required! ');
        };

        //Check if user already belongs to another team
        const userCheck = await Team.findOne({ 
            $or: [
                {'members.lead': user},
                {'members.partner': user}
            ],
        });
        console.log('userCheck: ' + userCheck)
        if(userCheck) {
            throw new Error("User already belongs to another team");
        } 

        //Check if user already belongs to another team
        const leader = await Team.find({ 
            'members.lead': lead
        });
        console.log('leader: ' + leader)
        if(leader.length > 1) {
            throw new Error("Partner already belongs to another team");
        } 

        //Get partners teamID
        const teamID = leader[0]._id
        console.log('teamID: ' + teamID) 
        if(!teamID) {
            throw new Error("Cannot fetch teamID");
        } 

        //Database update block
        const team = await Team.findByIdAndUpdate(
            teamID,
            { $set: { 'members.partner': user } },
            { new: true }
        );
        console.log('team: ' + team) 

        await User.findOneAndUpdate( //TODO: Rethink userType change!!!!
            {email: user}, {userType: 'partner'}
        ); 
        //Update session user
        req.session.passport.user = await User.findOne({
            email: user
        })

        res.status(200).json({team});

    } catch (error) {
        console.log(error.message)
        res.status(400).json(error.message)
    }  
});

teamRouter.get('/getTeam', checkNotAuthenticated, async (req, res) => {
    const user = req.session.passport.user;
    const email = user?.email

    try {
        const team = await Team.findOne({ 
            $or: [
                {'members.lead': email},
                {'members.partner': email}
            ]
        });

        if (team === null) {
            throw new Error("Team Info Not Found")
        };

        console.log(team)
        req.session.team = team
        res.status(200).json(team);
        
    } catch (error) {
        console.log(error.message)
        res.status(400).json({error: error.message})
    }
});
module.exports = teamRouter;
