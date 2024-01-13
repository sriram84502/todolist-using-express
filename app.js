const express = require('express')
const ejs = require('ejs')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
const session = require('express-session')
const { log } = require('console')
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
    postedBy: {type:String},
    name: {type:String},
    time: {type:Date},
    accountType: {type:Number}
})

const Todos = mongoose.model('todos',todoSchema)


//User Schema
const userSchema = new mongoose.Schema({
    name: {type:String},
    email: {type:String,required:true,unique:true},
    password: {type:String,required:true},
    role: {type:Number,default:1},
    accountType: {type:Number,default:1}
})

const Users = mongoose.model('users',userSchema)

app.get('/',islogin,async(req,res)=>{
    const publicTodos = await Todos.find({accountType:0})
    res.render('welcome',{publicTodos:publicTodos})
})

app.get('/home',isAuth,async(req,res)=>{
    const todos = await Todos.find({postedBy:req.session.user.email}).sort({date:1})
    res.render('index',{todos:todos,users:req.session.user})
})


app.post('/add-task',(req,res)=>{
    date_time = new Date()
    let todo = new Todos({
        title: req.body.task,
        date: req.body.date,
        postedBy: req.session.user.email,
        name: req.session.user.name,
        time: date_time,
        accountType: req.session.user.accountType
    })
    todo.save()
    res.redirect('/home')
})

let loginErrorMessage = "hidden"
//login
app.get('/login',islogin,(req,res)=>{
    res.render('login',{error:loginErrorMessage})
})

app.post('/login-user',async(req,res)=>{
    const user = await Users.findOne({email:req.body.email})
    let isPassword = await bcrypt.compare(req.body.password,user.password)
    if(isPassword){
        req.session.isLoggedin = true
        req.session.user = user
        if(user.role == 1){
            res.redirect('/home')
        }else{
            res.redirect('/dashboard')
        }
    }else{
        loginErrorMessage = "display:'none'"
        res.redirect('/login')
    }
})

let registerErrorMessage = "hidden"
//signup
app.get('/signup',islogin,(req,res)=>{
    res.render('register',{error:registerErrorMessage})
})

app.post('/add-user',async(req,res)=>{
    let checkEmail = await Users.findOne({email:req.body.email})
    console.log(checkEmail);
    if(checkEmail == null){
        let user = new Users({
            name: req.body.name,
            email: req.body.email,
            password: await bcrypt.hash(req.body.password,9)
        })
        user.save()
        res.redirect('/')
    }else{
        registerErrorMessage = "display:'none'"
        res.redirect('/signup')
    }
})

app.get('/logout',(req,res)=>{
    req.session.destroy()
    res.redirect('/')
})


//admin dashboard
app.get('/dashboard',async(req,res)=>{
    const users = await Users.find({role:1})
    res.render('dashboard',{user:req.session.user,users:users})
})

//delete users
app.post('/delete-user',async(req,res)=>{
    let deleteusers = await Users.deleteOne({email:req.body.email})
    let tododelete = await Todos.deleteMany({postedBy:req.body.email})
    res.redirect('/dashboard')
})

//delete task
app.post('/delete-task',async(req,res)=>{
    let deletetodo = await Todos.deleteOne({postedBy:req.session.user.email,title:req.body.task
    ,date:req.body.date})
    res.redirect('/home')
})

app.post('/get-info',async(req,res)=>{
    let todos = await Todos.find({postedBy:req.body.email}).sort({date:1})
    res.render('get',{todos:todos,name:req.body.name1})
})


//profile
app.get('/profile',(req,res)=>{
    res.render('profile',{users:req.session.user})
})


//posts
app.get('/posts',isAuth,async(req,res)=>{
    const publicTodos = await Todos.find({postedBy:{$ne:req.session.user.email},accountType:0})
    res.render('posts',{publicTodos:publicTodos})
})

//update user profile
app.post('/update',async(req,res)=>{
    const updateuser = await Users.updateOne({email:req.session.user.email},{$set:{accountType:req.body.acctype-1,name:req.body.uname}})
    req.session.user.name = req.body.uname
    req.session.user.accountType = req.body.acctype-1
    res.redirect('/profile')
})

//search
app.get('/search',(req,res)=>{
    res.render('search')
})

//error
app.get('*',(req,res)=>{
    res.json('Page Not found')
})


app.listen(8000, () => {
    console.log('Server running at port 8000');
})