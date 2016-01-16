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
				{title:'Testbook', epub:'testbook'},
				{title:'The Einstein Theory of Relativity', epub:'relativity'},
				{title:'Computing', epub:'SCMP'},
				{title:'Test Combined', epub:'combined'}
			];

var Autolinker = require('autolinker');
// create our app
var app = express();

// Authorization check variables
var isAuthenticated = false;
var selfUserName;

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

/* Authentication check */
function authCheck (userName) {
	if (!isAuthenticated || (selfUserName != userName)) {
		res.status(401).end();
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

app.get('http://maxcdn.bootstrapcdn.com/bootstrap/3.3.5/css/bootstrap.min.css', function(req, res){
	res.sendFile( "http://maxcdn.bootstrapcdn.com/bootstrap/3.3.5/css/bootstrap.min.css");
});

/* Get XML files */
app.get('/:userName/Books/:book/OPS/:xml', function(req, res){
	authCheck(req.params.userName);
	res.sendFile( __dirname + "/public/Books/" + req.params.book + "/OPS/" + req.params.xml);
});

app.get('/:userName/Books/:book/text/:xhtml', function(req, res){
	authCheck(req.params.userName);
	res.sendFile( __dirname + "/public/Books/" + req.params.book + "/text/" + req.params.xhtml);
});

/* Get image files */
app.get('/:userName/images/:image', function(req, res){
	authCheck(req.params.userName);
	res.sendFile( __dirname + "/public/Books/Combined/OPS/images/" + req.params.image);
});

app.get('/:userName/uploads/:image', function(req, res){
	authCheck(req.params.userName);
	res.sendFile( __dirname + "/public/uploads/" + req.params.image);
});

/* Get CSS files */
app.get('/:userName/panels.css', function(req, res){
	authCheck(req.params.userName);
	res.sendFile( __dirname + "/public/panels.css");
});

app.get('/panels.css', function(req, res){
	res.sendFile( __dirname + "/public/panels.css");
});

app.get('/login.css', function(req, res){
	res.sendFile( __dirname + "/public/login.css");
});

app.get('/:userName/', function(req, res){
	authCheck(req.params.userName);
	res.sendFile( __dirname + "/public/panels.css");
});

app.get('/:userName/Books/:book/OPS/css/:css', function(req, res){
	authCheck(req.params.userName);
	res.sendFile( __dirname + "/public/Books/" + req.params.book + "/OPS/css/" + req.params.css);
});

app.get('/:userName/css/:css', function(req, res){
	authCheck(req.params.userName);
	res.sendFile( __dirname + "/public/Books/Combined/OPS/css/" + req.params.css);
});

app.get('/:userName/dashboard.css', function(req, res){
	authCheck(req.params.userName);
	res.sendFile( __dirname + "/public/dashboard.css");
});

/* Get JS files */

app.get('/:userName/resizable_panels.js', function(req, res){
	authCheck(req.params.userName);
	res.sendFile( __dirname + "/public/resizable_panels.js");
});

app.get('/:userName/test.js', function(req, res){
	authCheck(req.params.userName);
	res.sendFile( __dirname + "/public/test.js");
});


app.get('/:userName/dashboard.js', function(req, res){
	res.sendFile( __dirname + "/public/dashboard.js");
});

app.get("/:userName/template.js", function(req, res){
	res.sendFile(__dirname + "/public/template.js");
});

/* Get HTML files */
app.get('/:userName/combined', function(req, res){
	authCheck(req.params.userName);
	res.sendFile( __dirname + "/public/Books/Combined/OPS/title.html" );
});
app.get('/:userName/:html.html', function(req, res){
	authCheck(req.params.userName);
	var id = req.params.html; 
	res.sendFile( __dirname + "/public/Books/Combined/OPS/" + id + ".html" );
});
app.get('/:userName/similar.html', function(req, res){
	res.sendFile( __dirname + "/public/Books/Combined/OPS/similar.html" );
});
app.get('/:userName/about.html', function(req, res){
	res.sendFile( __dirname + "/public/Books/Combined/OPS/about.html" );
});

// A browser's default method is 'GET', so this
// is the route that express uses when we visit
// our site initially.
app.get('/:userName/annotations', function(req, res){
   var username = req.params.userName;
   authCheck(username);
   console.log("Loading preloaded notes");
   var preloaded_notes = [];
   
   db_interface.scanTable(config.amazondb.annotationTable, function(err, preloaded_notes){
		console.log(preloaded_notes);
		res.render('index', { title: 'Notes', notes: preloaded_notes});
	});  

});
/*
app.get('/get_annt_bodies', function(req, res){
   console.log("get_annt_bodies");
   var preloaded_notes = [];
   
   db_interface.scanTable(config.amazondb.annotationTable, function(err, preloaded_notes){
		res.sendFile('index', { title: 'Annotations', notes: preloaded_notes});
	});  

}*/

//THIS IS THE LOGIN PAGE
app.get(['/','/login'], function(req, res){
  res.sendFile( __dirname + "/login.html");
});

// that `req.body` will be filled in with the form elements
app.post('/login', function(req, res){
	console.log('Received user id:');
	var userid = req.body.userId;
	console.log(userid);
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
			if (!Object.keys(data).length) {
				console.log('Invalid user id!');
				res.redirect('/login?e=usernameNotValid');
			} else {
				// Found username in database
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
	// search for userid in db, if present, redirect to home page
	

	//res.send(req.body);
});

app.get('/:userName/home', function(req,res) {
	var username = req.params.userName;
	authCheck(username);
	console.log("Received username: " + username);
	var welcome_msg = "Hello " + username;
	//res.sendFile( __dirname + "/home.html");
	//var path = "Books/Images/";
	//var img_paths = [path +"testing", path +"relativity.jpg", path +"computing"];
	var img_paths = ["https://bookshoptalk.files.wordpress.com/2011/10/generic-book-cover.jpg?w=190"]
	res.render('dashboard', { welcome_msg: welcome_msg, books: books, imgs:img_paths});
});

//URLs to localhost/book<number> is called onclicking the 'get book' button on Home.html
//Given a list of available books, get the chosen number from user
//Based on input, do path-replace logic to decide the correct parent folder path (Book1 or Book2 etc) to append to the href paths in output TOC (book.html). 
//Ensure the parent folder contains the extracted epub and especially the META-INF/conatiner.xml. (Extraction is scripted but can be manual as well

app.get('/:userName/book:bookId=:bookName', function(req, res){
		var bookid = req.params.bookId;
		var bookname = req.params.bookName;
		var username = req.params.userName;
		console.log("app.get book" + bookid + " " + bookname + " username " + username);
		authCheck(username);
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

			//THIS METHOD DOESN'T WORK:
			//document.write(htmlData);

			//USE FILE WRITE INSTEAD
			fs.writeFile('book.html', htmlData.htmlNav, function (err) {
		 	 if (err) return console.log(err);
		 	 console.log('htmlNav successfully sent to book.html!');
			});
			
	/*
			fs.appendFile('book.html', htmlData.htmlMetas, function (err) {
		 	 if (err) return console.log(err);
		 	 console.log('htmlMetas successfully sent to book.html!');
			});

			fs.appendFile('book.html', htmlData.htmlMetaList, function (err) {
		 	 if (err) return console.log(err);
		 	 console.log('htmlMetaList successfully sent to book.html!');
			}); 
	*/
				var find = "href=\"" ;
				var rep = "href=\"Books/Book" + bookid + "/";
				replace_url(find, rep);
		});


  res.sendFile( __dirname + "/" + "book.html" );


});

app.get('/:userName/upload_img', function(req, res){
	res.sendFile( __dirname + "/" + "upload_img.html" );
});

/* DEFAULT APP.GET */
// app.get('/:username/:restUrl', function(req,res) {
// 	authCheck(req.params.userName);
// 	res.sendFile( __dirname + "/" + restUrl);
// });

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
		db_interface.addItem(note_item);
	} else{
		console.log("Editing");
		db_interface.updateItem(id, title, body);
	}
	res.send(linkedBody);
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
	db_interface.addItem(img_item);
	res.end("Image has uploaded.");
});

app.post('/:userName/setprivacy', function(req, res){
  var username = req.params.userName;
  var textID = req.body.textbookid;
  var privacy_val = req.body.privacy;
  
	console.log("SET PRIVACY " + privacy_val + " for " + books[textID] + " for user " + username);
});

app.listen(80);
