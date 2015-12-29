var express = require('express');
var fs = require('fs');
var bodyParser = require('body-parser');
var converter = require('epub2html');
var multer = require('multer');

var replace = require("replace");
var path = require('path');


// create our app
var app = express();
app.use(express.static('public'));


// instruct the app to use the `bodyParser()` middleware for all routes
app.use(bodyParser.urlencoded({
	extended: true
}));
app.use(bodyParser.json());


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




var uploading = multer({ dest: __dirname + '/public/uploads/',
    rename: function (fieldname, filename) {
        return filename+"_"+Date.now();
    },
    onFileUploadStart: function (file) {
        console.log(file.originalname + ' is starting ...')
    },
    onFileUploadComplete: function (file) {
        console.log(file.fieldname + ' uploaded to  ' + file.path)
        done=true;
    }
});


// A browser's default method is 'GET', so this
// is the route that express uses when we visit
// our site initially.
app.get('/annotations', function(req, res){
  // The form's action is '/' and its method is 'POST',
  // so the `app.post('/', ...` route will receive the
  // result of our form on the html page

	  
	
  res.sendFile( __dirname + "/" + "annotation_panels.html" );


});


//THIS IS THE HOMEPAGE
app.get('/', function(req, res){

  res.sendFile( __dirname + "/" + "Home.html");
  //home.html has an on-click event that will invoke app.get/book<number> below, to redirect to appropriate table of contents.

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

// This route receives the posted form.
// As explained above, usage of 'body-parser' means
// that `req.body` will be filled in with the form elements
app.post('/ajax', function(req, res){
	var obj = {};
	console.log('Received:');
	console.log(JSON.stringify(req.body));
	console.log('------------------------------------------');



	res.send(req.body);
});


//Uploading images
app.post('/api/photo', uploading.single('pic'), function(req, res){
	
	res.end("Image has uploaded.");

});

//For testing; Unused function
app.post('/ajax2', function(req, res){
	var obj = {};
	//console.log('Received:');
	//console.log(JSON.stringify(req.body));
	//console.log('------------------------------------------');

	res.sendFile( __dirname + "/" + "output.html" );

	//res.send(req.body);
});

app.listen(80);
