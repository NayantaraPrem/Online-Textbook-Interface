//for buttons on hovering on thumnail
$( document ).ready(function() {
    $("[rel='tooltip']").tooltip();    
     alert("here");
    $('.thumbnail').hover(
        function(){
            $(this).find('.caption').slideDown(250); //.fadeIn(250)
        },
        function(){
            $(this).find('.caption').slideUp(250); //.fadeOut(205)
        }
    ); 
});

$(document).ready(function(){
  $("#myBtn").click(function(){
    $("#myModal").modal();
  });
});
