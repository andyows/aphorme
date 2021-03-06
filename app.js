var PORT = 8080;
var express = require("express");
var mongoose = require("mongoose");
var crypto = require('crypto');

var mongoURI = process.env.MONGOHQ_URL || 'mongodb://localhost/SomeDb';
var db = mongoose.connect(mongoURI);
// const sessions = require("client-sessions");

var Schema = mongoose.Schema;
var UserEntity = new Schema({
  email : String,
  password_hash : String,
  city: String,
  state: String,
  country: String,
  origin: String
});

var TermEntity = new Schema({
  term: String,
  bit: String,
  byte: String,
  batch: String,
  origin: String,
  related_terms: String,
  user_id: String
});

var User= mongoose.model('UserCollection', UserEntity);
var Term = mongoose.model('TermCollection', TermEntity);
var VersionTerm = mongoose.model('VersionTermCollection', TermEntity);

var Posts = new Schema({
  name : String,
});
mongoose.model('Post', Posts);

function deleteTerm(term_id) {
 Term.remove({ _id: term_id }, function(err) {
    if (!err) {
            console.log("removed");
    }
    else {
            console.log("error");
    }
  }); 
}

function createNewUser(email, password_hash, req, res){
    var user = new User({email:email, password_hash:password_hash});
    user.save(function(err){
      console.log("saving");
        if(!err){
            console.log('User saved.');
	    console.log("id = " + user._id);
	    req.session.session_id = user._id;
	    req.session.email = user.email;
	    req.session.save();
	    res.redirect("/");

        } else {
	    res.redirect("/error");
	}
    });
}

function createNewTerm(term, bit, byte, batch, origin, related_terms, user_id, res) {
    var term = new Term({term: term, bit:bit, byte:byte, batch: batch, origin:origin, related_terms: related_terms, user_id: user_id});
    term.save(function(err){
      console.log("saving");
        if(!err){
            console.log('Term saved.');
	    res.redirect("/alphabetical");

        } else {
	  res.redirect("/error");
	}
    });
}
function checkSignedIn(req) {
 console.log(req.session.session_id);
 if(typeof req.session.session_id === 'undefined' || req.session.session_id == 'None'){
   // your code here.
   console.log("false");
   return false;
 }; 
 console.log("true");
 return true;
}

function quickRedirect(res, url) {
  res.redirect(url); 
}
  
var app = express();
var path = require('path');

var hash_salt = "9eir9234jlt90sgdj2390";

app.configure(function(){
  app.use(express.bodyParser());
  app.use(express.cookieParser());
  app.use(express.session({secret: 'secret_key'}));
  app.use(app.router);

});
// special handling of the root folder
app.use(express.static(path.join(__dirname, 'public')));

app.get("/", function(req, res){
  console.log(req.session.session_id);
  var signed_in = checkSignedIn(req);
  res.render('template.ejs', {
    layout:false,
    signed_in: signed_in
  });
});

app.get("/about", function(req, res){
  var signed_in = checkSignedIn(req);

  res.render('about.ejs', {
    layout:false,
    signed_in: signed_in
  });
});

app.get("/edit", function(req, res){
  var signed_in = checkSignedIn(req);
  if (signed_in == true) {
    // get term_id, run a search, send an object
    console.log("term_id = " + req.query.term_id);
    var terms = Term.find({_id: req.query.term_id}, function(err,q){
      var signed_in = checkSignedIn(req);
      res.render('edit.ejs', {
      layout:false,
      signed_in: signed_in,
      terms: q
    });
    });
  } else {
    res.redirect('/signin');
  }
});

app.get("/contact", function(req, res){
  var signed_in = checkSignedIn(req);
  res.render('contact.ejs', {
    layout:false,
    signed_in: signed_in
  });
});

app.get("/signup", function(req, res){
  var signed_in = checkSignedIn(req);
  res.render('signup.ejs', {
    layout:false,
    signed_in: signed_in
  });
});
app.post('/signup', function(request, response){
//     console.log(request.body.password);
    var shasum = crypto.createHash('sha1');
    shasum.update(request.body.password + hash_salt);
    var d = shasum.digest('hex');
    console.log(d)
    createNewUser(request.body.email, d, request, response);

});

app.post('/search', function(req, res){
//     console.log(request.body.password);
    search_term = req.body.search_term;
    Term.find({term: new RegExp(search_term, "i")}, function(err,q){
        console.log(q[0]);
        if (typeof q[0] === 'undefined') {

	  res.redirect("/search");
	} else {
	  console.log("success");
	    var signed_in = checkSignedIn(req);
	    res.render('search_list.ejs', {
	      layout:false,
	      signed_in: signed_in,
	      terms: q
	    });
	  
	}
    });

});



app.get("/guide", function(req, res){
  var signed_in = checkSignedIn(req);
  res.render('guide.ejs', {
    layout:false,
    signed_in: signed_in
  });
});

app.get("/alphabetical", function(req, res){
  console.log("/a");
  var terms = Term.find({}, function(err,q){
    var signed_in = checkSignedIn(req);
    console.log(terms);
    res.render('search_alphabetically.ejs', {
    layout:false,
    signed_in: signed_in,
    terms: q
  });
  });

});

app.get("/search", function(req, res){
  var signed_in = checkSignedIn(req);
  res.render('search_keyword.ejs', {
    layout:false,
    signed_in: signed_in
  });
});

app.get("/signin", function(req, res){
  console.log(req.session.session_id);
  var signed_in = checkSignedIn(req);
  res.render('signin.ejs', {
    layout:false,
    signed_in: signed_in
  });
});

app.post('/signin', function(req, res){
//     console.log(request.body.password);
    var shasum = crypto.createHash('sha1');
    shasum.update(req.body.password + hash_salt);
    var d = shasum.digest('hex');
    User.find({email: new RegExp('^'+req.body.email+'$', "i"), password_hash: d}, function(err,q){
        console.log(q[0]);
        if (typeof q[0] === 'undefined') {

	  res.redirect("/signin");
	} else {
  
	  req.session.session_id = q[0]._id;
	  req.session.email = q[0].email;
	  req.session.save();
	  console.log(req.session.session_id);
	  console.log(q[0]._id);
	  res.redirect("/");
	}
    });
});

app.post('/add', function(req, res){
//     console.log(request.body.password);
    var signed_in = checkSignedIn(req);
    if (signed_in == true) {
      
      bit = req.body.bit;
      byte = req.body.byte;
      batch = req.body.batch;
      origin = req.body.origin;
      term = req.body.term;
      related_terms = req.body.related_terms;
      user_id = req.session.session_id;
      
      createNewTerm(term, bit, byte, batch, origin, related_terms, user_id, res);
    } else {
      res.redirect("/signin");
    }
});


app.post('/edit', function(req, res){
//     console.log(request.body.password);
    var signed_in = checkSignedIn(req);
    if (signed_in == true) {
      bit = req.body.bit;
      byte = req.body.byte;
      batch = req.body.batch;
      origin = req.body.origin;
      term = req.body.term;
      related_terms = req.body.related_terms;
      term_id = req.body.term_id
      user_id = req.session.session_id;
      delete req.body.term_id;
      console.log(term_id);
      console.log("before update");

      Term.update({_id: req.body.term_id}, {$set: req.body}, {upsert: true}, function() {
	var url = "/term?term_id=" + term_id;
	console.log("in update");
	console.log(url)
	res.redirect(url); 


      });
    
    } else {
      res.redirect("/signin"); 
    }
    

});

app.get("/add", function(req, res){
  var signed_in = checkSignedIn(req);
  if (signed_in == false) {
    res.redirect('/signin');
  }
  res.render('add_term.ejs', {
    layout:false,
    signed_in: signed_in

  });
});
app.get("/view", function(req, res){
  var signed_in = checkSignedIn(req);
  res.render('view_example.ejs', {
    layout:false,
    signed_in: signed_in

  });
});

app.get("/error", function(req, res){
  var signed_in = checkSignedIn(req);
  res.render('error.ejs', {
    layout:false,
    signed_in: signed_in

  });
});
app.get("/logout", function(req, res){
  var signed_in = checkSignedIn(req);
  if (signed_in == false) {
    res.redirect('/signin');
  } else {
    req.session.session_id = "None";
    res.redirect('/signin');
  }

});
app.get("/term", function(req, res){
  var signed_in = checkSignedIn(req);
  console.log("term_id = " + req.query.term_id);
  var terms = Term.find({_id: req.query.term_id}, function(err,q){
    var signed_in = checkSignedIn(req);
    res.render('view_term.ejs', {
    layout:false,
    signed_in: signed_in,
    terms: q
  });
  });

});
app.get("/settings", function(req, res){
  var signed_in = checkSignedIn(req);
  if (signed_in == true) {
    res.redirect('/signin');
  }
  res.render('user_settings.ejs', {
    layout:false,
  signed_in: signed_in

});
  
  

});
// startup this server
app.listen(process.env.PORT || PORT)
console.log("Server on port %s", PORT);
