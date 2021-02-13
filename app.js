//jshint esversion:6
require('dotenv').config()
const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require('mongoose');
//const encrypt = require('mongoose-encryption');
const { stringify } = require("querystring");
//const md5 = require('md5');
// const bcrypt = require("bcrypt");
// const saltRounds = 10;

const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require("mongoose-findorcreate");


app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true,

}));

app.use(passport.initialize());
app.use(passport.session())

mongoose.connect('mongodb://localhost:27017/userDataBase', { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true });


const userSchema = new mongoose.Schema({
    username: {
        type: String,
        unique: true
    },
    password: String,
    name: String,
    googleId:String,
    givenName:String,
    photo:String,
    secretMessage:String
});

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(express.static("public"));

//const secret = process.env.secret
//userSchema.plugin(encrypt, { secret: secret, encryptedFields:["password"] });
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);


const User = new mongoose.model("User", userSchema);



passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
    done(null, user.id);
  });

  passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
      done(err, user);
    });

  });





passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
},
    function (accessToken, refreshToken, profile, cb) {
        console.log(profile.photos[0].value);
        User.findOrCreate({ googleId: profile.id }, function (err, user) {
            console.log(user);
            return cb(err, user);

        });
        User.findOneAndUpdate({googleId: profile.id},{givenName:profile.name.givenName,photo:profile.photos[0].value},(err,doc)=>{
            if(!err){
                doc.save();
            }
        })
    }
));


app.route('/auth/google')

    .get(passport.authenticate('google', {

        scope: ['profile']

    }));

app.get('/auth/google/secrets',
    passport.authenticate('google', { failureRedirect: '/login' }),
    function (req, res) {
        // Successful authentication, redirect home.
        res.redirect('/secrets');
    });





app.get("/", (req, res) => {
    res.render("home");
})


app.get("/register", (req, res) => {
    res.render("register");
})


app.get("/login", (req, res) => {
    res.render("login");
})

app.get("/secrets", (req, res) => {
    // if (req.isAuthenticated()) {
        User.find({"secretMessage":{$ne:null}}, (err,users)=>{
            if(err){
                console.log(err)

            }
            else{
                if(users){
                    res.render("secrets",{
                        usersPost:users
                    })
                }
            }
        })
        // res.render("secrets", {
        //     userName: req.user.name,
        //     name: req.user.givenName,
        //     photo:req.user.photo
        // });

    // }
    // else {
    //     res.redirect("/login")
    // }
})
app.get("/submit",(req,res)=>{
    if (req.isAuthenticated()) {
        res.render("submit", {

        });
    }
    else {
        res.redirect("/login")
    }
})

app.post("/submit",(req,res)=>{
    const text = req.body.secret;
    User.findById(req.user.id,(err,found)=>{
        if(err){
            console.log(err);

        }
        else{
            if(found){
                found.secretMessage = text;
            found.save(()=>{
                res.redirect("/secrets")
            })
            }

        }
    })

})
app.get('/logout', function (req, res) {
    req.logout();
    res.redirect('/');
});

app.post("/register", (req, res) => {

    User.register({ username: req.body.username }, req.body.password, (err, user) => {
        if (err) {
            res.send(err.message)
            res.redirect("/register");
        }
        else {
            User.findOneAndUpdate({ username: req.body.username }, { name: req.body.fname }, (err, doc) => {
                if (!err) {
                    doc.save();
                }
                else {
                    console.log(err)
                }
            })
            passport.authenticate("local")(req, res, () => {
                res.redirect("/secrets");
            })
        }
    })


    // const username = req.body.username;
    //  const password = md5(req.body.password);
    // const password = req.body.password;
    // bcrypt.hash(password, saltRounds, function (err, hash) {
    //      Store hash in your password DB.
    //     const newUser = new User({
    //         username: username,
    //         password: hash
    //     });
    //     User.findOne({username:username},(err,doc)=>{
    //         if(doc){
    //             res.send(doc.username+' already exist! Click here to login <a href="/login"></a')
    //         }
    //         else{
    //             newUser.save(err => {
    //                 if (!err) {
    //                     res.render("secrets");
    //                 }
    //                 else {
    //                     res.send(err);
    //                 }
    //             });
    //         }
    //     })



    // });
});

app.post("/login", (req, res) => {

    const loggedUser = new User({
        username: req.body.username,
        password: req.body.password
    });

    req.login(loggedUser, (err) => {
        if (err) {
            console.log(err);
            res.redirect("/login");
        }
        else {
            passport.authenticate("local")(req, res, () => {
                res.redirect("/secrets");
            })
        }
    })


    // const username = req.body.username;
    // // const password = md5(req.body.password);
    // const password = req.body.password;
    // User.findOne({ username: username }, (err, doc) => {
    //     if (err) {
    //         console.log(err)
    //     }
    //     else {
    //         if (doc) {
    //            // if (doc.password === password)
    //            bcrypt.compare(password, doc.password, function(err, result) {
    //             if(result===true){

    //                     res.render("secrets");

    //             }
    //             else {
    //                 res.send("invalid password!");
    //             }
    //         });


    //         }
    //     }


    // })
})

app.listen(3000, function () {
    console.log("Server started on port 3000");
});