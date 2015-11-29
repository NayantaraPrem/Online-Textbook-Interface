
$(document).on('click', '#display_book', function(e) {
		e.preventDefault();
		alert('Calling server to show book');
		var inputID = $(this).attr('id');
		var postData = $("#ajaxform"+inputID).serializeArray();
		var data = {};
		data.title = "title";
		data.message = "gimmebook";
		//var postData = $(this).serializeArray();
		var formURL = $(this).attr("action");
		$.ajax({
			type: 'POST',
			data: JSON.stringify(postData),
			contentType: 'application/json',
			url: 'http://localhost:80/ajax',						
			success: function(data) {
				alert('success');
				alert(JSON.stringify(postData));
			},
			error: function(data){
				window.console.log(data);
			}
		});
});