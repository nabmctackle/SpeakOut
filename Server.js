var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var bcrypt= require('bcrypt')
const saltRounds = 10;
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json()); 
var mongoose = require('mongoose');
var path= require('path');
mongoose.connect('mongodb://localhost/Speakout');
app.use(express.static(__dirname+"/angular-app/dist/angular-app"))
var session = require('express-session')
app.use(session({
    secret: 'keyboardkitteh',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 600000 }
  }))
mongoose.Promise = global.Promise;
var UsersSchema = new mongoose.Schema({
    nickname: {type:String, required:[true,"name required"], minlength:2},
    email: {type:String, required:[true,"email required"], minlength:6},
    password: {type:String, required:[true,"password required"], minlength:1},
    boards: [String]
})
mongoose.model("User", UsersSchema);
var User = mongoose.model('User')
var CommentsSchema =  new mongoose.Schema({
    commenter: UsersSchema,
    content: {type:String, required:[true,"Comment Required"], minlength:6, maxlength:450},
    time: {type:Date, required:[true,"date required"]}
})
mongoose.model("Comment", CommentsSchema)
var Comment = mongoose.model("Comment")
var PostsSchema = new mongoose.Schema({
    title:{type:String,required:[true,"Title Required"], minlength:3, maxlength:30},
    content:{type:String, required:[true,"Content required"], minlength:3, maxlength:450},
    poster:UsersSchema,
    comments:[CommentsSchema],
    board:{type:String, required:[true,"Board Required"]},
    time: {type:Date, required:[true,"date required"]}
})
mongoose.model("Post",PostsSchema)
var Post = mongoose.model("Post")
var BoardsSchema = new mongoose.Schema({
    title:{type:String, required:[true, "Board name Required"], minlength:3, maxlength:20},
    posts:[PostsSchema]
})
mongoose.model("Board", BoardsSchema)
var Board = mongoose.model("Board")

app.listen(8000, function() {
    console.log("listening on port 8000");
})
app.post("/user",function(req,res){
    console.log("/user Post route on server engaged")
    User.findOne({email:req.body.email},function(err,user){
        if(user){
            res.json({status:false,error:{errors:{email:"User is already registered"}}})
        }else{
            if(req.body.password!=req.body.pwc){
                res.json({status:false, error:{errors:{password:"passwords do not match"}}})
            }else{
                bcrypt.hash(req.body.password, saltRounds, function(err,hash){
                    if(err){
                        console.log("failed to bcrypt", err)
                        res.json({status:false, error:{errors:{password:"password could not be bcrypted"}}})
                    }else{
                        var user = new User({nickname:req.body.nickname,email:req.body.email,password:hash})
                        user.save(function(err){
                            if(err){
                                console.log("problem creating new user", err)
                                res.json({status:false, error:err})
                            }else{
                                User.findOne({email:req.body.email},function(err,user){
                                    req.session.userId = user.id;
                                    console.log("succesfully created a new user")
                                    res.json({status:true})
                                })    
                            }})}})}}})})
app.get("/user", function(req,res){
    if(req.session.userId!=undefined){
        console.log("found user,",req.session.userId)
        res.json({status:true, userId : req.session.userId})
    }else{
        console.log("didnt find user,",req.session.userId)
        res.json({status:false})
    }
})
app.post("/post", function(req,res){
    console.log("Making new post")
    
    post = new Post({title:req.body.title, content:req.body.content,userId:req.body.userId, board:req.body.title, time:Date() })
    post.save(function(err){
        if(err){
            console.log("problem creating post",err)
            res.json({status:false})
        }else{
            Board.findOneAndUpdate({title:req.body.board},{$push:{posts:post}}, function(err,boardres){
                console.log(boardres)
                if(err){
                    res.json({status:false})
                }else{
                    console.log("made post")
                    res.json({status:true}) 
                }
                
            })
            
        }
    })
})
app.post("/login", function(req,res){
    console.log("login route is activated")
    User.findOne({email:req.body.email},function(err,user){
        if(user){
            console.log("found user",user)
            bcrypt.compare(req.body.password, user.password, function(err,response){
                if(response){
                    console.log("the password was correct")
                    req.session.userId= user.id;
                    res.json({status:true})
                }
                else{
                    console.log(response)
                    res.json({status:false, error:{errors:{"password":"password incorrect"}}})

                }
            })
        }else{
            console.log("did not find user")
            res.json({status:false, error:{errors:{"email":"the email you entered is not signed up"}}})
        }
    })
})
app.post("/board", function(req,res){
    console.log("/board(1) post route activated")
    Board.findOne({title:req.body.title}, function(err,response){
        if(response!=null){
            res.json({status:false, error:{board:"duplicate board"}})
        }else{
        board = new Board({title:req.body.title})
        board.save(function(err){
            if(err){
                console.log("error in creating new board", err)
                res.json({status:false, error:err})
            }else{
                console.log("made new board succesfully")
                res.json({status:true})
            }
        })
        }
    })
})
app.get("/board",function(req,res){
    console.log("/board(1) get route activated")
    if(req.session.userId!=undefined){
        User.findById(req.session.userId, function(err,user){
            if(err){
                console.log("error in board(1)",err)
                res.json({status:false, error:err})
               
            }else{
                console.log("board(1) got boards", user.boards)
                res.json({status:true, boards:user.boards})
                
            }
        })
    }
    else{
        console.log("board(1) route not logged in")
        res.json({status:false, message:"You are not logged in. To get a list of boards you are subscribed to, Please log in."})
    }
})
app.get("/board/:title",function(req,res){
    console.log("/board/title route activated")
    Board.findOne({title:req.params.title}, function(err,response){
        if(err){
            console.log("error finding board by Title------", err)
            res.json({status:false, error:err})
        }
        else{
            console.log("found board by title", response)
            res.json({status:true, board:response})
        }
    }
)
})
app.get("/boards", function(req,res){
    console.log("/boards get route activated")
    Board.find({}, function(err,boards){
        if(err){
            console.log(boards, "boards-----error")
            console.log(err,"error-------error")
            res.json({status:false,error:err})
        }
        else{
            console.log("Got the boards",boards)
            res.json({status:true,boards:boards})

        }
    })
}
)
app.all("*", (req,res,next) => {
    res.sendFile(path.resolve("./angular-app/dist/angular-app/index.html"))
});