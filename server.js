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
 
  res.sendFile( __dirname + "/" + "annotation_panels.html" );

});


app.listen(80);