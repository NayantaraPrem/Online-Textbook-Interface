var express = require('express');

var bodyParser = require('body-parser');

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

app.listen(80);