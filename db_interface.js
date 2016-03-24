var AWS = require("aws-sdk");
var fs = require('fs');
var EPub = require("./node_modules/epub");
var epub_file;
var dynamodbDoc;
var config = require('./app_config');
// Configures LOCAL amazonDB
/*
 AWS.config.update({
     region: "us-west-2",
     endpoint: "http://localhost:8000"
 });
*/
AWS.config.update({
    region: "us-east-1",
    endpoint: "https://dynamodb.us-east-1.amazonaws.com"
});



//Create annotations + images table
// primary_key_hash and primary_key_range are the names of the primary key attributes and their 'type's are S, N, etc
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
exports.scanTable = function(scanParams, callback){
	var dynamodbDoc = new AWS.DynamoDB.DocumentClient();

    // Return this value
	var itemArray = [];
	//console.log("Scanning %s table.", scanParams.TableName);
	dynamodbDoc.scan(scanParams, onScan);

	function onScan(err, data) {
		if (err) {
			console.error("Unable to scan the table. Error JSON:", JSON.stringify(err, null, 2));
		} 
		
		else {
			//console.log("Scan succeeded for " + scanParams.TableName);
			
			//Appending item to Array of all scanned items
			data.Items.forEach(function(item) {
				//console.dir(item);
				itemArray.push(item);
			});
			
			// continue scanning if we have more books
			if (typeof data.LastEvaluatedKey != "undefined") {
				//console.log("Scanning for more.");
				params.ExclusiveStartKey = data.LastEvaluatedKey;
				dynamodbDoc.scan(params, onScan);
			}

			//console.log("Display itemarray:", JSON.stringify(itemArray, null, 2));
			
			callback(null, itemArray);
		}		
	}
}

exports.updateAnntFilterParams = function(username, bookid, filter_settings){
	var dynamodbDoc = new AWS.DynamoDB.DocumentClient();
	
	var params = {
		TableName: 'AnnotationsFilter',
		Item: {
			"user:book": username + ":book" + bookid,
			"filterParams": filter_settings
		}
	};
	//TODO: use 'update' fcn
	dynamodbDoc.put(params, function(err, data) {	
		if(err){
			console.log("Unable to add/update filter settings");
		} else {
			console.log("Added/Updated filter settings for user:" + username + ", book:" + bookid);
		}	
	});
}


/* Store access token with user details in db table (assuming prior to this user has logged in, token received, permissions asked for, and identity verfied
 Parameters: 
 	item = 
       		This is generated with JSON.stringify(response) which returns, for example, 
		{
		  "id":"101540562372987329832845483",
			...
			..
			.    <--- add any other info here
		}
	Primary key = NoteID so this required. Other info is optional.
        token (long-lived? short-lived?) <string> (DO WE NEED THIS? Dont think so)

*/



exports.addNote = function(item, username, bookid, chapter, page){
	var dynamodbDoc = new AWS.DynamoDB.DocumentClient();
	var ID = item.id;
	if(typeof ID == 'undefined' || !ID ){
		var error = new Error("ID undefined");
		console.log(error);
		console.log(error.stack);
	}
	else {
	        var params = {
		               TableName: config.amazondb.annotationTable,
		               Item: {
		                       "NoteID": ID,
		                       "info": item,
		                       "owner": username,
							   "bookID": bookid,
							   "chapter": chapter,
							   "page": page
			             }
			     };
			console.log("Params:" + params.TableName + " " + params.Item.ID + " "+ params.Item.info);
        	dynamodbDoc.put(params, function(err, data) {	
			if(err){
				console.error("Unable to add Item with ID " + ID + " . Error JSON:", JSON.stringify(err, null, 2));
			} else {
				console.log("Added item " + ID);
			}	
		});
	     }
}

// delete an entry
exports.deleteItem = function(id){
	var dynamodbDoc = new AWS.DynamoDB.DocumentClient();
	var params = {
		               TableName: config.amazondb.annotationTable,
		               Key: {
		                       "NoteID": id
			             }
			     };
	dynamodbDoc.delete(params, function(err, data) {
		if (err) {
			console.error("Unable to delete item. Error JSON:", JSON.stringify(err, null, 2));
		} else {
			console.log("DeleteItem succeeded:", JSON.stringify(data, null, 2));
		}
	});
	
}


// update an entry
exports.updateNote = function(id, newtitle, newbody){
	var dynamodbDoc = new AWS.DynamoDB.DocumentClient();
	var params = {
		               TableName: config.amazondb.annotationTable,
		               Key: {
		                       "NoteID": id
			             },
						UpdateExpression: "set info.title = :t, info.body = :b",
						ExpressionAttributeValues:{
							":t":newtitle,
							":b":newbody
						},
						ReturnValues:"UPDATED_NEW"
				};
					
	dynamodbDoc.update(params, function(err, data) {
		if (err) {
			console.error("Unable to update item. Error JSON:", JSON.stringify(err, null, 2));
		} else {
			console.log("UpdateNote succeeded:", JSON.stringify(data, null, 2));
		}
	});	
}


exports.getNote = function(id){
	var dynamodbDoc = new AWS.DynamoDB.DocumentClient();
	var params = {
		               TableName: config.amazondb.annotationTable,
		               Key: {
		                       "NoteID": id
			             },

				};
				
	dynamodbDoc.get(params, function(err, data) {
	    if (err) {
	        console.error("Unable to get item. Error JSON:", JSON.stringify(err, null, 2));
	    	callback(err, null);
	    }
	    else {
	        console.log("Got item successfully:", JSON.stringify(data, null, 2));
	        callback(null, data);
	    }
	});
}

exports.updateUser = function(editedUser){
  var dynamodbDoc = new AWS.DynamoDB.DocumentClient();
	var params = {
		TableName: 'PrivacySettings',
		Key: { 
			"userId" : editedUser.userid
		}, 
    UpdateExpression: "set " + editedUser.textbook +" = :p",
		ExpressionAttributeValues:{
      ":p":editedUser.privacy
    },
    ReturnValues:"UPDATED_NEW"
	};
  	dynamodbDoc.update(params, function(err, data) {
		if (err) {
			console.error("Unable to update user. Error JSON:", JSON.stringify(err, null, 2));
		} else {
			console.log("UpdateUser succeeded:", JSON.stringify(data, null, 2));
		}
	});	
}
