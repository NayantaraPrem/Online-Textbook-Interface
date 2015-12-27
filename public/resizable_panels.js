$(document).on('click', '.panel-heading span.clickable', function (e) {
    var $this = $(this);
    if (!$this.hasClass('panel-collapsed') && !$this.hasClass('writable')) {
        $this.parents('.panel').find('.panel-body').slideUp();
        $this.addClass('panel-collapsed');
    } else {
        $this.parents('.panel').find('.panel-body').slideDown();
        $this.removeClass('panel-collapsed');
    }
});
$(document).on('click', '.panel div.clickable', function (e) {
    var $this = $(this);
    if (!$this.hasClass('panel-collapsed') && !$this.hasClass('writable')) {
        $this.parents('.panel').find('.panel-body').slideUp();
        $this.addClass('panel-collapsed');
    } else {
        $this.parents('.panel').find('.panel-body').slideDown();
        $this.removeClass('panel-collapsed');
    }
});

$(function () {
    $('.panel-heading span.clickable').click();
    $('.panel div.clickable').click();
});

var i = 0;
$(document).on('click', '#add_annotation', function () {

	var new_annot = '\
		<div class="row">\
			<div class="col-md-12">\
				<div class="panel panel-primary writable">\
					<form id="ajaxform' + i +'" name="ajaxform" class="form">\
						<div class="panel-heading clickable writable">\
							<h3 class="panel-title">\
								<input class="annt_title" name="title" id="texttitle'+i+'"type="text" placeholder="Enter Title"/>\
							</h3>\
							<span class="pull-right ">\
								<button class="btn btn-primary btn-sm" onclick="delete_annt(event)"> \
									<span class="glyphicon glyphicon-trash"></span> \
								</button>\
							</span>\
						</div>\
						<div class="panel-body writable">\
							<textarea class="annt_body" name="body" id="textbody'+i+'" type="text" placeholder="Enter Note"/>\
						</div>\
						<input type="submit" value="Submit" id="' + i +'" />\
					</form>\
				</div>\
			</div>\
		</div>';
	$('#container').append(new_annot);
	i++;
});

function upload_img_prompt(e){
	var myWindow = window.open("upload_img", "MsgWindow", "top=300, left=400, width=500, height=100");
}

$(document).on('click', 'input[type="submit"]', function(e) {
		e.preventDefault();
		var inputID = $(this).attr('id');
		var postData = $("#ajaxform"+inputID).serializeArray();
		var data = {};
		data.title = "title";
		data.message = "message";
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
		
 		//make text boxes read-only
		//if(e.keyCode == 13) {
		//alert("Enter pressed");
		// enter pressed 
		var text_box = document.getElementsByClassName('annt_title');
		var text_area = document.getElementsByClassName('annt_body');
		var arrayLength = text_box.length;
		var arrayLength2 = text_area.length;
		if (arrayLength != arrayLength2) {
			alert("number of textboxes and areas different!");
		}
		$('.writable').removeClass('writable');

		for (var i = 0; i < arrayLength; i++) {
			if(!text_box[i].hasAttribute('readonly')) {
				text_box[i].setAttribute('readonly', 'readonly');
				text_area[i].setAttribute('readonly', 'readonly');
			}
		}
		//}
	return false;
	});

function delete_annt(e) {
   alert("Deleting");
   var parent = e.currentTarget.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement;
   parent.remove();
   e.stopPropagation();
   return false;
}
