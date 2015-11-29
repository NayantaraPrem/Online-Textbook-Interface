var express = require('express');
var fs = require('fs');
var bodyParser = require('body-parser');
var converter = require('epub2html');



var epubfile = 'testbook.epub'
// create our app
var app = express();
app.use(express.static('public'));

// instruct the app to use the `bodyParser()` middleware for all routes
app.use(bodyParser.urlencoded({
	extended: true
}));
app.use(bodyParser.json());



// A browser's default method is 'GET', so this
// is the route that express uses when we visit
// our site initially.
app.get('/', function(req, res){
  // The form's action is '/' and its method is 'POST',
  // so the `app.post('/', ...` route will receive the
  // result of our form on the html page

	  
	
  res.sendFile( __dirname + "/" + "annotation_panels.html" );

  //res.sendFile( __dirname + "/" + "book.html" );

});


//URL to localhost/book is called onclicking the 'get book' button in annotation_panels.html
app.get('/book', function(req, res){


	  converter.parse(epubfile, function (err, epubData) {
		
		var htmlData = converter.convertMetadata(epubData);
		console.log(htmlData);

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
	     	 console.log(err);
	    	} else {
	      	console.log("JSON saved to " + outputFilename);
	    	}
		 }); 
		});

	//output.html is a static file at the moment.
	//It was generated manually beforehand and moved to the public directory
	//generated by running the test.js in epub2html npm, on the console and sending the console output to an html file
  res.sendFile( __dirname + "/" + "output.html" );


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

//For testing; Unused function
app.post('/ajax2', function(req, res){
	var obj = {};
	console.log('Received:');
	console.log(JSON.stringify(req.body));
	console.log('------------------------------------------');

	res.sendFile( __dirname + "/" + "output.html" );

	//res.send(req.body);
});


app.listen(84);