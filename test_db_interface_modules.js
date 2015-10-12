// 'include' the 'header file' db_interface.js
var db_interface = require('./db_interface.js');

//Create a table called 'Phone' with one primary key of type number
db_interface.createTable("phone", "Model", "N");

//Create a table called 'car' with one primary key of type number and another primary key of type string
db_interface.createTable("car", "Manufacturer", "S", "Cost", "N");

//db_interface.storeTextbook('./testbook.epub', 

// arrayIt returns an array of all table entries
var arrayIt = [];
db_interface.scanTable('Book-info', function(err, arrayIt){
    // iterates through arrayIt after scanTable has finished executing (to prevent printing null values cuz of asynchronous execution
	arrayIt.forEach(function(item) {
				console.dir(item);
			});
	});