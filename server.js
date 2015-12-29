var express = require('express');
var fs = require('fs');
var bodyParser = require('body-parser');
var converter = require('epub2html');
var multer = require('multer');
var db_interface = require('./db_interface.js');

var epubfile = 'testbook.epub'
// create our app
var app = express();
app.use(express.static('public'));

//Set template engine to jade
app.set('view engine', 'jade');

//set path to the views (template) directory
app.set('views', __dirname + '/views');

//for Jade testing - replace with data loaded from db
var note_title = 
	["Note1", "Note2", "Note2"];
var note_content =
	["Stuff1", "Stuff2", "Stuff3"];
var imgs = ["img1", "img 2"];

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

// A browser's default method is 'GET', so this
// is the route that express uses when we visit
// our site initially.
app.get('/annotations', function(req, res){
  // The form's action is '/' and its method is 'POST',
  // so the `app.post('/', ...` route will receive the
  // result of our form on the html page
  
	
 // res.sendFile( __dirname + "/" + "annotation_panels.html" );
	res.render('index', { title: 'Notes', content: note_content, note_title: note_title, imgs: imgs});

});


//URL to localhost/book is called onclicking the 'get book' button in annotation_panels.html
app.get('/', function(req, res){


	  converter.parse(epubfile, function (err, epubData) {
		
		var htmlData = converter.convertMetadata(epubData);
		//console.log(htmlData);

		//THESE METHODS DON'T WORK:
		//document.write(htmlData);
		//fs.writeFile('book.html', htmlData, function (err) {
	 	// if (err) return console.log(err);
	 	// console.log('book output error!');
		//});

	    //ALTERNATIVE:
	  	//Sending output to client in html file is not recommended- could not find examples to write htmlData object VALUE to an html file 
	  	//Can send as JSON file instead using stringify, but need to know what to do with the JSON on the client side
	  	//Where is the client side receiving the output? Should it do a jquery get?
			var outputFilename = 'my.json';

			fs.writeFile(outputFilename, JSON.stringify(htmlData, null, 4), function(err) {
	    	if(err) {
	     	 //console.log(err);
	    	} else {
	      	//console.log("JSON saved to " + outputFilename);
	    	}
		 }); 
		});

	//output.html is a static file at the moment.
	//It was generated manually beforehand and moved to the public directory
	//generated by running the test.js in epub2html npm, on the console and sending the console output to an html file
  res.sendFile( __dirname + "/" + "output.html" );


});

app.get('/upload_img', function(req, res){
	res.sendFile( __dirname + "/" + "upload_img.html" );
});

// This route receives the posted form.
// As explained above, usage of 'body-parser' means
// that `req.body` will be filled in with the form elements
app.post('/ajax', function(req, res){
	var obj = {};
	console.log('Received:');
	console.log(JSON.stringify(req.body));
	console.log('------------------------------------------');

	// add annotation to DB here
	var id = "ANNT_" + Date.now();
	var note_item = {
		"id": id
	}
	//commented out for testing
	//db_interface.addItem(note_item);
	res.send(req.body);
});


//Uploading images
app.post('/api/photo', uploading.single('pic'), function(req, res){
	
	// refresh the '/annotations' html page here
	// ...
	// add image to db
	var img_item = {
		"id": req.file.filename
	}
	//commented out for testing purposes
	//db_interface.addItem(img_item);
	console.log(img_item);
	res.end("Image has uploaded.");
});

app.listen(80);
