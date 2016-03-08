var express = require('express');
var session = require('express-session');
var cookie_parser = require('cookie-parser');
var fs = require('fs');
var bodyParser = require('body-parser');
var converter = require('epub2html');
var replace = require("replace");
var path = require('path');
var multer = require('multer');
var db_interface = require('./db_interface.js');
var config = require('./app_config');

var AWS = require("aws-sdk");
var dynamodbDoc = new AWS.DynamoDB.DocumentClient();
var books = [ 
				{title:'The War of The Worlds', epub:'testbook'},
				{title:'The Einstein Theory of Relativity', epub:'relativity'},
				{title:'Structure and Interpretation of Computer Programs', epub:'SCMP'}
			];

var Autolinker = require('autolinker');
AWS.config.update({
	region: "us-east-1",
	endpoint: "https://dynamodb.us-east-1.amazonaws.com"
});

var util = require('util');
var log_file = fs.createWriteStream(__dirname + '/debug.log', {flags : 'w'});
var log_stdout = process.stdout;

console.log = function(d) { //
  log_file.write(util.format(d) + '\n');
  log_stdout.write(util.format(d) + '\n');
};

// create our app
var app = express();

// Book Display variables
var currBookID = '';
var currChapter = '';

// app.use(express.static(__dirname + '/public'));

//Set template engine to jade
app.set('view engine', 'jade');

//set path to the views (template) directory
app.set('views', __dirname + '/views');

// instruct the app to use the `bodyParser()` middleware for all routes
app.use(bodyParser.urlencoded({
	extended: true
}));

app.use(bodyParser.json());

// required for session authorization and saving
app.use(cookie_parser());
app.use(session({secret : 'cdw3382sd@q1!oj0odfsidoj2032W?', saveUninitialized : false, resave : true}));

/*****************************************************************DEFINE CUSTOM FUNCTIONS*****************************************************************/

app.use(function(req, res, next) {
    if (req.session && req.session.user) {
    	console.log("session exists for user " + req.session.user);
    	var dynamodb = new AWS.DynamoDB();
		var params = {
			TableName: 'PrivacySettings',
			Key: { 
				"userId" : {
					"S" : req.session.user
				}	
			}
		};
		dynamodb.getItem(params, function(err, data) {
			if (!err && Object.keys(data).length) {
				req.user = data.Item.userId.S;
		        req.session.user = data.Item.userId.S;  //refresh the session value
			}
			// finishing processing the middleware and run the route
      		next();
		});
  	} else {
   		next();
   	}
});

function requireLogin(req, res, next) {
  if (!req.user) {
    res.redirect('/login');
  } else {
    next();
  }
};


var storage = multer.diskStorage({
	destination: function (req, file, cb) {
		cb(null, './public/uploads/')
	},
	filename: function (req, file, cb) {
		cb(null, 'IMG_' + Date.now())
	}
});
var uploading = multer({
	storage:storage
});

function replace_url(from, to) {
	console.log("Going to open file!");
	fs.open('book.html', 'r+', function(err, fd) {
		if (err) {
			return console.error(err);
		}
		console.log("File opened successfully!");     
		
		replace({
			    regex: from ,
			    replacement: to,
			    paths: ['book.html'],
			    recursive: true,
			    silent: true
		});
		console.log('Replace successful!');

		fs.close(fd, function(err){
			if (err){
				console.log(err);
			}
			console.log("File closed successfully.");
        });
	});
}

function get_bookname(bookid) {
	var bookname = 'UNINIT';
	switch(bookid) {
		case '1':
			bookname = 'The_War_of_The_Worlds';
			break;
		case '2':
			bookname = 'The_Einstein_Theory_of_Relativity';
			break;
		case '3':
			bookname = 'Computing';
			break;
		default:
			bookname = 'ERR_BOOK_NOT_FOUND';
	}
	return bookname;
}

function generate_filtered_notes(username, bookid, chapter, filterparams, ret) {
	var preloaded_notes = [];
	var filtered_notes = [];
	
	// Can add more parameters here to filter results
	var AnnotationsParams = {
		TableName: 'Annotations',
		FilterExpression: "#bkid = :i and #chid = :j",
		ExpressionAttributeNames: {
			"#bkid": "bookID",
			"#chid": "chapter"
		},
		ExpressionAttributeValues: {
			":i": bookid,
			":j": chapter			
		}
	};
	
	// Here we compile a subset of "preloaded_notes" to display to the user
	// based on "filterparams"
	// (1) For each note in "preloaded_notes", if the owner is the current user or 
	// the owner is in the "filterparams" list, 
	// add this note to "filtered_notes"
	db_interface.scanTable(AnnotationsParams, function(err, preloaded_notes){
		for (var i = 0; i < preloaded_notes.length; i++) {
			for (var j = 0; j < filterparams.length; j++) {
				if (preloaded_notes[i].owner == username ||
					preloaded_notes[i].owner == filterparams[j]) {
					filtered_notes.push(preloaded_notes[i]);
					break;
				}
			}
		}
		//console.log(preloaded_notes);
		
		ret(filtered_notes);
	});
}

function get_annt_filter_params(username, bookid, ret) {
	var all_users = [];
	var visible_users = [];
	var last_filter_settings = [];
	var filterParams = [];
	var new_filter_settings = [];

	var UsersParams = {
		TableName: 'PrivacySettings'
	};

	var FilterParams = {
		TableName: 'AnnotationsFilter',
		FilterExpression: "#key = :i",
		ExpressionAttributeNames: {
			"#key": "user:book"
		},
		ExpressionAttributeValues: {
			":i": username + ":book" + bookid			
		}
	};

	// Here we compare Privacy Settings for all registered users
	// Users with "Public" notes are added to the "visble_users" list
	// (1) Get list of all users
	// (2) For each user, check saved Privacy Setting for current book 
	// (3) If user has set notes to "Public", add this user to "visible_users"	
	db_interface.scanTable(UsersParams, function(err, all_users){

		// now determine which users have public notes
		//TODO: add this filter to scanTable params later

		for (var i = 0; i < all_users.length; i++) {
			if (all_users[i].userId != username) {			
				switch (bookid) {
					case '1':
						if (all_users[i].The_War_of_The_Worlds == 'Everyone') {
							visible_users.push(all_users[i].userId);
						}
						break;
					case '2':
						if (all_users[i].The_Einstein_Theory_of_Relativity == 'Everyone') {
							visible_users.push(all_users[i].userId);
						}
						break;
					case '3':
						if (all_users[i].Computing == 'Everyone') {
							visible_users.push(all_users[i].userId);
						}
						break;
				}
			}
		}

		// Now we must compare the current set of visible users to the last saved 
		// filter settings in case a user's notes is no longer visible (newly "Private")
		// (1) Get the "last_filter_settings" for the current user
		// (2) For each "visible_users", check if this user is in the 
		// "last_filter_settings" list for the current book; if they are, 
		// add this user to "new_filter_settings"
		// (3) Save the "new_filter_settings" in the DB
		db_interface.scanTable(FilterParams, function(err, last_filter_settings){
			if (last_filter_settings.length > 1)
				console.log("multiple --last_filter_settings-- found for user:" + username + ", bookid:" + bookid);
			else if (last_filter_settings.length == 1)
				lastFilterParams = last_filter_settings[0].filterParams;
			else
				lastFilterParams = [];
			/****** NEED TO DO THIS BY BOOK ******/
			//TODO: combine this with above check
			for (var i = 0; i < visible_users.length; i++) {
				for (var j = 0; j < lastFilterParams.length; j++) {
					if (visible_users[i] == lastFilterParams[j]) {
						new_filter_settings.push(visible_users[i]);
						break;
					}
				}
			}
			//console.log("********** Visible Users **********");
			//console.log(visible_users);
			//console.log("********** Last Filter Settings **********");
			//console.log(last_filter_settings);
			//console.log("********** New Filter Settings **********");
			//console.log(new_filter_settings);
			//console.log("********** END **********");
			
			ret(visible_users, new_filter_settings);
		});
	});	
}

/******************************************************************GET FILES*****************************************************************************/
// Get the speedreading js - HACKY
app.get('/:book/bookmarklet.js', function(req, res){
 res.sendFile(__dirname +"/jetzt/bookmarklet.js");
});
app.get('/bookmarklet.js', function(req, res){
 res.sendFile(__dirname +"/jetzt/bookmarklet.js");
});

app.get('http://maxcdn.bootstrapcdn.com/bootstrap/3.3.5/css/bootstrap.min.css', function(req, res){
	res.sendFile( "http://maxcdn.bootstrapcdn.com/bootstrap/3.3.5/css/bootstrap.min.css");
});

/* Get XML files */
app.get('/Books/:book/OPS/:xml', requireLogin, function(req, res){
	res.sendFile( __dirname + "/public/Books/" + req.params.book + "/OPS/" + req.params.xml);
});

app.get('/Books/:book/text/:xhtml', requireLogin, function(req, res){
	res.sendFile( __dirname + "/public/Books/" + req.params.book + "/text/" + req.params.xhtml);
});

/* Get image files */
app.get('/images/:image', requireLogin, function(req, res){
	res.sendFile( __dirname + "/public/Books/Combined/OPS/images/" + req.params.image);
});

app.get('/uploads/:image', requireLogin, function(req, res){
	res.sendFile( __dirname + "/public/uploads/" + req.params.image);
});

/* Get CSS files */
app.get('/panels.css', requireLogin, function(req, res){
	res.sendFile( __dirname + "/public/panels.css");
});

app.get('/book:bookId-:bookName/:chid/summary.css', requireLogin, function(req, res){
	res.sendFile( __dirname + "/public/summary.css");
});

app.get('/login.css', function(req, res){
	res.sendFile( __dirname + "/public/login.css");
});

app.get('/Books/:book/OPS/css/:css', requireLogin, function(req, res){
	res.sendFile( __dirname + "/public/Books/" + req.params.book + "/OPS/css/" + req.params.css);
});

app.get('/css/:css', requireLogin, function(req, res){
	res.sendFile( __dirname + "/public/Books/Combined/OPS/css/" + req.params.css);
});

app.get('/dashboard.css', requireLogin, function(req, res){
	res.sendFile( __dirname + "/public/dashboard.css");
});

/* Get JS files */
app.get('/jquery.textpager.js', function(req, res){
	res.sendFile( __dirname + "/public/jQuery-Plugin-Pagination/jquery.textpager.js");
});

app.get('/annotations.js', requireLogin, function(req, res){
	res.sendFile( __dirname + "/public/annotations.js");
});

app.get('/book:bookId-:bookName/:chid/summary.js', requireLogin, function(req, res){
	res.sendFile( __dirname + "/public/summary.js");
});

app.get('/book:bookId-:bookName/annotations.js', requireLogin, function(req, res){
		res.sendFile( __dirname + "/public/annotations.js");
});

app.get('/test.js', requireLogin, function(req, res){
	res.sendFile( __dirname + "/public/test.js");
});


app.get('/dashboard.js', requireLogin, function(req, res){
	res.sendFile( __dirname + "/public/dashboard.js");
});

app.get("/template.js", requireLogin, function(req, res){
	res.sendFile(__dirname + "/public/template.js");
});






/**********************************************************************LOGIN and LOGOUT**********************************************************************/
//THIS IS THE LOGIN PAGE
app.get(['/','/login'], function(req, res){
  res.sendFile( __dirname + "/login.html");
});

app.get('/logout', function(req, res){
  req.session.destroy();
  res.redirect('/login');
});

// that `req.body` will be filled in with the form elements
app.post('/login', function(req, res){
	var userid = req.body.userId;
	var password = req.body.password;

	var dynamodb = new AWS.DynamoDB();
	var params = {
		TableName: 'PrivacySettings',
		Key: { 
			"userId" : {
				"S" : userid
			}	
		}
	};
	dynamodb.getItem(params, function(err, data) {
		if (err) console.log(err, err.stack);
		else {
			if (!Object.keys(data).length || (data.Item.password.S != password)) {
				console.log('Invalid credentials!');
				res.redirect('/login?e=InvalidCredentials');
			} else {
				// Found username & password in database
				// set cookie with user's info
				req.session.user = userid;
				console.log("user id in session is " + req.session.user);
				res.writeHead(301,
				  {Location:'/home'}
				);
				res.end();
			}
		}
	});
});




/***********************************************************HOME PAGE/ DASHBOARD***************************************************************/
app.get('/home', requireLogin, function(req,res) {
	var username = req.session.user;
	//console.log("Received username: " + username);
	var welcome_msg = "Hello " + username;
	//res.sendF/ile( __dirname + "/home.html");
	//var path = "Books/Images/";
	var img_paths = ["http://ecx.images-amazon.com/images/I/518k1D%2BJZHL._SX331_BO1,204,203,200_.jpg",
    "http://ecx.images-amazon.com/images/I/51r9QQVSRNL._SX331_BO1,204,203,200_.jpg",
    "http://ecx.images-amazon.com/images/I/71cWa92TMyL.jpg"];
	res.render('dashboard', { welcome_msg: welcome_msg, books: books, imgs:img_paths});
});



/**********************************************************************BOOK DISPLAY**************************************************************/
/* combined display pages */
app.get('/book:bookId-:bookName/:chapterName', requireLogin, function(req, res){
	var bookid = req.params.bookId;
	var username = req.session.user;

	//var bookname = req.params.bookName;
	//TODO: CORRECTLY extract bookname from EPUB and place in URL
	//until then, call the following function to get hardcoded bookname from bookid
	var bookname = get_bookname(bookid);
	
	currChapter = req.params.chapterName;
	
	if(bookid != currBookID){
		console.log("new book");
		//this is a new book
		//need to extract the EPUB
		
		//Given a list of available books, get the chosen number from user
		//Based on input, do path-replace logic to decide the correct parent folder path (Book1 or Book2 etc) to append to the href paths in output TOC (book.html). 
		//Ensure the parent folder contains the extracted epub and especially the META-INF/conatiner.xml. (Extraction is scripted but can be manual as well
		
		var epubfile = "Public/Books/Book" + bookid + "/" + bookname + ".epub";
		var check_ToC = "Public/Books/Book" + bookid + "/TableOfContents.html";

		fs.stat(check_ToC, function(err, stat){
			if (err) { 
				var extract = require('extract-zip');
				var tar = "Public/Books/Book" + bookid + "/";
				
				extract(epubfile, {dir: tar}, function (err) {	
					if(err){
						console.log('Error Extracting');
					}
					else{
						console.log('Extracting');
						
						//now generate Table of Contents
						converter.parse(epubfile, function (err, epubData) {		
							var htmlData = converter.convertMetadata(epubData);
							console.log(htmlData); //Debugging

							//USE FILE WRITE INSTEAD
							fs.writeFile('Public/Books/Book' + bookid + '/TableOfContents.html', htmlData.htmlNav, function (err) {
								if (err) return console.log(err);
								console.log('htmlNav successfully sent to book.html!');
							});
			
							var find = "href=\"" ;
							var rep = "href=\"Books/Book" + bookid + "/";
							replace_url(find, rep);
						});
					}
				});
			}
			else {
				console.log('Already Extracted');
			} 
		});
		
		currBookID = bookid;
	}
	
	console.log("Displaying book: " + bookid + " - " + bookname + " - " + currChapter);

	var visible_users = [];
	var filter_settings = [];
	var filtered_notes = [];

	//TODO: is get/update annt filter settings really needed on these pages? can probably only do once when book first opens
	get_annt_filter_params(username, bookid, function(visible_users, filter_settings){
		generate_filtered_notes(username, bookid, currChapter, filter_settings, function(filtered_notes){
			//TODO: now save new_filter_settings
			res.render('combinedDisplay', { title: bookname, notes: filtered_notes, bookid: bookid, bookname: bookname, pagetodisplay: currChapter, username: username, visible_users: visible_users, filter_settings: filter_settings });
		});
	});
});

app.get('/book:bookId-:bookName/:chapterName/summary', requireLogin, function(req, res){
		//var bookid = req.params.bookId;
		var currBookID = req.params.bookId;
		var currChapter = req.params.chapterName;
		//console.log("SUMMARIZE ANNOTATIONS for:" + bookid);
		console.log("SUMMARIZE ANNOTATIONS for currBookID " + currBookID);
		// = bookid + "_main";

		var bookname;
		//var bookname = req.params.bookName;
		//TODO: once privacy settings are stored with corresponding bookid/bookname
		//remove this swtich-case
		bookname = get_bookname(currBookID);
		//var username = req.session.user;

		console.log("Loading all annotations for book2");
		var all_annts = [];
		//var filtered_notes = [];
		//var users = [];
		//var filtered_users = [username];

		// Can add more parameters here to filter results
		var AnnotationsParams = {
			TableName: 'Annotations',
			FilterExpression: "#bkid = :i and #chid = :j",
			ExpressionAttributeNames: {
				"#bkid": "bookID",
				"#chid": "chapter"
			},
			ExpressionAttributeValues: {
				":i": currBookID,
				":j": currChapter			
			}
		};

		db_interface.scanTable(AnnotationsParams, function(err, all_annts){
			console.log("Received all annotations");
			for (var j = 0; j < all_annts.length; j++) {
				console.log("all annotations are: " + all_annts[j].info.title);
			}
			res.render('Summary', { title: bookname, chapter: currChapter, notes: all_annts});
		//res.render('book' + bookid + 'combined', { title: bookname, notes: filtered_notes, bookid: bookid, bookname: bookname, pagetodisplay: "toADD", username: username});
		});

		//res.send(req.body);
});

app.get('/book:bookId=:bookName/summary', requireLogin, function(req, res){
		//var bookid = req.params.bookId;
		var currBookID = req.params.bookId;
		var currChapter = currBookID + "_main";
		console.log("SUMMARIZE ANNOTATIONS for currBookID " + currBookID + " chapter " + currChapter);

		var bookname;
		//var bookname = req.params.bookName;
		//TODO: once privacy settings are stored with corresponding bookid/bookname
		//remove this swtich-case
		bookname = get_bookname(currBookID);
		//var username = req.session.user;

		console.log("Loading all annotations for book2");
		var all_annts = [];
		//var filtered_notes = [];
		//var users = [];
		//var filtered_users = [username];

		// Can add more parameters here to filter results
		var AnnotationsParams = {
			TableName: 'Annotations',
			FilterExpression: "#bkid = :i and #chid = :j",
			ExpressionAttributeNames: {
				"#bkid": "bookID",
				"#chid": "chapter"
			},
			ExpressionAttributeValues: {
				":i": currBookID,
				":j": currChapter			
			}
		};

		db_interface.scanTable(AnnotationsParams, function(err, all_annts){
			console.log("Received all annotations");
			for (var j = 0; j < all_annts.length; j++) {
				console.log("all annotations are: " + all_annts[j].info.title);
			}
			res.render('Summary', { title: bookname, chapter: currChapter, notes: all_annts});
		});

});

/*********************************************************************ANNOTATIONS**************************************************************/



app.get('/upload_img', requireLogin, function(req, res){
	res.sendFile( __dirname + "/" + "upload_img.html" );
});

// that `req.body` will be filled in with the form elements
app.post('/annt_submit_or_edit', function(req, res){
	console.log('Received note:');
	console.log(JSON.stringify(req.body));
	//eg. [{"name":"title","value":"qqq"},{"name":"body","value":"aad"}]
	var title = req.body[0].value;
	var body = req.body[1].value; 
	var id = req.body[2].value;
	// hyperlink potential links in annotation
	var linkedBody = Autolinker.link(body);
	linkedBody = "<p>" + linkedBody + "</p>";
	console.log("Title: " + title);
	console.log("Body: " + linkedBody);
	console.log('------------------------------------------');
	var arr = id.split('_');
	if(arr[1] === undefined){ 
	//new submit (doesnt have a legit annotation id yet)
		console.log("Submitting");
		// add annotation to DB here
		id = "ANNT_" + Date.now();
		var note_item = {
			"id": id,
			"type":"TXT",
			"title":title,
			"body":linkedBody
		}
		db_interface.addNote(note_item, req.session.user, currBookID, currChapter);
		res.send(linkedBody);
	} else{
		console.log("Editing");
		var note;
		db_interface.updateNote(id, title, body);
		res.send(linkedBody);
	}	
});


// Deal with deleting annotations
app.post('/delete_annt', function(req, res){
	console.log("Received annt to delete @:");
	console.log(req.body.id);
	//eg. {"id":"IMG_1452462043143"}
	var noteID = req.body.id;
	
	console.log('------------------------------------------');

	db_interface.deleteItem(noteID);
	res.send(req.body);
});

//app.post('/book:bookId=:bookName', function(req, res)
/*app.post('/summarize_annt', function(req, res){

		console.log("****************Without Display");
		//var bookid = req.params.bookId;
		var bookid = 2;
		//console.log("SUMMARIZE ANNOTATIONS for:" + bookid);
		currBookID = "1";
		console.log("SUMMARIZE ANNOTATIONS for currBookID " + currBookID);
		// = bookid + "_main";

		var bookname;
		//var bookname = req.params.bookName;
		//TODO: once privacy settings are stored with corresponding bookid/bookname
		//remove this swtich-case
		bookname = get_bookname(bookid);
		//var username = req.session.user;

		console.log("Loading all annotations for book2");
		var all_annts = [];
		//var filtered_notes = [];
		//var users = [];
		//var filtered_users = [username];

		// Can add more parameters here to filter results
		var AnnotationsParams = {
			TableName: 'Annotations',
			FilterExpression: "#bkid = :i",
			ExpressionAttributeNames: {
				"#bkid": "bookID"
			},
			ExpressionAttributeValues: {
				":i": currBookID			
			}
		};

		db_interface.scanTable(AnnotationsParams, function(err, all_annts){
			console.log("Received all annotations");
			for (var j = 0; j < all_annts.length; j++) {
				console.log("all annotations are: " + all_annts[j].info.title);
			}
			res.send(all_annts);
		//res.render('book' + bookid + 'combined', { title: bookname, notes: filtered_notes, bookid: bookid, bookname: bookname, pagetodisplay: "toADD", username: username});
		});

		//res.send(req.body);
});
*/


//Uploading images
app.post('/api/photo', uploading.single('pic'), function(req, res){
	
	// refresh the '/annotations' html page here
	// ...
	// add image to db
	var img_item = {
		"id": req.file.filename,
		"type": "IMG",
		"img_dest": "./uploads/"+req.file.filename
		//add owner, timestamp, etc here
	}
	//commented out for testing purposes
	db_interface.addNote(img_item, req.session.user, currBookID, currChapter);
	res.end("Image has uploaded.");
});


//Update annotation filter settings
app.post('/update_annt_filter', function(req, res){
	var action = req.body.action;
	var user = req.body.user;
	//console.log("update_annt_filter req: [" + action + ", " + user + "]");
	
	//TODO: currently using get_annt_filter_params() b/c already available
	//can probably use less costly fcn instead or 
	//store the filter settings and eliminate db reads here
	get_annt_filter_params(req.session.user, currBookID, function(visible_users, filter_settings){
		//console.log("old: " + filter_settings);
		
		if (action == "add") {
			filter_settings.push(user);
		}
		else if (action == "remove") {
			var index = filter_settings.indexOf(user);
			if (index > -1) {
				filter_settings.splice(index, 1);
			}
			else
				console.log("updating annt filter settings: removing user already removed");
		}
		else
			console.log("updating annt filter settings: unknown action");
		
		//console.log("new: " + filter_settings);
		db_interface.updateAnntFilterParams(req.session.user, currBookID, filter_settings);
	});
	
	//TODO(fix): updating annt filter settings require page refresh by user to take effect
	res.send(req.body);
});


/*********************************************************************SET PRIVACY**************************************************************/
app.post('/setprivacy', function(req, res){
  var username = req.session.user;
  var textID = req.body.textbookid;
  var textname= books[textID].title.split(' ').join('_');
  var privacy_val = req.body.privacy;
  
 // console.log("SET PRIVACY " + privacy_val + " for " + textname + " for user " + username);
  var user = {  "userid":username, "textbook":textname, "privacy":privacy_val};
  //console.log("user text " + user.textbook);
  db_interface.updateUser(user);
});


/******************************************************************************START**********************************************************************/

app.listen(80);
