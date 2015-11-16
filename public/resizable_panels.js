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

$(document).ready(function () {
    $('.panel-heading span.clickable').click();
    $('.panel div.clickable').click();
});

$(document).on('click', '#add_annotation', function () {
        $('#container').append('\
            <div class="row">\
                <div class="col-md-12">\
                    <div class="panel panel-primary writable">\
                        <div class="panel-heading clickable writable">\
                            <h3 class="panel-title">\
                                    <input class="annt_title" type="text" placeholder="Enter Title" onkeypress="annt_submit(event)"/>\
                            </h3>\
                            <span class="pull-right ">\
                                <button class="btn btn-primary btn-sm" onclick="delete_annt(event)"> \
                                    <span class="glyphicon glyphicon-trash"></span> \
                                </button>\
                            </span>\
                        </div>\
                        <div class="panel-body writable">\
                                <textarea class="annt_body" type="text" placeholder="Enter Note"/>\
                        </div>\
                    </div>\
                </div>\
            </div>');
});

function annt_submit(e) {
    if(e.keyCode == 13) {
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
    }
    return false;
}

function delete_annt(e) {
   var parent = e.currentTarget.parentElement.parentElement.parentElement.parentElement.parentElement;
   parent.remove();
   e.stopPropagation();
   return false;
}
