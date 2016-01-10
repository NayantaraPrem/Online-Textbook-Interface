var AWS = require("aws-sdk");
var fs = require('fs');
var EPub = require("epub");
var config = require('./app_config');



// Sets epub file path
// process.argv[0] = node; process.argv[1] = <name of js script>; process.argv[2] = file name with path
var file = process.argv[2];

// Not sure what imagewebroot and articlewebroot are
var epub = new EPub(file, "/imagewebroot/", "/articlewebroot/");

// Configures LOCAL amazonDB
// AWS.config.update({
//     region: "us-west-2",
//     endpoint: "http://localhost:8000"
// });

AWS.config.update({
    region: "us-east-1",
    endpoint: "https://dynamodb.us-east-1.amazonaws.com"
});

var dynamodbDoc = new AWS.DynamoDB.DocumentClient();

// Call EPUB parser
epub.parse();

epub.on("error", function(err){
    console.log("ERROR\n-----");
    throw err;
});

// Call this when epub parsing complete
epub.on("end", function(err){
/*    console.log("METADATA:\n"); //book info
    console.log(epub.metadata);

    console.log("\nSPINE:\n");
    console.log(epub.flow);

    console.log("\nTOC:\n");  //chapter names
    console.log(epub.toc);
	*/
	
	console.log("Importing textbook metadata < %s:%s> into DynamoDB from %s. Please wait.",epub.metadata.creator, epub.metadata.title, file);

	var params = {
		TableName: config.amazondb.table,
		Item: {
			"author": epub.metadata.creator,
			"title": epub.metadata.title,
		}
	};
	
	console.log("Params: ");
	console.dir(params);
	dynamodbDoc.put(params, function(err, data) {
		if (err) {
			console.error("Unable to add textbook. Error JSON:", JSON.stringify(err, null, 2));
		} else {
			console.log("PutItem succeeded");
		}
    });

});



