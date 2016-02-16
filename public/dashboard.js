//for buttons on hovering on thumbnail
$( document ).ready(function() {
    $("[rel='tooltip']").tooltip(); 
    $('.thumbnail').hover(
        function(){
            $(this).find('.caption').slideDown(250); //.fadeIn(250)
        },
        function(){
            $(this).find('.caption').slideUp(250); //.fadeOut(205)
        }
    ); 
    $(".bookIcon").click(function(e) {
      if(e.target.tagName ==  "BUTTON")
        return;
      var pathname = window.location.pathname;
      var username = pathname.replace('/home', '');
      var location =  "http://localhost" + username + "/";
      if (this.name == 'combined') {
        location += ("Combined");
      } else {
        location += (this.id + "=" + this.name);
      }
      window.location.href = location;
    });
});



$(document).ready(function(){
  $("#myBtn").click(function(){
    $("#myModal").modal();
  });
});

function set_privacy(e) {
   e.preventDefault();
   var pathname = window.location.pathname;
   var username = pathname.replace('/home', '');
   var postData = e.currentTarget.id;
   var arr = postData.split('_');
   alert('Setting privacy settings to ' + arr[0]);
   document.getElementById(postData).disabled = true;
   if(arr[0] == "Everyone")
     other = "None";
   else other = "Everyone";
   alert(other+'_'+arr[1]);
   document.getElementById(other+'_'+arr[1]).disabled =  false;
      $.ajax({
		type: 'POST',
		data: JSON.stringify({"textbookid":arr[1], "privacy":arr[0]}),
		contentType: 'application/json',
		url: 'http://localhost:80' + username + '/setprivacy',						
		success: function(data) {
			//alert("Sent " + data);
		},
		error: function(data){
			window.console.log(data);
		}
    });   
}

function annt_sum(e) {
   e.preventDefault();
   var pathname = window.location.pathname;
   var username = pathname.replace('/home', '');
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
}