var db;
var express=require('express');
var request=require('request');
var bodyParser=require('body-parser');
var cookieParser=require('cookie-parser');
var qs = require("querystring");
var OAuth= require('oauth').OAuth;
var path=require("path");
var app=express();
var mongoClient=require('mongodb').MongoClient;
var url="mongodb://localhost:27017/bookTrade";
var uuid=require('node-uuid');
var oauthObj={};
var oauth = new OAuth(
    "https://api.twitter.com/oauth/request_token",
    "https://api.twitter.com/oauth/access_token",
    "wCFONnPC23VM3qxtvYOxug1iu",
    "VAQjANe34K38pYZVo1NbA6MTUpR8fZW9fD571GIQ5FlwI5Hs0q",
    "1.0",
    "http://localhost:8000/sign-in-twitter",
    "HMAC-SHA1"
);
app.set("views","./views");
app.set("view engine","jade");
app.use(express.static(path.join(__dirname,"public")));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));
app.use(cookieParser());
mongoClient.connect(url,function(err,database){
    if(err)
        throw err;
    console.log("connected to database");
    db=database;
    db.collection('sessions').ensureIndex( { "timestamp": 1 }, { expireAfterSeconds: 3600 } );
});
function searchMongo(colName,queryObj,callback){
    db.collection(colName).findOne(queryObj,{_id:0},function(err,doc){
        if(err)
            throw err;
        callback(doc);
    });
}
function insertMongo(colName,doc,callback){
    db.collection(colName).insert(doc,function(err,res){
        if(err)
            throw err;
        console.log(colName+" collection updated");
        if(typeof callback==='function')
            callback();
    });
};

function getBookData(bookName,userName,callback){
    var url="https://www.googleapis.com/books/v1/volumes?q="+bookName+"&orderBy=relevance&key=AIzaSyDaj519-J738-WYcFj7QXjMwJNeWTROVWo";
    request(url,function(error,response,body){
        var bookObj=JSON.parse(body);
        var selectedBook=bookObj["items"][0];
        console.log(selectedBook);
        var bookSelfLink=selectedBook["selfLink"];
        console.log(bookSelfLink);
        var selectBookUrl=bookSelfLink+"?key=AIzaSyDaj519-J738-WYcFj7QXjMwJNeWTROVWo";
        console.log(selectBookUrl);
        request(selectBookUrl,function(error,response,body){
            var bookDetailObj=JSON.parse(body);
            console.log(bookDetailObj);
            var responseObj={};
            responseObj.des=bookDetailObj["volumeInfo"]["description"];
            responseObj.infoLink=bookDetailObj['volumeInfo']["infoLink"];
            responseObj.thumbnail=bookDetailObj['volumeInfo']["imageLinks"]["thumbnail"];
            responseObj.user=userName;
            responseObj.name=bookDetailObj['volumeInfo']["title"];
            responseObj.requested=false;
            db.collection("bookTrade").insert(responseObj,function(err,res){
                if(err)
                    throw err;
                console.log("inserted");
                // removing unnecessary properties of book and only taking
                // necessay ones neeeded to pushed in the users collection
                // it will contian name of the book and its picLink
                var newbook={};
                newbook.name=responseObj.name;
                newbook.picLink=responseObj.thumbnail;
                var tempobj={};
                // this object is for the problem in the updation of the
                // mongodb document which requires literal values so 
                // creating an intermediate object
                tempobj['books']=newbook;
                db.collection("users").update({"user":userName},{$push:tempobj});
                callback(responseObj);

            });
            console.log(responseObj);
            //when the user register make a entry in the database about
            //the no of books they own in the form of an array and when 
            //they add a new book, push the new book in that array.
            // I know this is callback hell and I have to ask a question
            // about what would be better technique to have this done
            // do this later when you have configured the authentication
            // procedure
        });
    });
}

app.use(function(req,res,next){
    console.log("middleware");
    console.log(req.cookies);
    console.log("this is url of request "+req.url);
    req.session={};
    req.session.user=null;
    //why not this working Object.keys(req.cookies).length === 0 && req.cookies.constructor === Object
    if(Object.keys(req.cookies).length === 0){
        var id=uuid.v1();
        console.log("I am coming here inside no cookie zone");
        res.cookie('sessionid', id, { expires: new Date(Date.now() +9800000 ), httpOnly: true }); req.session.sid=id;
        next();
        return;
    }
    req.session.sid=req.cookies['sessionid'];
    var queryObj={"sid":req.session.sid};
    searchMongo("sessions",queryObj,function(doc){
        if(doc!=null)
            req.session.user=doc['user'];
        console.log(req.cookies);
        next();
    });
});


app.get("/",function(req,res){
    console.log(req.session.user);
    if(req.session.user==null){
        db.collection("bookTrade").find({},{_id:0,des:0}).toArray(function(err,data){
            if(err)
                throw err;
            console.log(data);
            res.render("index",{arr:data});
        });
        return;
    }
    db.collection("bookTrade").find({},{_id:0,des:0}).toArray(function(err,data){
        if(err)
            throw err;
        console.log(data);
        res.render("home",{arr:data});
    });
});

app.get("/mybooks",function(req,res){
    console.log(req.session.user);
    if(!req.session.user){
        res.redirect("/");
        return;
    }
    var searchObj={"user":req.session.user};
    searchMongo("users",searchObj,function(doc){
        console.log(doc);
        res.render("mybooks",{userinfo:doc});
    });
});
    
app.get("/signup",function(req,res){
    oauth.getOAuthRequestToken(function(error, oauth_token, oauth_token_secret, results){
        if (error) {
            console.log(error);
            res.send("yeah no. didn't work.")
        }
        else {
            oauthObj.token = oauth_token;
            console.log(oauth_token);
            console.log('oauth.token: ' + oauthObj.token);
            oauthObj.token_secret = oauth_token_secret;
            console.log('oauth.token_secret: ' + oauthObj.token_secret);
            res.redirect('https://twitter.com/oauth/authenticate?oauth_token='+oauth_token)
        }
    });
});

app.get('/sign-in-twitter', function(req, res, next) {
    if (oauthObj) {
        oauthObj.verifier = req.query.oauth_verifier;
        var oauth_data =oauthObj;
        console.log("this is oauth obj\n");
        console.log(oauthObj);
        oauth.getOAuthAccessToken(
            oauth_data.token,
            oauth_data.token_secret,
            oauth_data.verifier,
            function(error, oauth_access_token, oauth_access_token_secret, results) {
                if (error) {
                    console.log(error);
                    res.send("Authentication Failure!");
                }
                else {
                    oauthObj.access_token = oauth_access_token;
                    oauthObj.access_token_secret = oauth_access_token_secret;
                    console.log(results, req.session);
                    //res.send("Authentication Successful");
                    // res.redirect('/'); // You might actually want to redirect!
                    //
                    var obj={"sid":req.session.sid,"user":results['screen_name'],"timestamp":Date()};
                    insertMongo("sessions",obj);
                    var arr=[];
                    var obj={"user":results['screen_name'],"books":arr,"requestIn":arr,"requestOut":arr};
                    insertMongo("users",obj,function(){
                        res.redirect('/');
                        console.log("all inserted");
                    });
                }
            }
        );
    }
}); 

app.get("/booksearch/:bookname",function(req,res){
    if(req.session.user==null){
        res.redirect("/");
        return;
    }
    console.log(req.url);
    var bookName=req.params.bookname;
    console.log(bookName);
    getBookData(bookName,req.session.user,function(data){
        res.status(200);
        res.json(data);
        res.end();
    });
});
app.get("/del/:bookName",function(req,res){
    // you are a very big idiot.Always experiment with the doucments in
    // mongo before inserting and deleting to test whether it works or not
    var bookName=req.params.bookName;;
    var tempObj={};
    tempObj["name"]=bookName;
    var removeObj={};
    removeObj["user"]=req.session.user;
    removeObj["name"]=bookName;
    console.log(removeObj);
    db.collection("bookTrade").removeOne(removeObj,{justOne:true});
    console.log("book deleted");
    db.collection("users").update({"user":req.session.user},{$pop:{"books":{$match:tempObj}}},{multi:false});
    res.status(200);
    res.send("delted ok");
});

app.get("/request",function(req,res){
    console.log(req.url);
    var bookName=req.query.name;
    var owner=req.query.owner;
    console.log(bookName);
    console.log(owner);
    if(owner==req.session.user){
        res.status(200);
        res.end("error");
        return;
    }
    // we need to add two more arrays to the user collections. One for handling
    // the request sent to other user and the other to contain the info about
    // the request which has come to that user.
});

app.listen(8000);
