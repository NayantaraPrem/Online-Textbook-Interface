//Copyright 2013-2014 Amazon.com, Inc. or its affiliates. All Rights Reserved.
//Licensed under the Apache License, Version 2.0 (the "License"). 
//You may not use this file except in compliance with the License. 
//A copy of the License is located at
//
//    http://aws.amazon.com/apache2.0/
//
//or in the "license" file accompanying this file. This file is distributed 
//on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, 
//either express or implied. See the License for the specific language 
//governing permissions and limitations under the License.

//Get modules.
var express = require('express');
var app = express();
//var routes = require('./routes');
var http = require('http');
var path = require('path');
var fs = require('fs');
var AWS = require('aws-sdk');

var session = require('./node_modules/express-session');
var cookie_parser = require('./node_modules/cookie-parser');
var converter = require('./node_modules/epub2html');
var replace = require('./node_modules/replace');
var extract = require('./node_modules/extract-zip');
var bodyParser = require('./node_modules/body-parser');
var multer = require('./node_modules/multer');
var s3 = require('./node_modules/multer-s3');
var Autolinker = require('./node_modules/autolinker');
var snsclient = require('./node_modules/aws-snsclient');
var util = require('./node_modules/util');
//var webpage = require('./node-modules/webpage');
//var phantom = require('./node-modules/phantom');

var db_interface = require('./db_interface.js');
//var config = require('./app_config');
//Read config values from a JSON file.
var config = fs.readFileSync('./app_config.json', 'utf8');
config = JSON.parse(config);



var dynamodbDoc = new AWS.DynamoDB.DocumentClient();
var books = [ 
				{title:'The War of The Worlds', epub:'The_War_of_The_Worlds'},
				{title:'On The Origin of Species', epub:'On_The_Origin_of_Species'},
				{title:'Theory of Relativity', epub:'The_Einstein_Theory_of_Relativity'},
				{title:'A Midsummer Nights Dream', epub:'A_Midsummer_Nights_Dream'},
				{title:'Jane Eyre', epub:'Jane_Eyre'},
				{title:'Dream Psychology', epub:'Dream_Psychology'},
				{title:'Great Expectations', epub:'Great_Expectations'},
				{title:'Macbeth', epub:'Macbeth'},
				{title:'The Count of Monte Cristo', epub:'The_Count_of_Monte_Cristo'}
			];

// Book Display variables
var currBookID = '';
var currChapter = '';
var currTOC = [];
var currBookmarks = [];
var antupdated = [0,0,0,0];
var tot_users = 4;

var notif_send = " ";
var notif_rcvd = [" No new Updates ", " No new Updates ", " No new Updates ", " No new Updates "];
var sns = new AWS.SNS({endpoint: 'https://sns.us-east-1.amazonaws.com', region: 'us-east-1', apiVersion: '2010-03-31'});

var log_file = fs.createWriteStream(__dirname + '/debug.log', {flags : 'w'});
var log_stdout = process.stdout;


// Instruct the app to use the `bodyParser()` middleware for all routes
app.use(bodyParser.urlencoded({
	extended: true
}));
app.use(bodyParser.json());

// required for session authorization and saving
app.use(cookie_parser());
app.use(session({secret : 'cdw3382sd@q1!oj0odfsidoj2032W?', saveUninitialized : false, resave : true}));


console.log = function(d) { //
  log_file.write(util.format(d) + '\n');
  log_stdout.write(util.format(d) + '\n');
};

var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, __dirname + "/public/uploads/");
        console.log("INSIDE MULTER " + JSON.stringify(file,null));

    },
    filename: function (req, file, cb) {
        cb(null, 'IMG_' + Date.now());
        console.log("INSIDE MULTER 2" + JSON.stringify(file,null));

  }
});

var uploading = multer({
    storage:storage
});



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


/*Replace Book Parent Path URL*/
function replace_url(from, to) {
	console.log("Going to open file!");
	fs.open('./public/book.html', 'r+', function(err, fd) {
		   if (err) {
		       return console.error(err);
		   }
		  console.log("File opened successfully!");     
		
  		replace({
			    regex: from ,
			    replacement: to,
			    paths: ['./public/book.html'],
			    recursive: true,
			    silent: true,
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

function user_num(usname) {
	var usnum = 0;
	switch(usname) {
		case 'test_user1':
			usnum = 1;
			break;
		case 'test_user2':
			usnum = 2;
			break;
		case 'test_user3':
			usnum = 3;
			break;
		case 'test_user4':
			usnum = 3;
			break;
		default:
			usnum = 0;
	}
	return usnum;
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


function snspub(msg, id){

	var sub = " ";
	switch(id) {
		case '1':
			sub = "1";
			break;
		case '2':
			sub = "2";
			break;
		case '3':
			sub = "3";
			break;
		default:
			sub = "4";
	}

	//Publish to each topic. That is, every user's homepage/dashboard. So 4 users = 4 home pages = 4 topics. So publish 4 times. 
	sns.publish({
	   	TopicArn:'arn:aws:sns:us-east-1:029106798731:NOTIF',
	    //TargetArn:'arn:aws:sns:us-west-2:302467918846:MyTestTopik:613ee49c-d4dc-4354-a7e6-c1d9d8277c56', 
	    Message: msg, 
	    Subject: sub}, 
	    function(err,data){
	    if (err){
	        console.log("Topic 1 Error sending a message "+err);
	        }else{
	       console.log("Topic 1 Sent message: "+data.MessageId);
	       console.log("Topic 1 Sent message type: "+data.Type);

	        }
	 });

}

/*******************************************************SET UP EXPRESS AND GET FILES*****************************************************************************/

app.set('port', process.env.PORT || 3000);
// GET /templates/index.html etc.
//app.use('/templates', express.static(__dirname + '/public'));
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));
app.locals.theme = process.env.THEME; //Make the THEME environment variable available to the app. 


AWS.config.update({
    region: "us-east-1",
    endpoint: "https://dynamodb.us-east-1.amazonaws.com"
});

app.get('http://maxcdn.bootstrapcdn.com/bootstrap/3.3.5/css/bootstrap.min.css', function(req, res){
	res.sendfile( "http://maxcdn.bootstrapcdn.com/bootstrap/3.3.5/css/bootstrap.min.css");
});

app.get('http://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.4.0/css/font-awesome.min.css', function(req, res){
	res.sendfile( "http://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.4.0/css/font-awesome.min.css");
});




/* Get XML files */
app.get('/Books/:book/OPS/:xml', requireLogin, function(req, res){
	res.sendfile( __dirname + "/public/Books/" + req.params.book + "/OPS/" + req.params.xml);
});

app.get('/Books/:book/text/:xhtml', requireLogin, function(req, res){
	res.sendfile( __dirname + "/public/Books/" + req.params.book + "/text/" + req.params.xhtml);
});

/* Get image files */
/*app.get('/:userName/images/:image', function(req, res){
	authCheck(req.params.userName);
	res.sendfile( __dirname + "/public/Books/Combined/OPS/images/" + req.params.image);
});
*/

app.get('/uploads/:image', requireLogin, function(req, res){
	res.sendfile( __dirname + "/public/uploads/" + req.params.image);
});



/* Get CSS files */
app.get('/animate.css', function(req, res){
	res.sendFile( __dirname + "/public/animate.css");
});

app.get('/style.css', function(req, res){
	res.sendFile( __dirname + "/public/style.css");
});


app.get('/panels.css', requireLogin, function(req, res){
	res.sendfile( __dirname + "/public/panels.css");
});

app.get('/book:bookId-:bookName/:chid/summary.css', requireLogin, function(req, res){
	res.sendfile( __dirname + "/public/summary.css");
});


app.get('/Books/:book/OPS/css/:css', requireLogin, function(req, res){
	res.sendfile( __dirname + "/public/Books/" + req.params.book + "/OPS/css/" + req.params.css);
});

app.get('/dashboard.css', requireLogin, function(req, res){
	res.sendfile( __dirname + "/public/dashboard.css");
});



/* Get JS files */
app.get('/annotations.js', requireLogin, function(req, res){
	res.sendfile( __dirname + "/public/annotations.js");
});


app.get('/book:bookId-:bookName/annotations.js', requireLogin, function(req, res){
		res.sendfile( __dirname + "/public/annotations.js");
});

app.get('/book:bookId-:bookName/:chid/summary.js', requireLogin, function(req, res){
	res.sendfile( __dirname + "/public/summary.js");
});

app.get('/test.js', requireLogin, function(req, res){
	res.sendfile( __dirname + "/public/test.js");
});


app.get('/dashboard.js', requireLogin, function(req, res){
	res.sendfile( __dirname + "/public/dashboard.js");
});

app.get("/template.js", requireLogin, function(req, res){
	res.sendfile(__dirname + "/public/template.js");
});

// Get the speedreading js - HACKY
app.get('/:book/bookmarklet.js', function(req, res){
 res.sendfile(__dirname +"/jetzt/bookmarklet.js");
});
app.get('/bookmarklet.js', function(req, res){
 res.sendfile(__dirname +"/jetzt/bookmarklet.js");
});

app.get('/jquery.textpager.js', function(req, res){
	res.sendfile( __dirname + "/public/jQuery-Plugin-Pagination/jquery.textpager.js");
});


/*********************************************************************ANNOTATIONS**************************************************************/

//send image upload file
app.get('/upload_img/page=:page', requireLogin, function(req, res){
		var page = req.params.page;
		console.log("Going to upload");
	//	res.sendFile( __dirname + "/" + "upload_img.html" );
	        res.render('upload_img', { page:page});
});

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

		notif_send = "Book " + currBookID + " | Chapter " + currChapter + " | Annotation added by: " + req.session.user;
		console.log(notif_send);		
		snspub(notif_send, currBookID);
		res.send(linkedBody);
	} else{
		console.log("Editing");
		var note;
		db_interface.updateNote(id, title, body);
		notif_send = "Book " + currBookID + " | Chapter " + currChapter + " | Annotation edited by: " + req.session.user;
		console.log(notif_send);		
		snspub(notif_send, currBookID);

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

	notif_send = "Book " + currBookID + " | Chapter " + currChapter + " | Annotation deleted by: " + req.session.user;
	console.log(notif_send);		
	snspub(notif_send, currBookID);
	db_interface.deleteItem(noteID);
	res.send(req.body);

});


//Uploading images
app.post('/api/photo/:page', uploading.single('pic'), function(req, res){
	
	console.log("/api/photo/:page");
	// refresh the '/annotations' html page here
	// ...
	// add image to db
	var page = req.params.page;
	console.log("Uploading " + req.file.filename + 'to page#' + page);
	var img_item = {
		"id": req.file.filename,
		"type": "IMG",
		"img_dest": __dirname + "/uploads/"+req.file.filename
		//add owner, timestamp, etc here
	}
	//db_interface.addNote(note_item, req.session.user, currBookID, currChapter, page);
	//commented out for testing purposes
	db_interface.addNote(img_item, req.session.user, currBookID, currChapter, page);
	notif_send = "Book " + currBookID + " | Chapter " + currChapter + " | Image added by: " + req.session.user;
	console.log(notif_send);		
	snspub(notif_send, currBookID);
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
  
  //console.log("SET PRIVACY " + privacy_val + " for " + textname + " for user " + username);
  var user = {  "userid":username, "textbook":textname, "privacy":privacy_val};
  //console.log("user text " + user.textbook);
  db_interface.updateUser(user);
});


/***********************************************************************GET BOOK**************************************************************/



//Given a list of available books, get the chosen number from user
//Based on input, do path-replace logic to decide the correct parent folder path (Book1 or Book2 etc) to append to the href paths in output TOC (book.html). 
//Ensure the parent folder contains the extracted epub and especially the META-INF/conatiner.xml. (Extraction is scripted but can be manual as well


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
		
		var epubfile = __dirname + "/" + "public/Books/Book" + bookid + "/" + bookname + ".epub";
		var check_ToC = __dirname + "/" + "/public/Books/Book" + bookid + "/TableOfContents.html";

		fs.stat(check_ToC, function(err, stat){
			if (err) { 
				var extract = require('extract-zip');
				var tar = "public/Books/Book" + bookid + "/";
				
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
							fs.writeFile('./public/Books/Book' + bookid + '/TableOfContents.html', htmlData.htmlNav, function (err) {
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
		currTOC = [];
		currBookmarks = [];
		fs.readFile(__dirname + "/" + "public/Books/Book" + bookid + "/TableOfContents.html", 'utf8', function(err, html){
			var titles = html.match(/">.*?</g); //parse all >##chapterTitle##<
			var links = html.match(/href=".*?.xml/g); //parse all href="##chapterLink##.xml
			
			if (titles.length < 1 || links.length < 1 || titles.length != links.length)
				console.log("ERR: parsing TOC");
			
			var wstream = fs.createWriteStream(__dirname + "/" + "views/.includes/Book" + bookid + "Sections.jade");
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
				wstream.write("  when \"" + l + "\": include ../../public/Books/Book" + bookid + "/OPS/" + l + ".xml\n");
			}
			
			//console.log("TOC("+currTOC.length+"): "+currTOC);
			
			wstream.write("  default: include ../../public/Books/Book" + bookid + "/OPS/title.xml");
			wstream.end();
		});
	}
	
	console.log("Displaying book: " + bookid + " - " + bookname + " - " + currChapter);

	var visible_users = [];
	var filter_settings = [];
	var filtered_notes = [];
	var au = user_num(req.session.user);
	au = au-1;
	console.log("AU minus 1 is " + au);
	if(antupdated[au]==1)
		antupdated[au] = 0;

	else
		notif_rcvd[au] = " No new updates ";


	var notif_msg = notif_rcvd[au];
	//TODO: is get/update annt filter settings really needed on these pages? can probably only do once when book first opens
	get_annt_filter_params(username, bookid, function(visible_users, filter_settings){
		generate_filtered_notes(username, bookid, currChapter, visible_users, function(filtered_notes){
			//TODO: now save new_filter_settings
			res.render('combinedDisplay', { title: bookname, notes: filtered_notes, notif_msg: notif_msg, bookid: bookid, bookname: bookname, pagetodisplay: currChapter, TOC: currTOC, username: username, visible_users: visible_users, filter_settings: filter_settings, bookmarks: currBookmarks });
			
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
					res.render('summary', { title: bookname, chapter: currChapter, notes: filtered_notes});
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


/***********************************************************HOME PAGE/ DASHBOARD***************************************************************/
//GET home page
app.get('/home', requireLogin, function(req,res) {
	var username = req.session.user;
	//console.log("Received username: " + username);
	var welcome_msg = "Hello " + username;
	//res.sendfile( __dirname + "/home.html");
	//var path = "Books/Images/";
	var img_paths = [		
		"http://covers.feedbooks.net/item/8224.jpg?size=large&t=1404175382",
		"http://covers.feedbooks.net/book/3015.jpg?size=large&t=1439158819",
		"http://covers.feedbooks.net/book/3591.jpg?size=large&t=1426673750",
		"http://covers.feedbooks.net/book/2990.jpg?size=large&t=1453264913",
		"http://covers.feedbooks.net/book/144.jpg?size=large&t=1439153221",
		"http://covers.feedbooks.net/book/176.jpg?size=large&t=1425660132",
		"http://covers.feedbooks.net/book/70.jpg?size=large&t=1439163698",
		"http://covers.feedbooks.net/book/2935.jpg?size=large&t=1425660764",
		"http://covers.feedbooks.net/book/73.jpg?size=large&t=1439146587"];
	res.render('dashboard', { welcome_msg: welcome_msg, books: books, imgs:img_paths});

});

//POST AWS SNS Notifications to home page
app.post('/home', function(req,res) {
		//console.log("POST Received username: " + usnam);
		console.log("Checking for SNS");
		
		/*if (req.body.type== "SubscriptionConfirmation"){
			   confirm_req = "https://sns.us-east-1.amazonaws.com/?Action=ConfirmSubscription&TopicArn="+tARN+"&Token="+tok;
			   res.send(confirm_req);
			   console.log("RETURNS 1");
			}
		

		var jsonString = '';

        req.on('data', function (data) {
            jsonString += data;
        });

        console.log("json parsing ");
        var tARN3 = JSON.parse(jsonString.TopicARN);
        var type = JSON.parse(jsonString.Type);
        var tok = JSON.parse(jsonString.Token);
        req.on('end', function () {
            console.log(JSON.parse(jsonString));
        });

		console.log("tarn3 "+tARN3+" type "+type + " tok "+tok);
		console.log("RETURNS 2");*/
	var client = snsclient(function(err, message) {
		    console.log("snsclient msg: "+message.Message);
		    console.log("Annotations Have been Updated again!");

		    for(var j =0; j<tot_users; j++){
			antupdated[j]=1;
			console.log("antupdated of " + j  + " is = "+ antupdated[j]);
			notif_rcvd[j] = message.Message;
			console.log("nr of" + j  + " is = "+ notif_rcvd[j]);
		    }

		});
		return client(req,res);
});



/******************************************************************************LOGIN**********************************************************************/
//THIS IS THE LOGIN PAGE
app.get(['/','/login'], function(req, res){
  res.sendfile( __dirname + "/login.html");
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
				console.log("user id in session is " + req.session.user)
				res.writeHead(301,
				  {Location:'/home'}
				);
				res.end();
			}
		}
	});
});

/******************************************************************************START**********************************************************************/
http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

