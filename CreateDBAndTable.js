var AWS = require("aws-sdk");
var config = require('./app_config');

AWS.config.update({
  region: "us-west-2",
  endpoint: "http://localhost:8000"
});

var dynamodb = new AWS.DynamoDB();

var params = {
    TableName : config.amazondb.table,
    KeySchema: [       
        { AttributeName: "author", KeyType: "HASH"},
        { AttributeName: "title", KeyType: "RANGE" }
    ],
    AttributeDefinitions: [       
        { AttributeName: "author", AttributeType: "S" },
        { AttributeName: "title", AttributeType: "S" }
    ],
    ProvisionedThroughput: {       
        ReadCapacityUnits: 1, 
        WriteCapacityUnits: 1
    }
};

dynamodb.createTable(params, function(err, data) {
    if (err) {
        console.error("Unable to create table. Error JSON:", JSON.stringify(err, null, 2));
    } else {
        console.log("Created table. Table description JSON:", JSON.stringify(data, null, 2));
    }
});