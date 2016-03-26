var express = require('express');
var session = require('express-session');
var cookie_parser = require('cookie-parser');
var fs = require('fs');
var bodyParser = require('body-parser');
var converter = require('epub2html');
var replace = require("replace");
var path = require('path');
var db_interface = require('./db_interface.js');
var config = require('./app_config');
var fs = require('fs');
// var screenshot = require('url-to-screenshot');
var webpage = require('webpage');
const crypto = require('crypto');
var phantom = require('phantom');


var AWS = require("aws-sdk");
var dynamodbDoc = new AWS.DynamoDB.DocumentClient();
var books = [ 
				{title:'The War of The Worlds', epub:'The_War_of_The_Worlds'},
				{title:'On The Origin of Species', epub:'On_The_Origin_of_Species'},
				{title:'The Einstein Theory of Relativity', epub:'The_Einstein_Theory_of_Relativity'},
				{title:'A Midsummer Nights Dream', epub:'A_Midsummer_Nights_Dream'},
				{title:'Jane Eyre', epub:'Jane_Eyre'},
				{title:'Dream Psychology', epub:'Dream_Psychology'},
				{title:'Great Expectations', epub:'Great_Expectations'},
				{title:'Macbeth', epub:'Macbeth'},
				{title:'The Count of Monte Cristo', epub:'The_Count_of_Monte_Cristo'},
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
var currTOC = [];
var currBookmarks = [];

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
    	//console.log("session exists for user " + req.session.user);
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
	var bookname = 'ERR_BOOK_NOT_FOUND';
	if (bookid < books.length && bookid > -1)
		bookname = books[bookid].title.split(' ').join('_');
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
	console.log("Filtered annotations");
	db_interface.scanTable(AnnotationsParams, function(err, preloaded_notes){
		for (var i = 0; i < preloaded_notes.length; i++) {
			if(preloaded_notes[i].owner == username){
				filtered_notes.push(preloaded_notes[i]);
				console.log(preloaded_notes[i].NoteID);
			}
			else {
				for (var j = 0; j < filterparams.length; j++) {
					if (preloaded_notes[i].owner == filterparams[j]) {
						filtered_notes.push(preloaded_notes[i]);
						break;
					}
				}
			}
		}
		//console.log(filtered_notes.length);
		
		ret(filtered_notes);
	});
}

function get_annt_filter_params(username, bookid, ret) {
	var all_users = [];
	var visible_users = [];
	var last_filter_settings = [];
	var filterParams = [];
	var new_filter_settings = [];
	var bookname = get_bookname(bookid);

	var UsersParams = {
		TableName: 'PrivacySettings',
		FilterExpression: "#bkname = :i",
		ExpressionAttributeNames: {
			"#bkname": bookname
		},
		ExpressionAttributeValues: {
			":i": "Everyone"			
		}
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

		for (var i = 0; i < all_users.length; i++) {
			if (all_users[i].userId != username) 
				visible_users.push(all_users[i].userId);
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

app.get('/book:bookId-:bookName/uploads/:image', requireLogin, function(req, res){
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

app.get('/book:bookId-:bookName/:chid/require.js', requireLogin, function(req, res){
	res.sendFile( __dirname + "/public/require.js");
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
	var img_paths = [
		"http://covers.feedbooks.net/item/8224.jpg?size=large&t=1404175382",	//The_War_of_The_Worlds
		"http://covers.feedbooks.net/book/3015.jpg?size=large&t=1439158819",	//On_The_Origin_of_Species
		"http://covers.feedbooks.net/book/3591.jpg?size=large&t=1426673750",	//The_Einstein_Theory_of_Relativity
		"http://covers.feedbooks.net/book/2990.jpg?size=large&t=1453264913",	//A_Midsummer_Nights_Dream
		"http://covers.feedbooks.net/book/144.jpg?size=large&t=1439153221",		//Jane_Eyre
		"http://covers.feedbooks.net/book/176.jpg?size=large&t=1425660132",		//Dream_Psychology
		"http://covers.feedbooks.net/book/70.jpg?size=large&t=1439163698",		//Great_Expectations
		"http://covers.feedbooks.net/book/2935.jpg?size=large&t=1425660764",	//Macbeth
		"http://covers.feedbooks.net/book/73.jpg?size=large&t=1439146587"];		//The_Count_of_Monte_Cristo
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
		currBookmarks = [];
		currTOC = [];

		fs.readFile("Public/Books/Book" + bookid + "/TableOfContents.html", 'utf8', function(err, html){
			var titles = html.match(/">.*?</g); //parse all >##chapterTitle##<
			var links = html.match(/href=".*?.xml/g); //parse all href="##chapterLink##.xml
			
			if (titles.length < 1 || links.length < 1 || titles.length != links.length)
				console.log("ERR: parsing TOC");
			
			var wstream = fs.createWriteStream("views/.includes/Book" + bookid + "Sections.jade");
			wstream.write("case pagetodisplay\n");
			
			for (var i = 0; i < titles.length; i++) {
				var t = titles[i];
				t = t.replace("\">","");
				t = t.replace("<","");
				var l = links[i];
				l = l.replace("href=\"OPS","");
				l = l.replace("\.xml","");
				l = l.replace("/","");

				currTOC.push([t, l]);
				wstream.write("  when \"" + l + "\": include ../../Public/Books/Book" + bookid + "/OPS/" + l + ".xml\n");
			}
			
			//console.log("TOC("+currTOC.length+"): "+currTOC);
			
			wstream.write("  default: include ../../Public/Books/Book" + bookid + "/OPS/title.xml");
			wstream.end();
		});
	}
	
	console.log("Displaying book: " + bookid + " - " + bookname + " - " + currChapter);

	var visible_users = [];
	var filter_settings = [];
	var filtered_notes = [];

	//TODO: is get/update annt filter settings really needed on these pages? can probably only do once when book first opens
	get_annt_filter_params(username, bookid, function(visible_users, filter_settings){
		generate_filtered_notes(username, bookid, currChapter, visible_users, function(filtered_notes){
			//TODO: now save new_filter_settings
			res.render('combinedDisplay', { title: bookname, notes: filtered_notes, bookid: bookid, bookname: bookname, pagetodisplay: currChapter, TOC: currTOC, username: username, visible_users: visible_users, filter_settings: filter_settings, bookmarks: currBookmarks });
		});
	});
});

app.get(['/book:bookId-:bookName/:chapterName/summary', '/book:bookId-:bookName/summary'], requireLogin, function(req, res){
		var bookid = req.params.bookId;

		if (req.params.chapterName)
			var currChapter = req.params.chapterName;

		console.log("SUMMARIZE ANNOTATIONS for currBookID " + currBookID);
		
		var bookname = get_bookname(currBookID);
		var username = req.session.user;

		console.log("Loading all annotations for book2");
		var filter_settings = [];
		var visible_users = [];
		var filtered_notes = [];
			

		get_annt_filter_params(username, bookid, function(visible_users, filter_settings){
				generate_filtered_notes(username, bookid, currChapter, visible_users, function(filtered_notes){
					res.render('Summary', { title: bookname, chapter: currChapter, notes: filtered_notes});
			});
		});
});

/*app.get(['/book:bookId-:bookName/summary/download','/book:bookId-:bookName/:chapterName/summary/download'], requireLogin, function(req, res){  
	var summaryPath = '/summary_' + req.params.bookName;
	if (req.params.chapterName) {
		summaryPath += ('_' + req.params.chapterName);
	}
	summaryPath += '.pdf';
	var url = req.protocol + '://' + req.get('host') + req.originalUrl;
	url = url.replace('/download','');
	
	// pdf.create(html, options).toFile(summaryPath, function(err, res) {
	//   if (err) return console.log(err);
	//   console.log(res); // { filename: '/app/businesscard.pdf' } 
	// });
	console.log('PDF: ' + summaryPath);
	console.log('url: ' + url);
	var page = webpage.create();
	page.open(url, function() {
	  page.render(summaryPath);
	  phantom.exit();
	});
	// phantom.create(function(ph){
	//   ph.createPage(function(page) {
	//     page.open('google.com', function(status) {
	//       page.render(summaryPath, function(){

	//         console.log('Page Rendered');
	//         ph.exit();

	//       });
	//     });
	//   });
	// });
	 
	// screenshot(url)
	//   .width(800)
	//   .height(600)
	//   .capture(function(err, img) {
	//     if (err) throw err;
	//     fs.writeFileSync(__dirname + summaryPath, img);
	//     console.log('downloaded screenshot');
	//     res.redirect(url);
	//   });


});*/
 

/*********************************************************************ANNOTATIONS**************************************************************/

//send image upload file
app.get('/upload_img/page=:page', requireLogin, function(req, res){
  	var page = req.params.page;
    var redirect_URL = "http://localhost/api/photo/"+page;
  var policy = {
    "expiration": "2017-01-01T00:00:00Z",
    "conditions": [ 
      {"bucket": "anothercollabbooks"}, 
      ["starts-with", "$key", "photos/"],
      {"acl": "public-read-write"},
      {"success_action_redirect": redirect_URL},
      ["starts-with", "$Content-Type", ""],
      ["content-length-range", 0, 104857600]
    ]
  };
  var strPolicy = JSON.stringify(policy);
  var enc64_policy = Buffer(strPolicy, "utf-8").toString('base64');

  const hmac = crypto.createHmac("sha1", AWS.config.credentials.secretAccessKey);
  hmac.update(new Buffer(enc64_policy, "utf-8"));
  var sign = hmac.digest("base64");


	console.log("Going to upload");
	//	res.sendFile( __dirname + "/" + "upload_img.html" );
  console.log("Policy: "+enc64_policy);
  var fname = 'IMG_' + Date.now();
  console.log("Cred: "+ sign);
	        res.render('upload_img', { page:page, policy:enc64_policy, sign:sign, fname: fname});
});

// that `req.body` will be filled in with the form elements
app.post('/annt_submit_or_edit', function(req, res){
	console.log('Received note:');
	console.log(JSON.stringify(req.body));
	//eg. [{"name":"title","value":"qqq"},{"name":"body","value":"aad"}]
	var title = req.body[0].value;
	var body = req.body[1].value; 
	var id = req.body[2].value;
	var page = req.body[3].value;
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
		db_interface.addNote(note_item, req.session.user, currBookID, currChapter, page);
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


app.get('/api/photo/:page?',function(req, res){
  //0?bucket=anothercollabbooks&key=photos%2FIMG_1459008400097&etag="2b8dfd0b4f949903fb39e421abe1c9f9"

  var page = req.params.page;
  var fname = req.query.key.split("/");
  console.log("Uploading " + fname[1] + " on page "+ page);
  var img_item = {
		"id": fname[1],
		"type": "IMG",
		"img_dest": "http://anothercollabbooks.s3.amazonaws.com/photos/"+fname[1]
		//add owner, timestamp, etc here
	}
	//db_interface.addNote(note_item, req.session.user, currBookID, currChapter, page);
	//commented out for testing purposes
	db_interface.addNote(img_item, req.session.user, currBookID, currChapter, page);
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
	
	res.send(req.body);
});

//update bookmarks
app.post('/update_bookmarks', function(req, res){
	var action = req.body.action;
	var chapter = req.body.chapter;
	var page = req.body.page;
	
	currBookmarks.push([chapter, page]);
	
	res.send(req.body);
});

/*********************************************************************SET PRIVACY**************************************************************/
app.post('/setprivacy', function(req, res){
  var username = req.session.user;
  var textID = req.body.textbookid;
  var textname = get_bookname(textID);
  var privacy_val = req.body.privacy;
  
 // console.log("SET PRIVACY " + privacy_val + " for " + textname + " for user " + username);
  var user = {  "userid":username, "textbook":textname, "privacy":privacy_val};
  //console.log("user text " + user.textbook);
  db_interface.updateUser(user);
});


/******************************************************************************START**********************************************************************/

app.listen(80);
