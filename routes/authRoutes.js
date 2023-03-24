const express = require('express');
const passport = require('passport');
const { checkAuthenticated, checkNotAuthenticated } = require('../utilities/utility')
const bcrypt = require('bcrypt');
const User = require('../config/users')

const authRouter = express.Router();

authRouter.post('/login', checkAuthenticated, passport.authenticate('local',  { failureRedirect: "fail" }), (req, res) =>{ 
    res.status(200).json({message: 'You have logged in successfully'});
});

authRouter.get('/fail', function(req, res){
    res.status(401).json({message: 'Invalid Credentials', status: 'error'});
});

authRouter.post('/logout', checkNotAuthenticated, function(req, res, next){
    req.logout(function(err) {
      if (err) { return next(err); }
      res.status(200).json({message: 'You have logged out'});
    });
});

authRouter.get('/getUser', checkNotAuthenticated, async (req, res) => {
    const user = req.session.passport.user;
    const email = user?.email ? user?.email : user?._json.email;

    if(req.user) {
        try {
            const user = await User.findOne({ 
                email: email,
            });

            if (user.length === 0) {
                return res.status(404).json({message: 'User Info Not Found', status: 'error'});
            };

            res.status(200).json({
                id: user._id,
                name: user.name,
                email: user.email,
                userType: user?.userType,
                lastGame: user?.lastGame,
                createdAt: user.createdAt
            });
    
        } catch (error) {
            console.log(error.message)
        } 
    } else {
        res.status(404).json({message: 'User Not Found', status: 'error'});}
});

authRouter.post('/register', checkAuthenticated, async (req, res) => {
    let { name, email, password, password2 } = req.body;

    let errors = [];

    if(!name || !email || !password || !password2) {
        errors.push('Please enter all fields! ');
    };

    if(password.length < 6) {
        errors.push('Password should be at least 6 characters! ');
    };

    if(password !== password2) {
        errors.push('Passwords do not match! ');
    }

    if(errors.length > 0) {
        res.status(401).json({message: errors, status: 'error'})

    } else {

        try {
            const userCheck = await User.findOne({ 
                email: email,
            });

            if(userCheck) {
                return res.status(401).json({message: 'User Already Exists', status: 'error'});
            } else {
                let hashedPassword = await bcrypt.hash(password, 10);

                const user = await User.create({ 
                    name: name,
                    email: email,
                    password: hashedPassword,
                });
    
                res.status(200).json({
                    name: user.name,
                    email: user.email,
                    createdAt: user.createdAt
                });
            }
    
        } catch (error) {
            console.log(error.message)
        }  
    }
});

// GOOGLE AUTH
authRouter.get('/', passport.authenticate('google', { 
    scope: ['profile', 'email'],
    prompt: 'select_account' })
);
//TODO: point to MongoDB
/* authRouter.get('/callback', 
    passport.authenticate('google', { 
        failureRedirect: 'fail', 
    }),
    function(req, res) {
        const gUser = req.user._json;

        // check for user in database
        pool.query(
            'SELECT * FROM users WHERE userOAuthID = $1', [gUser.sub], (err, results) => {
                if (err) {
                    throw err;
                }

                const googleUser = results.rows[0];

                if(googleUser === undefined || googleUser === null ) {
                    pool.query(
                        'INSERT INTO users (firstname, lastname, email, useroauthid, avatar) VALUES ($1, $2, $3, $4, $5)', [gUser.given_name, gUser.family_name, gUser.email, gUser.sub, gUser.picture], (err, results) => {
                            if(err) {
                                throw err;
                            }
                            res.redirect(process.env.CLIENT_URL);
                            
                        }
                    );

                } else {
                    res.redirect(process.env.CLIENT_URL);
                    
                }
            }
        )
    }
); */

module.exports = authRouter;
