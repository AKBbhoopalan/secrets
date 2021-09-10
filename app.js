//jshint esversion:6
require("dotenv").config()
const express = require("express");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const mongoose = require("mongoose")
const session = require("express-session")
const passport = require("passport")
const passportLocal = require("passport-local")
const passportLocalMongoose = require("passport-local-mongoose")
const GoogleStrategy = require("passport-google-oauth20").Strategy
const findOrCreate = require("mongoose-findorcreate")


const app = express();


app.use(express.static("public"))
app.set('view engine', 'ejs')
app.use(bodyParser.urlencoded({extended: true}))

app.use(session({
  secret: "Our little secret",
  resave: false,
  saveUninitialized: false
}))
app.use(passport.initialize())
app.use(passport.session())

/*************************** MONGOOSE ******************************/

mongoose.connect("mongodb+srv://admin-AKB:admin123@cluster1.okmp4.mongodb.net/userDB")

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  secret: String
})

userSchema.plugin(passportLocalMongoose)
userSchema.plugin(findOrCreate);

const User = mongoose.model("User", userSchema)

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id)
})

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user)
  })
})

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
    // userProfileURL:"https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    // console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));


/*******************************************************************/


app.get("/", (req, res)=>{
  res.render("home")
})
app.get("/login", (req, res)=>{
  res.render("login")
})
app.get("/register", (req, res)=>{
  res.render("register")
})


app.get("/auth/google",
passport.authenticate('google', {
  scope: ['profile']
}));

app.get("/auth/google/secrets",
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect secret.
    res.redirect("/secrets");
  });

app.get("/secrets", (req, res)=>{
  User.find({"secret": {$ne: null}}, function(err, result){
    if (err) {
      console.log(err);
    } else {
      if (result) {
        res.render("secrets", {userWithSecret: result})
      }
    }
  })
})

app.get("/submit", (req, res)=>{
  if(req.isAuthenticated()){
    res.render("submit")
  }else{
    res.redirect("/login")
  }
})

app.post("/submit", (req, res)=>{
  const submittedSecret = req.body.secret

  User.findById(req.user.id, function(err, result){
    if (err) {
      console.log(err);
    }else{
      if(result){
        result.secret = submittedSecret
        result.save(function(){
          res.redirect("/secrets")
        })
      }
    }
  })
})

app.get("/logout", (req, res)=>{
  req.logout()
  res.redirect("/")
})


app.post("/register", (req, res)=>{
  User.register({username:req.body.username}, req.body.password, function(err, newUser){
    if (err) {
      console.log(err);
      res.redirect("/register")
    }else {
      passport.authenticate("local")(req, res, function(){
        res.redirect("/secrets")
      })
    }
  })
})


app.post("/login", (req, res)=>{

  const user = new User({
    username: req.body.username,
    password: req.body.password
  })
  req.login(user, function(err){
    if (err) {
      console.log(err);
    }else{
      passport.authenticate("local")(req, res, function(){
        res.redirect("/secrets")
      })
    }
  })
})

let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}


app.listen(port, (req, res)=>{
  console.log("server has started Successfully");
})
