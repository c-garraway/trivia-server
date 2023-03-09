const express = require('express');
const app = express();
const bcrypt = require('bcrypt');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const LocalStrategy = require('passport-local').Strategy;
const cors = require('cors');
const helmet = require('helmet');
const MongoDBStore = require('connect-mongodb-session')(session);
const mongoose = require('mongoose');
const dotenv = require('dotenv').config()
const User = require('./config/users')

const PORT = process.env.EXPRESS_PORT || 4000;

mongoose.set('strictQuery', true);

const authenticateLocalUser = async (email, password, done) => {  
    try {
        const user = await User.findOne({ 
            email: email,
        });

        if(user) {
            bcrypt.compare(password, user.password, (err, isMatch) => {
                if(err) {
                    throw err
                }
                if(isMatch) {
                    return done(null, user);
                } else {
                    return done(null, false);
                }
            });
            
        } else {
            return done(null, false);
        };

    } catch (error) {
        console.log(error.message)
    } 
};

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.NODE_ENV === 'development' ? process.env.GOOGLE_CALLBACK_URL_DEV : process.env.GOOGLE_CALLBACK_URL
    },
    function(request, accessToken, refreshToken, profile, done) {
        return done(null, profile);
    }
));

passport.use(
    new LocalStrategy(
        {
            usernameField: 'email',
            passwordField: 'password'
        },
        authenticateLocalUser
    )
);

passport.serializeUser((user, done) => {
    done(null, user)
});

passport.deserializeUser((user, done) => {
    done(null, user)
});

app.use(express.urlencoded({extended: false}));
app.use(express.json());
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    methods: "GET, POST, PUT, DELETE",
    credentials: true,
}));

if(process.env.NODE_ENV === 'development') {
    const morgan = require('morgan');
    app.use(morgan('tiny'))
}

const db = mongoose.connect(process.env.MONGODB_URI)
const store = new MongoDBStore({
    uri: process.env.MONGODB_URI,
    collection: 'sessions'
})

// Catch errors
store.on('error', function(error) {
    console.log(error);
});

app.use(session({
    store: store,
    secret: process.env.SESSION_SECRET,
    saveUninitialized: false,
    resave: false,
    cookie: { 
        secure: process.env.NODE_ENV === 'development' ? false : true,
        httpOnly: process.env.NODE_ENV === 'development' ? false : true,
        sameSite: process.env.NODE_ENV === 'development' ? false : 'none',
        maxAge: 24 * 60 * 60 * 1000
    } // 24 hours
}));

app.enable('trust proxy');
app.use(passport.initialize());
app.use(passport.session());
app.use(helmet());

const authRouter = require('./routes/authRoutes');
app.use('/auth', authRouter);

const teamRouter = require('./routes/teamRoutes');
app.use('/team', teamRouter);

app.get('/', (req, res) =>{
    res.send('bem backend root')    
})

app.listen(PORT, ()=>{
    console.log(`Server running on port ${PORT}`)
});