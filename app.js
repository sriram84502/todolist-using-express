const express = require('express')
const ejs = require('ejs')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
const session = require('express-session')
const mongodbSession = require('connect-mongodb-session')(session)

const app = express()
app.set('view engine','ejs')
app.use(bodyParser.urlencoded({ extended: true }))

//midleware
const isAuth = (req,res,next)=>{
    if(req.session.isLoggedin == true){
        next()
    }else{
        res.redirect('/')
    }
}
const islogin = (req,res,next)=>{
    if(req.session.isLoggedin == true){
        res.redirect('/home')
    }else{
        next()
    }
}


const store = new mongodbSession({
    uri: "mongodb+srv://todos:sai4502@cluster0.risubea.mongodb.net/?retryWrites=true&w=majority",
    collection: 'session'
})
app.use(session({
    secret: "this is secret key",
    resave: false,
    saveUninitialized: false,
    store: store
}))


// todos = []

mongoose.connect('mongodb+srv://todos:sai4502@cluster0.risubea.mongodb.net/?retryWrites=true&w=majority').then(()=>{
    console.log('connected');
})


//Task Schema
const todoSchema = new mongoose.Schema({
    title: {type:String,required:true},
    date: {type:String},
    postedBy: {type:String}
})

const Todos = mongoose.model('todos',todoSchema)


//User Schema
const userSchema = new mongoose.Schema({
    name: {type:String},
    email: {type:String,required:true,unique:true},
    password: {type:String,required:true}
})

const Users = mongoose.model('users',userSchema)

app.get('/',islogin,(req,res)=>{
    res.render('welcome')
})

app.get('/home',isAuth,async(req,res)=>{
    const todos = await Todos.find({postedBy:req.session.user.email})
    res.render('index',{todos:todos,users:req.session.user})
})


app.post('/add-task',(req,res)=>{
    let todo = new Todos({
        title: req.body.task,
        date: req.body.date,
        postedBy: req.session.user.email
    })
    todo.save()
    res.redirect('/home')
})

//login
app.get('/login',islogin,(req,res)=>{
    res.render('login')
})

app.post('/login-user',async(req,res)=>{
    const user = await Users.findOne({email:req.body.email})
    let isPassword = await bcrypt.compare(req.body.password,user.password)
    if(isPassword){
        req.session.isLoggedin = true
        req.session.user = user
        res.redirect('/home')
    }else{
        res.redirect('/login')
    }
})

//signup
app.get('/signup',islogin,(req,res)=>{
    res.render('register')
})

app.post('/add-user',async(req,res)=>{
    let user = new Users({
        name: req.body.name,
        email: req.body.email,
        password: await bcrypt.hash(req.body.password,9)
    })
    user.save()
    res.redirect('/')
})

app.get('/logout',(req,res)=>{
    req.session.destroy()
    res.redirect('/')
})

app.listen(8000, () => {
    console.log('Server running at port 8000');
})