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
var books = ["Testbook", "The Einstein Theory of Relativity", "Computing"];
AWS.config.update({
    region: "us-east-1",
    endpoint: "https://dynamodb.us-east-1.amazonaws.com"
});
// create our app
var app = express();
app.use(express.static(__dirname + '/public'));

//Set template engine to jade
app.set('view engine', 'jade');

//set path to the views (template) directory
app.set('views', __dirname + '/views');

//Create table (only do this once, then comment it out)
//db_interface.createTable(config.amazondb.annotationTable, "NoteID", "S");

// instruct the app to use the `bodyParser()` middleware for all routes
app.use(bodyParser.urlencoded({
	extended: true
}));
app.use(bodyParser.json());

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
  //console.log(word);

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

app.get('/:userName/dashboard.css', function(req, res){
	res.sendFile( __dirname + "/public/dashboard.css");
});

app.get('/:userName/dashboard.js', function(req, res){
	res.sendFile( __dirname + "/public/dashboard.js");
});

app.get('/panels.css', function(req, res){
	res.sendFile( __dirname + "/public/panels.css");
});

app.get('/combined', function(req, res){
	res.sendFile( __dirname + "/public/Books/Combined/OPS/title.html" );
});
app.get('/main1.html', function(req, res){
	res.sendFile( __dirname + "/public/Books/Combined/OPS/main1.html" );
});
app.get('/main2.html', function(req, res){
	res.sendFile( __dirname + "/public/Books/Combined/OPS/main2.html" );
});
app.get('/main3.html', function(req, res){
	res.sendFile( __dirname + "/public/Books/Combined/OPS/main3.html" );
});
app.get('/main4.html', function(req, res){
	res.sendFile( __dirname + "/public/Books/Combined/OPS/main4.html" );
});
app.get('/main5.html', function(req, res){
	res.sendFile( __dirname + "/public/Books/Combined/OPS/main5.html" );
});
app.get('/main6.html', function(req, res){
	res.sendFile( __dirname + "/public/Books/Combined/OPS/main6.html" );
});
app.get('/main7.html', function(req, res){
	res.sendFile( __dirname + "/public/Books/Combined/OPS/main7.html" );
});
app.get('/main8.html', function(req, res){
	res.sendFile( __dirname + "/public/Books/Combined/OPS/main8.html" );
});
app.get('/main9.html', function(req, res){
	res.sendFile( __dirname + "/public/Books/Combined/OPS/main9.html" );
});
app.get('/main10.html', function(req, res){
	res.sendFile( __dirname + "/public/Books/Combined/OPS/main10.html" );
});
app.get('/main11.html', function(req, res){
	res.sendFile( __dirname + "/public/Books/Combined/OPS/main11.html" );
});
app.get('/main12.html', function(req, res){
	res.sendFile( __dirname + "/public/Books/Combined/OPS/main12.html" );
});
app.get('/main13.html', function(req, res){
	res.sendFile( __dirname + "/public/Books/Combined/OPS/main13.html" );
});
app.get('/main14.html', function(req, res){
	res.sendFile( __dirname + "/public/Books/Combined/OPS/main14.html" );
});
app.get('/main15.html', function(req, res){
	res.sendFile( __dirname + "/public/Books/Combined/OPS/main15.html" );
});
app.get('/main16.html', function(req, res){
	res.sendFile( __dirname + "/public/Books/Combined/OPS/main16.html" );
});
app.get('/main17.html', function(req, res){
	res.sendFile( __dirname + "/public/Books/Combined/OPS/main17.html" );
});
app.get('/main18.html', function(req, res){
	res.sendFile( __dirname + "/public/Books/Combined/OPS/main18.html" );
});
app.get('/main19.html', function(req, res){
	res.sendFile( __dirname + "/public/Books/Combined/OPS/main19.html" );
});
app.get('/main20.html', function(req, res){
	res.sendFile( __dirname + "/public/Books/Combined/OPS/main20.html" );
});
app.get('/main21.html', function(req, res){
	res.sendFile( __dirname + "/public/Books/Combined/OPS/main21.html" );
});
app.get('/main22.html', function(req, res){
	res.sendFile( __dirname + "/public/Books/Combined/OPS/main22.html" );
});
app.get('/main23.html', function(req, res){
	res.sendFile( __dirname + "/public/Books/Combined/OPS/main23.html" );
});
app.get('/main24.html', function(req, res){
	res.sendFile( __dirname + "/public/Books/Combined/OPS/main24.html" );
});
app.get('/main25.html', function(req, res){
	res.sendFile( __dirname + "/public/Books/Combined/OPS/main25.html" );
});
app.get('/main26.html', function(req, res){
	res.sendFile( __dirname + "/public/Books/Combined/OPS/main26.html" );
});
app.get('/main27.html', function(req, res){
	res.sendFile( __dirname + "/public/Books/Combined/OPS/main27.html" );
});
app.get('/main28.html', function(req, res){
	res.sendFile( __dirname + "/public/Books/Combined/OPS/main28.html" );
});
app.get('/main29.html', function(req, res){
	res.sendFile( __dirname + "/public/Books/Combined/OPS/main29.html" );
});
app.get('/similar.html', function(req, res){
	res.sendFile( __dirname + "/public/Books/Combined/OPS/similar.html" );
});
app.get('/about.html', function(req, res){
	res.sendFile( __dirname + "/public/Books/Combined/OPS/about.html" );
});

// A browser's default method is 'GET', so this
// is the route that express uses when we visit
// our site initially.
app.get('/annotations', function(req, res){
   console.log("Loading preloaded notes");
   var preloaded_notes = [];
   
   db_interface.scanTable(config.amazondb.annotationTable, function(err, preloaded_notes){
		console.log(preloaded_notes);
		
		// res.sendFile( __dirname + "/annotation_panels.html" );
		res.render('index', { title: 'Notes', notes: preloaded_notes});
		});  

});


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
				console.log(data);
				res.writeHead(301,
				  {Location: userid + '/home'}
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
//Ensure the parent folder contains the extracted epub and especially the META-INF/conatiner.xml. (Extraction is scripted but can be manual as well)

app.get('/book1', function(req, res){


		
		var epubfile = 'Public/Books/Book1/testbook.epub';

		var check_xml = 'Public/Books/Book1/META-INF/container.xml';


		fs.stat(check_xml, function(err, stat){

			   

		        if (err) { 
			   
				var extract = require('extract-zip');
				var tar = 'Public/Books/Book1/';
				extract(epubfile, {dir: tar}, function (err) {
						
						if(err){
							console.log('Error Extracting');
						}

						else 
							console.log('Extracting');
				 // extraction is complete. make sure to handle the err 
					});
				  }

			   else {
       				console.log('Already Extracted');
		        } 

		});
		 

		converter.parse(epubfile, function (err, epubData) {
		
		var htmlData = converter.convertMetadata(epubData);
		//console.log(htmlData); //Debugging

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
		});*/


		var find = "href=\"" ;
		var rep = "href=\"Books/Book1/";
		replace_url(find, rep);

		});


  res.sendFile( __dirname + "/" + "book.html" );


});

app.get('/book2', function(req, res){

		var epubfile = 'Public/Books/Book2/Relativity.epub';

		var check_xml = 'Public/Books/Book2/META-INF/container.xml';


		fs.stat(check_xml, function(err, stat){

			   

		        if (err) { 
			    
				var extract = require('extract-zip');
				var tar = 'Public/Books/Book2/';
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
		//console.log(htmlData); //Debugging

		//THIS METHOD DOESN'T WORK:
		//document.write(htmlData);

		//USE FILE WRITE INSTEAD
		fs.writeFile('book.html', htmlData.htmlNav, function (err) {
	 	 if (err) return console.log(err);
	 	 console.log('htmlNav successfully sent to book.html!');
		});

		/*fs.appendFile('book.html', htmlData.htmlMetas, function (err) {
	 	 if (err) return console.log(err);
	 	 console.log('htmlMetas successfully sent to book.html!');
		});

		fs.appendFile('book.html', htmlData.htmlMetaList, function (err) {
	 	 if (err) return console.log(err);
	 	 console.log('htmlMetaList successfully sent to book.html!');
		}); */


			var find = "href=\"" ;
			var rep = "href=\"Books/Book2/";
			replace_url(find, rep);
		});


  res.sendFile( __dirname + "/" + "book.html" );


});



app.get('/book3', function(req, res){

		var epubfile = 'Public/Books/Book3/SCMP.epub';
		var check_xml = 'Public/Books/Book3/META-INF/container.xml';


		fs.stat(check_xml, function(err, stat){

			   

		        if (err) { 
			    
				var extract = require('extract-zip');
				var tar = 'Public/Books/Book3/';
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
		//console.log(htmlData); //Debugging

		//THIS METHOD DOESN'T WORK:
		//document.write(htmlData);

		//USE FILE WRITE INSTEAD
		fs.writeFile('book.html', htmlData.htmlNav, function (err) {
	 	 if (err) return console.log(err);
	 	 console.log('htmlNav successfully sent to book.html!');
		});

		/*fs.appendFile('book.html', htmlData.htmlMetas, function (err) {
	 	 if (err) return console.log(err);
	 	 console.log('htmlMetas successfully sent to book.html!');
		});

		fs.appendFile('book.html', htmlData.htmlMetaList, function (err) {
	 	 if (err) return console.log(err);
	 	 console.log('htmlMetaList successfully sent to book.html!');
		}); */

			var find = "href=\"" ;
			var rep = "href=\"Books/Book3/";
			replace_url(find, rep);
		});


  res.sendFile( __dirname + "/" + "book.html" );


});

app.get('/upload_img', function(req, res){
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
	console.log("Title: " + title);
	console.log("Body: " + body);
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
			"body":body
		}
		db_interface.addNote(note_item);
	} else{
		console.log("Editing");
		db_interface.updateNote(id, title, body);
	}
	res.send(req.body);
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
	db_interface.addNote(img_item);
	res.end("Image has uploaded.");
});



app.post('/:userName/setprivacy', function(req, res){
  //var username = req.params.userName;
  var username = "test_user1";
  var textID = req.body.textbookid;
  var textname= books[textID].split(' ').join('_');
  var privacy_val = req.body.privacy;
  
	console.log("SET PRIVACY " + privacy_val + " for " + textname + " for user " + username);
  var user = {  "userid":username, "textbook":textname, "privacy":privacy_val};
  console.log("user text " + user.textbook);
  db_interface.updateUser(user);
  
});

app.listen(80);
