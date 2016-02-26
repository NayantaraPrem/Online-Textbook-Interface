var express = require('express');
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

// Authorization check variables
var isAuthenticated = false;
var selfUserName;

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


/*****************************************************************DEFINE CUSTOM FUNCTIONS*****************************************************************/

/* Authentication check */
function authCheck (userName, res) {
	if (!isAuthenticated || (selfUserName != userName)) {
		selfUserName = '';
		isAuthenticated = false;
		res.redirect('/login');
	}
}

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
	ret(bookname);
}

function generate_filtered_notes(username, bookid, bookname, chapter, filterparams, ret) {
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
					//TODO: can break out of inner for loop here
				}
			}
		}
		console.log(preloaded_notes);
		
		ret(filtered_notes);
	});
}

function get_annt_filter_params(username, bookid, bookname, ret) {
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
		FilterExpression: "#userid = :i and #bkid = :j",
		ExpressionAttributeNames: {
			"#userid" : "userID",
			"#bkid": "bookID"
		},
		ExpressionAttributeValues: {
			":i": username,
			":j": bookid		
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
			console.log("last filter settings:");
			console.log(last_filter_settings);
			filterParams = last_filter_settings.filterParams;
			console.log("last filter params:");
			console.log(filterParams);
			/****** NEED TO DO THIS BY BOOK ******/
			//TODO: combine this with above check
			for (var i = 0; i < visible_users.length; i++) {
				//for (var j = 0; j < filterParams.length; j++) {
				//	if (visible_users[i] == filterParams[j]) {
						new_filter_settings.push(visible_users[i]);
						//TODO: can break out of inner for loop here
					//}
				//}
			}
			console.log("visible users:");
			console.log(visible_users);
			console.log("new filter settings:");
			console.log(new_filter_settings);
			ret(visible_users, new_filter_settings);
		});
	});	
}

/******************************************************************GET FILES*****************************************************************************/
// Get the speedreading js - HACKY
app.get('/:userName/:book/bookmarklet.js', function(req, res){
 res.sendFile(__dirname +"/jetzt/bookmarklet.js");
});
app.get('/:userName/bookmarklet.js', function(req, res){
 res.sendFile(__dirname +"/jetzt/bookmarklet.js");
});

app.get('http://maxcdn.bootstrapcdn.com/bootstrap/3.3.5/css/bootstrap.min.css', function(req, res){
	res.sendFile( "http://maxcdn.bootstrapcdn.com/bootstrap/3.3.5/css/bootstrap.min.css");
});

/* Get XML files */
app.get('/:userName/Books/:book/OPS/:xml', function(req, res){
	authCheck(req.params.userName,res);
	res.sendFile( __dirname + "/public/Books/" + req.params.book + "/OPS/" + req.params.xml);
});

app.get('/:userName/Books/:book/text/:xhtml', function(req, res){
	authCheck(req.params.userName,res);
	res.sendFile( __dirname + "/public/Books/" + req.params.book + "/text/" + req.params.xhtml);
});

/* Get image files */
app.get('/:userName/images/:image', function(req, res){
	authCheck(req.params.userName,res);
	res.sendFile( __dirname + "/public/Books/Combined/OPS/images/" + req.params.image);
});

app.get('/:userName/uploads/:image', function(req, res){
	authCheck(req.params.userName,res);
	res.sendFile( __dirname + "/public/uploads/" + req.params.image);
});

/* Get CSS files */
app.get('/:userName/panels.css', function(req, res){
	authCheck(req.params.userName,res);
	res.sendFile( __dirname + "/public/panels.css");
});

app.get('/panels.css', function(req, res){
	res.sendFile( __dirname + "/public/panels.css");
});

app.get('/login.css', function(req, res){
	res.sendFile( __dirname + "/public/login.css");
});

app.get('/:userName/Books/:book/OPS/css/:css', function(req, res){
	authCheck(req.params.userName,res);
	res.sendFile( __dirname + "/public/Books/" + req.params.book + "/OPS/css/" + req.params.css);
});

app.get('/:userName/css/:css', function(req, res){
	authCheck(req.params.userName,res);
	res.sendFile( __dirname + "/public/Books/Combined/OPS/css/" + req.params.css);
});

app.get('/:userName/dashboard.css', function(req, res){
	authCheck(req.params.userName,res);
	res.sendFile( __dirname + "/public/dashboard.css");
});

/* Get JS files */
app.get('/annotations.js', function(req, res){
	/***** HACK!!!!! **** Combined needs to call with username in url! Need to change! BREACHES SECURITY*/
	res.sendFile( __dirname + "/public/annotations.js");
});


app.get('/:userName/annotations.js', function(req, res){
	/***** HACK!!!!! **** Combined needs to call with username in url! Need to change! BREACHES SECURITY*/
	if (req.params.userName === undefined)
		res.sendFile( __dirname + "/public/annotations.js");
	authCheck(req.params.userName,res);
		res.sendFile( __dirname + "/public/annotations.js");

});

app.get('/:userName/test.js', function(req, res){
	authCheck(req.params.userName,res);
	res.sendFile( __dirname + "/public/test.js");
});


app.get('/:userName/dashboard.js', function(req, res){
	authCheck(req.params.userName,res);
	res.sendFile( __dirname + "/public/dashboard.js");
});

app.get("/:userName/template.js", function(req, res){
	authCheck(req.params.userName,res);
	res.sendFile(__dirname + "/public/template.js");
});






/**********************************************************************LOGIN and LOGOUT**********************************************************************/
//THIS IS THE LOGIN PAGE
app.get(['/','/login'], function(req, res){
  res.sendFile( __dirname + "/login.html");
});

app.get('/logout', function(req, res){
  selfUserName = '';
  isAuthenticated = false;
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
				selfUserName = userid;
				isAuthenticated = true;
				console.log(data);
				res.writeHead(301,
				  {Location: selfUserName + '/home'}
				);
				res.end();
			}
		}
	});
});




/***********************************************************HOME PAGE/ DASHBOARD***************************************************************/
app.get('/:userName/home', function(req,res) {
	var username = req.params.userName;
	authCheck(username,res);
	console.log("Received username: " + username);
	var welcome_msg = "Hello " + username;
	//res.sendFile( __dirname + "/home.html");
	//var path = "Books/Images/";
	var img_paths = ["http://ecx.images-amazon.com/images/I/518k1D%2BJZHL._SX331_BO1,204,203,200_.jpg",
    "http://ecx.images-amazon.com/images/I/51r9QQVSRNL._SX331_BO1,204,203,200_.jpg",
    "http://ecx.images-amazon.com/images/I/71cWa92TMyL.jpg"];
	res.render('dashboard', { welcome_msg: welcome_msg, books: books, imgs:img_paths});
});



/**********************************************************************BOOK DISPLAY**************************************************************/
/* combined display pages */
app.get('/:userName/book:bookId-:bookName/:chapterName', function(req, res){
console.log("****************With Chaptername");
	var bookid = req.params.bookId;
	var username = req.params.userName;
	var display = req.params.chapterName;

	//var bookname = req.params.bookName;
	//TODO: CORRECTLY extract bookname from EPUB and place in URL
	//until then, call the following function to get hardcoded bookname from bookid
	var bookname = 'undefined';
	get_bookname(bookid, function(name){
		bookname = name;
	});
	
	currChapter = display;

	console.log("Displaying book: " + bookid + " - " + bookname + " - " + display);

	authCheck(username,res);

	var visible_users = [];
	var filter_settings = [];
	var filtered_notes = [];

	//TODO: is get/update annt filter settings really needed on these pages? can probably only do once when book first opens
	get_annt_filter_params(username, bookid, bookname, function(visible_users, filter_settings){
		generate_filtered_notes(username, bookid, bookname, display, filter_settings, function(filtered_notes){
			//TODO: now save new_filter_settings
			//TODO: pass "visible_users" and "new_filter_settings" to res.render to populate the annotation filter in the UI
			res.render('book' + bookid + 'combined', { title: bookname, notes: filtered_notes, bookid: bookid, bookname: bookname, pagetodisplay: display, username: username});
		});
	});
});





//URLs to localhost/book<number> is called onclicking the 'get book' button on Home.html
//Given a list of available books, get the chosen number from user
//Based on input, do path-replace logic to decide the correct parent folder path (Book1 or Book2 etc) to append to the href paths in output TOC (book.html). 
//Ensure the parent folder contains the extracted epub and especially the META-INF/conatiner.xml. (Extraction is scripted but can be manual as well
app.get('/:userName/book:bookId=:bookName', function(req, res){
	console.log("****************Without Chaptername");
	var bookid = req.params.bookId;
	var username = req.params.userName;
				
	//var bookname = req.params.bookName;
	//TODO: CORRECTLY extract bookname from EPUB and place in URL
	//until then, call the following function to get hardcoded bookname from bookid
	var bookname = 'undefined';
	get_bookname(bookid, function(name){
		bookname = name;
	});

	currBookID = bookid;

	//var display = req.params.Display;
	//TODO: this is temporary for the main page
	//need to change to correct chapter
	display = bookid + "_main";
	currChapter = display;
		
	console.log("Displaying book: " + bookid + " - " + bookname);

	authCheck(username,res);

	var epubfile = "Public/Books/Book" + bookid + "/" + bookname + ".epub";
	var check_xml = "Public/Books/Book" + bookid + "/META-INF/container.xml";

	fs.stat(check_xml, function(err, stat){
        if (err) { 
			var extract = require('extract-zip');
			var tar = "Public/Books/Book" + bookid + "/";
			extract(epubfile, {dir: tar}, function (err) {
						
			if(err){
				console.log('Error Extracting');
			}
			else
				console.log('Extracting');
		 	});
		}
		else {
			console.log('Already Extracted');
        } 
	});
		
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

	var visible_users = [];
	var filter_settings = [];
	var filtered_notes = [];

	get_annt_filter_params(username, bookid, bookname, function(visible_users, filter_settings){
		//db_interface.updateAnntFilterParams(username, bookid, bookname, filter_settings);
		generate_filtered_notes(username, bookid, bookname, display, filter_settings, function(filtered_notes){
			//TODO: now save new_filter_settings
			//TODO: pass "visible_users" and "new_filter_settings" to res.render to populate the annotation filter in the UI
			res.render('book' + bookid + 'combined', { title: bookname, notes: filtered_notes, bookid: bookid, bookname: bookname, pagetodisplay: display, username: username});
		});
	});
});

app.get('/:userName/book:bookId=:bookName/:chapterName/summary', function(req, res){
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
		bookname = get_book_name(currBookID);
		//var username = req.params.userName;

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

app.get('/:userName/book:bookId=:bookName/summary', function(req, res){
		//var bookid = req.params.bookId;
		var currBookID = req.params.bookId;
		var currChapter = currBookID + "_main";
		console.log("SUMMARIZE ANNOTATIONS for currBookID " + currBookID + " chapter " + currChapter);

		var bookname;
		//var bookname = req.params.bookName;
		//TODO: once privacy settings are stored with corresponding bookid/bookname
		//remove this swtich-case
		bookname = get_book_name(currBookID);
		//var username = req.params.userName;

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



app.get('/:userName/upload_img', function(req, res){
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
	console.log("User: " + selfUserName);
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
		db_interface.addNote(note_item, selfUserName, currBookID, currChapter);
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

//app.post('/:userName/book:bookId=:bookName', function(req, res)
/*app.post('/:userName/summarize_annt', function(req, res){

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
		bookname = get_book_name(bookid);
		//var username = req.params.userName;

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
	db_interface.addNote(img_item, selfUserName, currBookID, currChapter);
	res.end("Image has uploaded.");
});


/*********************************************************************SET PRIVACY**************************************************************/
app.post('/:userName/setprivacy', function(req, res){
  var username = req.params.userName;
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
