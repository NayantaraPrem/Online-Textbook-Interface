$(document).on('click', '.panel-heading panel.clickable', function (e) {
    var $this = $(this);
    if (!$this.hasClass('panel-collapsed')) {
        $this.parents('.panel').find('.panel-body').slideUp();
        $this.addClass('panel-collapsed');
    } else {
        $this.parents('.panel').find('.panel-body').slideDown();
        $this.removeClass('panel-collapsed');
    }
});
$(document).on('click', '.panel-body panel.clickable', function (e) {
    var $this = $(this);
    if (!$this.hasClass('panel-collapsed')) {
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

	$.each(annotations, function(i, item) {
		// make HTML code display in webpage eg: <p>abc</p> displayed as abc
		$("#textbody" + item.NoteID).html(item.info.body);
	});
});

function note_delete(e) {
   e.preventDefault();
   var annotation_row = e.currentTarget.parentElement.parentElement; // annotation div row
   annotation_row.remove();
   e.stopPropagation();
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