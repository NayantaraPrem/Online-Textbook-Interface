var AWS = require("aws-sdk");
var fs = require('fs');
var EPub = require("epub");
var epub_file;
var dynamodbDoc;
var config = require('./app_config');
// Configures LOCAL amazonDB
AWS.config.update({
    region: "us-west-2",
    endpoint: "http://localhost:8000"
});


//Create a table with 1 or 2 primary keys
//
exports.createTable = function(table, primary_key_hash, hash_type, primary_key_range, range_type) {
	var dynamodb = new AWS.DynamoDB();
	
	//optional primary hash key
	if (typeof primary_key_range === 'undefined') {
		var params = {
			TableName : table,
			KeySchema: [       
				{ AttributeName: primary_key_hash, KeyType: "HASH"}  //key types supported: String(S), Number(N), Binary, Boolean, NULL
			],
			AttributeDefinitions: [       
				{ AttributeName: primary_key_hash, AttributeType: hash_type }
			],
			ProvisionedThroughput: {       
				ReadCapacityUnits: 1, 
				WriteCapacityUnits: 1
			}
		};
		console.dir(params);
	} else {
		var params = {
			TableName : table,
			KeySchema: [       
				{ AttributeName: primary_key_hash, KeyType: "HASH"},  //key types supported: String(S), Number(N), Binary, Boolean, NULL
				{ AttributeName: primary_key_range, KeyType: "RANGE"}
			],
			AttributeDefinitions: [       
				{ AttributeName: primary_key_hash, AttributeType: hash_type },
				{ AttributeName: primary_key_range, AttributeType: range_type }
			],
			ProvisionedThroughput: {       
				ReadCapacityUnits: 1, 
				WriteCapacityUnits: 1
			}
		};
		console.dir(params);
	}
	dynamodb.createTable(params, function(err, data) {
    if (err) {
        console.error("Unable to create table. Error JSON:", JSON.stringify(err, null, 2));
    } else {
        console.log("Created table. Table description JSON:", JSON.stringify(data, null, 2));
    }
});
}

//Iterating through the whole table, returning all items in table appended to array
exports.scanTable = function(table, callback){
	var dynamodbDoc = new AWS.DynamoDB.DocumentClient();
	// Can add more parameters here to filter results
	var params = {
		TableName: table
	};
     // Return this value
	var itemArray = [];
	console.log("Scanning %s table.", table);
	dynamodbDoc.scan(params, onScan);

	function onScan(err, data) {
		if (err) {
			console.error("Unable to scan the table. Error JSON:", JSON.stringify(err, null, 2));
		} else {
			console.log("Scan succeeded.");
			//Appending item to Array of all scanned items
			
			data.Items.forEach(function(item) {
				//console.dir(item);
				itemArray.push(item);
			});
			// continue scanning if we have more books
			if (typeof data.LastEvaluatedKey != "undefined") {
				console.log("Scanning for more.");
				params.ExclusiveStartKey = data.LastEvaluatedKey;
				dynamodbDoc.scan(params, onScan);
			}
			callback(null, itemArray);
		}
		
	}
}


/* Create Table for users 
 
Table structure:
 	User = { ID: ..,               <--- of type String because INT may be contrained by size of ID
		 Info: { Name: ...,
		 	Token: ...
			}
		}
	Primary Key: ID (string)
*/
exports.createUserTable = function(){

	var dynamodb = new AWS.DynamoDB();
	
	//Primary hash key = UserID
	var params = {
		TableName : config.amazondb.userTable,
		KeySchema: [       
			{ AttributeName: "ID", KeyType: "HASH"} 
		],
		AttributeDefinitions: [       
			{ AttributeName: "ID", AttributeType: "S" }
		],
		ProvisionedThroughput: {       
			ReadCapacityUnits: 1, 
			WriteCapacityUnits: 1
		}
	};
	console.dir(params);
	dynamodb.createTable(params, function(err, data) {
   	 if (err) {
       	 	console.error("Unable to create table. Error JSON:", JSON.stringify(err, null, 2));
   	 } else {
       		 console.log("Created table. Table description JSON:", JSON.stringify(data, null, 2));
   	 }
	});
}


/* Store access token with user details in db table (assuming prior to this user has logged in, token received, permissions asked for, and identity verfied
 Parameters: 
 	response <JSON string> 
       		This is generated with JSON.stringify(response) which returns, for example, 
		{
		  "id":"101540562372987329832845483",
	    	  "email":"example@example.com",
	          "first_name":"Bob",
	          [ ... ]
		}
	Primary key = ID so this required. Other info is optional.
        token (long-lived? short-lived?) <string> (DO WE NEED THIS? Dont think so)

*/

exports.addUser = function(response, token){
	var dynamodbDoc = new AWS.DynamoDB.DocumentClient();
	var UserID = response.id;
	if(typeof UserID == 'undefined' || !UserID ){
		var error = new Error("UserID undefined");
		console.log(error);
		console.log(error.stack);
	}
	else {
	        var params = {
		               TableName: config.amazondb.userTable,
		               Item: {
		                       "ID": UserID,
		                       "info": response
			             }
			     };

        	dynamodbDoc.put(params, function(err, data) {	
			if(err){
				console.error("Unable to add User with ID " + UserID + " . Error JSON:", JSON.stringify(err, null, 2));
			} else {
				console.log("Added user " + UserID);
			}	
		});
	     }
}

