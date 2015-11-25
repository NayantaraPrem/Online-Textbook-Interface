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
 /* var title = req.body.title;
  var body = req.body.note_body;
  console.log("req received");*/
  //console.log("req received:\ntitle: " + title +"\nbody: "+body);
  //console.log(req.body);

	var obj = {};
	console.log('Received:');
//	console.log('annotation title: ' + req.body[0].value);
//	console.log('annotation contents: ' + req.body[1].value);
	console.log(JSON.stringify(req.body));
	console.log('------------------------------------------');

	res.send(req.body);
});

app.listen(80);