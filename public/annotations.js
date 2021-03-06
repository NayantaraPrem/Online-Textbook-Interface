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

$(document).ready(function() {
    $('.panel-heading span.clickable').click();
    $('.panel div.clickable').click();

    $(":button[name='edit']").hide();
	$(":button[name='delete']").hide();
	$(":submit[name='submit']").hide();

	// Only show edit, delete & submit buttons for own annotations
	$.each(annotations, function(i, item) {
		// make HTML code display in webpage eg: <p>abc</p> displayed as abc
		$("#textbody" + item.NoteID).html(item.info.body);
		if(item.owner == userId) {
			$("#editButton" + item.NoteID).show();
			$("#deleteButton" + item.NoteID).show();
		}
	});
});

var i = 0;
$(document).on('click', '#add_annotation', function () {
	var new_annot = '\
		<div class="row">\
			<div class="col-md-12">\
				<div class="panel panel-primary">\
					<form id="ajaxform' + i +'" name="ajaxform" class="form">\
						<div id="panel-heading' + i + '" class="panel-heading clickable writable">\
							<em> \
								<span class="ownerName" id="ownername' + i + '">'+userId+'</span>\
							</em>\
							<h3 class="panel-title">\
								<input class="annt_title" name="title" id="texttitle'+i+'"type="text" placeholder="Enter Title"/>\
							</h3>\
							<span class="pull-right ">\
								<button class="btn btn-primary btn-sm" onclick="edit_annt(event)"> \
									<span class="glyphicon glyphicon-pencil"></span> \
								<button class="btn btn-primary btn-sm" onclick="delete_annt(event)"> \
									<span class="glyphicon glyphicon-trash"></span> \
								</button>\
							</span>\
						</div>\
						<div id="panel-body' + i + '" class="panel-body writable">\
							<div class="annt_body" name="body" id="textbody'+i+'" type="text" contentEditable></div> \
						</div>\
						<input type="submit" value="Submit" id="'+i+'"/> \
					</form>\
				</div>\
			</div>\
		</div>';
	$('#annotation').append(new_annot);
	i++;
});

function upload_img_prompt(e){
	var page = 0;
	if ( $('ul.custom-pages li').length != 0 )
	        page = $('ul.custom-pages').find('li.active').attr('data-page');
	//alert("test "+page);
	var url = "http://localhost:80/upload_img/page="+page;
	var myWindow = window.open(url, "MsgWindow", "top=300, left=400, width=500, height=100");
}

$(document).on('click', 'input[type="submit"]', function(e) {
		e.preventDefault();
		var inputID = $(this).attr('id');
		var postData = $("#ajaxform"+inputID).serializeArray();
		var textbody = $("#textbody"+inputID).html();
		console.log(postData);
		
		var page = 0;
		if ( $('ul.custom-pages li').length != 0 )		
			page = $('ul.custom-pages').find('li.active').attr('data-page');
		//alert("test "+page);
		
		postData = [{"name":"title", "value":postData[0].value},{"name":"body", "value":textbody} , {"name":"id", "value":inputID}, {"name":"page", "value":page}];
		var data = {};
		data.title = "title";
		data.message = "message";
		var formURL = $(this).attr("action");
		
		$.ajax({
			type: 'POST',
			data: JSON.stringify(postData),
			contentType: 'application/json',
			url: 'http://localhost:80/annt_submit_or_edit',						
			success: function(data) {
				// verify you need this
				alert('Returned data: ' + data);
				$("#textbody"+inputID).html(data);
				alert(JSON.stringify(postData));
			},
			error: function(data){
				window.console.log(data);
			}
		});
		
		var text_box = document.getElementsByClassName('annt_title');
		var text_area = document.getElementsByClassName('annt_body');
		var arrayLength = text_box.length;
		var arrayLength2 = text_area.length;

		$("#panel-heading"+inputID).removeClass('writable');
		$("#panel-body"+inputID).removeClass('writable');
		$("#texttitle"+inputID).attr('readonly', 'readonly');
		$("#textbody"+inputID).attr('contentEditable', 'false');	
		/* In the case we add concept of last edited time, will have to store in db for that. For now, not adding*/	
		// var time = dateFormat(new Date(), "dddd, mmmm dS, yyyy, h:MM:ss TT");
	 	//    $("#updatedTime"+inputID).text(now);
		return false;
	});

function delete_annt(e) {
   e.preventDefault();
   var postData = e.currentTarget.id;
   postData = postData.replace("deleteButton", "");
   $.ajax({
		type: 'POST',
		data: JSON.stringify({"id":postData}),
		contentType: 'application/json',
		url: 'http://localhost:80/delete_annt',						
		success: function(data) {
			//alert("Sent " + data);
		},
		error: function(data){
			window.console.log(data);
		}
    });   
   var annotation_row = e.currentTarget.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement; // annotation div row
   annotation_row.remove();
   e.stopPropagation();
   return false;
}

function delete_img(e) {
   
   e.preventDefault();
   var annotation_row = e.currentTarget.parentElement.parentElement.parentElement; // annotation div row
   var postData = e.currentTarget.id;
   postData = postData.replace("deleteButton", "");
   $.ajax({
		type: 'POST',
		data: JSON.stringify({"id":postData}),
		contentType: 'application/json',
		url: 'http://localhost:80/delete_annt',						
		success: function(data) {
			//alert("Done " + data);
		},
		error: function(data){
			window.console.log(data);
		}
    });
   annotation_row.remove();
   e.stopPropagation();
   return false;
}

function edit_annt(e) {
    e.preventDefault();
	var id = e.currentTarget.id;
	id = id.replace("editButton", "");
	$("#" + id).show();
	$("#panel-heading"+id).addClass('writable');
	$("#panel-body"+id).addClass('writable');
	$("#texttitle"+id).removeAttr('readonly');
	$("#textbody"+id).attr('contentEditable', 'true');
	
    var postData = e.currentTarget.id;
	return false;
}

function generate_summary(e) {
   e.preventDefault();
   window.location.href = window.location.href + '/summary';
/*   var username = pathname.replace('/home', '');
   var postData = e.currentTarget.id;
   var arr = postData.split('_');
   arr[1] = 1;
   alert('Setting book id as ' + arr[1]);
   document.getElementById(postData).disabled = true;


      $.ajax({
    type: 'POST',
    data: JSON.stringify({"textbookid":arr[1]}),
    contentType: 'application/json',
    url: 'http://localhost:80' + username + '/summarize_annt',            
    success: function(data) {
      //alert("Sent " + data);
    },
    error: function(data){
      window.console.log(data);
    }
    });   
*/}

function update_annt_filter(e) {
	e.preventDefault();
    var postData = e.currentTarget.name;
	var action = "";
	if (e.currentTarget.checked)
		action = "add";
	else
		action = "remove";

	$.ajax({
		type: 'POST',
		data: JSON.stringify({"user":postData, "action":action}),
		contentType: 'application/json',
		url: 'http://localhost:80/update_annt_filter',						
		success: function(data) {
			//alert("Done " + data);
		},
		error: function(data){
			window.console.log(data);
		}
    });
	e.stopPropagation();
	
	update_visible_annt_list();
	
	return false;
}

function centerModal() {
    $(this).css('display', 'block');
    var $dialog = $(this).find(".modal-dialog");
    var offset = ($(window).height() - $dialog.height()) / 2;
    // Center modal vertically in window
    $dialog.css("margin-top", offset);
}

$('.modal').on('show.bs.modal', centerModal);
$(window).on("resize", function () {
    $('.modal:visible').each(centerModal);
});

$('.thumbnail').click(function(){
	$('#myModal').modal('show'); // show the modal
});


function mark_page(e){
	e.preventDefault();
	
	var curr_page = 0;
	if ( $('ul.custom-pages li').length != 0 )
		curr_page = $('ul.custom-pages').find('li.active').attr('data-page');
	
	var chapter = window.location.pathname;
	chapter = chapter.replace(/.*\//, "");
	
	var bookpath = window.location.pathname;
	bookpath = bookpath.replace(chapter, "");
		
	if (document.getElementById("marked-pages").querySelectorAll("[data-chapter='"+chapter+"'][data-page='"+curr_page+"']").length < 1){
		var list = document.getElementById("marked-pages");
		var li = document.createElement("li");
		var box = document.createElement("a");
		
		var linkText = document.createTextNode(chapter + ":" + curr_page);
		box.appendChild(linkText);
		
		box.setAttribute("href", bookpath + chapter);
		box.setAttribute("data-chapter", chapter);
		box.setAttribute("data-page", curr_page);
		
		li.className = "clickable";
		
		//alert("new bookmark");
		
		li.appendChild(box);
		list.appendChild(li); 
				
		var action = "add";

		$.ajax({
			type: 'POST',
			data: JSON.stringify({"chapter":chapter, "page":curr_page, "action":action}),
			contentType: 'application/json',
			url: 'http://localhost:80/update_bookmarks',						
			success: function(data) {
				//alert("Done " + data);
			},
			error: function(data){
				window.console.log(data);
			}
		});
	}	
	else {
		alert("already marked");
	}
	
	e.stopPropagation();

	return false;
}
