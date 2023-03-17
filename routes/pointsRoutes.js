const express = require('express');
const passport = require('passport');
const { checkAuthenticated, checkNotAuthenticated } = require('../utilities/utility')
const Team = require('../config/teams')
const User = require('../config/users')
const Points = require('../config/points')
const pointsRouter = express.Router();

pointsRouter.get('/', checkNotAuthenticated, async (req, res) => {
    const searchTeamName = req.session.team.name;

    if(searchTeamName) {
        try {
            const teamPoints = await Points.findOne({ 
                teamName: {'$regex': searchTeamName, "$options": "i" },
            });

            if (teamPoints === null) {
                throw new Error("Team Points Info Not Found")
            };

            console.log(teamPoints)

            res.status(200).json(teamPoints);
    
        } catch (error) {
            console.log(error)
            res.status(404).json(error.message)
        } 
    };
});

pointsRouter.put('/updateDailyPoints', checkNotAuthenticated, async (req, res) => {
    const user = req.session.passport.user;
    const userEmail = user?.email
    const userType = 'partner' //user?.userType;
    const teamName = req.session.team.name;
    const category = req.body.category;
    const difficulty = req.body.difficulty;
    const dailyPointsTotal = req.body.dailyPointsTotal;
    const dailyPointsBlock = req.body.dailyPointsBlock;
    const currentDate = new Date().toISOString().slice(0, 10);
    
    try {
        //Input validation block
        if(!userEmail || !userType) {
            throw new Error('User cookie not sent in header! ');
        };

        if(!teamName ) {
            throw new Error('Team name required! ');
        };
    
        if(!category) {
            throw new Error('Category required! ');
        };

        if(!difficulty) {
            throw new Error('difficulty required! ');
        };

        if(!dailyPointsTotal) {
            throw new Error('dailyPointsTotal required! ');
        };

        if(!dailyPointsBlock) {
            throw new Error('dailyPointsBlock required! ');
        };



        //TODO: Check for team point document if not found create entry
        const teamPointsCheck = await Points.findOne({ 
            teamName: {'$regex': teamName, "$options": "i" },
        });
        //console.log(teamPointsCheck) 
        if(!teamPointsCheck) {
            throw new Error("Team points record does not exists"); //future remove
            // Create new record.
        }

        //Check if daily update already exists
        const dailyPointsCheck = await Points.findOne({
            $and: [
                {_id: teamPointsCheck._id},
                {[`teamMembers.${userType}.dailyPoints.${currentDate}`]: {$exists: true}}
            ]
        })
        //console.log(dailyPointsCheck)
        if(dailyPointsCheck) {
            throw new Error("Daily entry already exists"); //future remove
        }

        // Database update block
        console.log(category, difficulty, dailyPointsTotal, dailyPointsBlock)

        const teamPoints = await Points.findByIdAndUpdate(
            teamPointsCheck._id,
            { $set: { [`teamMembers.${userType}.dailyPoints.${currentDate}`]: {
                category: category,
                difficulty: difficulty,
                dailyPointsTotal: dailyPointsTotal,
                dailyPointsBlock: dailyPointsBlock
                } 
            }},
            { new: true }
        );

        res.status(200).json(teamPoints);

    } catch (error) {
        console.log(error.message)
        res.status(400).json(error.message)
    }  
});

pointsRouter.put('/updateTeam', checkNotAuthenticated, async (req, res) => {
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

        res.status(200).json({team});

    } catch (error) {
        console.log(error.message)
        res.status(400).json(error.message)
    }  
});

pointsRouter.get('/getTeam', checkNotAuthenticated, async (req, res) => {
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

        res.status(200).json(team);
        
    } catch (error) {
        console.log(error.message)
        res.status(400).json({error: error.message})
    }
});

module.exports = pointsRouter;
