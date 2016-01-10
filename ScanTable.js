//Needed for amazonDB
var AWS = require("aws-sdk");
// Loads configurations from app_config.json
var config = require('./app_config');

// AWS.config.update({
//     region: "us-west-2",
//     endpoint: "http://localhost:8000"
// });

AWS.config.update({
    region: "us-east-1",
    endpoint: "https://dynamodb.us-east-1.amazonaws.com"
});

var dynamodbDoc = new AWS.DynamoDB.DocumentClient();

// Can add more parameters here to filter results
var params = {
    TableName: config.amazondb.table
};

console.log("Scanning %s table.", config.amazondb.table);
dynamodbDoc.scan(params, onScan);

function onScan(err, data) {
    if (err) {
        console.error("Unable to scan the table. Error JSON:", JSON.stringify(err, null, 2));
    } else {
        // print all the books' info
        console.log("Scan succeeded.");
        data.Items.forEach(function(book) {
           console.log(
                book.author + ": ",
                book.title);
        });

        // continue scanning if we have more books
        if (typeof data.LastEvaluatedKey != "undefined") {
            console.log("Scanning for more.");
            params.ExclusiveStartKey = data.LastEvaluatedKey;
            dynamodbDoc.scan(params, onScan);
        }
    }
}