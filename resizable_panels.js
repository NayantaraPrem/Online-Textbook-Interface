$(document).on('click', '.panel-heading span.clickable', function (e) {
    var $this = $(this);
    if (!$this.hasClass('panel-collapsed')) {
        $this.parents('.panel').find('.panel-body').slideUp();
        $this.addClass('panel-collapsed');
    } else {
        $this.parents('.panel').find('.panel-body').slideDown();
        $this.removeClass('panel-collapsed');
    }
    return false;
});
$(document).on('click', '.panel div.clickable', function (e) {
    var $this = $(this);
    if (!$this.hasClass('panel-collapsed')) {
        $this.parents('.panel').find('.panel-body').slideUp();
        $this.addClass('panel-collapsed');
    } else {
        $this.parents('.panel').find('.panel-body').slideDown();
        $this.removeClass('panel-collapsed');
    }
    return false;
});

$(document).ready(function () {
    $('.panel-heading span.clickable').click();
    $('.panel div.clickable').click();
});

$(document).on('click', '#add_annotation', function () {
        $('#container').append('\
            <div class="row">\
                <div class="col-md-12">\
                    <div class="panel panel-primary">\
                        <div class="panel-heading clickable">\
                            <h3 class="panel-title">\
                                <form>\
                                    <input class="annt_title" type="text" placeholder="Enter Title" onkeypress="annt_submit(event)"/>\
                                </form>\
                            </h3>\
                            <span class="pull-right ">\
                            </span>\
                                <button class="btn btn-primary btn-sm"> \
                                    <span class="glyphicon glyphicon-trash"></span> \
                                </button>\
                        </div>\
                        <div class="panel-body">\
                            <form>\
                                <textarea class="annt_body" type="text" placeholder="Enter Note" onkeypress="annt_submit(event)"/>\
                            </form>\
                        </div>\
                    </div>\
                </div>\
            </div>');
});

function annt_submit(e) {
    if(e.keyCode == 13) {
        // enter pressed 
        alert("hey");
        var text_box = document.getElementsByClassName('annt_title');
        var text_area = document.getElementsByClassName('annt_body');
        var arrayLength = text_box.length;
        var arrayLength2 = text_area.length;
        if (arrayLength != arrayLength2) {
            alert("number of textboxes and areas different!");
        }
        
        for (var i = 0; i < arrayLength; i++) {
            if(!text_box[i].hasAttribute('readonly')) {
                text_box[i].setAttribute('readonly', 'readonly');
                text_area[i].setAttribute('readonly', 'readonly');
            }
        }
    }
    return false;
}

//function delete_annt(e) {
//    alert('bunnies');
   // if($(this)
   // $(this).parent().parent().remove();
   // return false;
//}
