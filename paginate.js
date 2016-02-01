var src = document.getElementById('Source');
var contentBox = document.getElementById('content');
var inner = document.getElementById('inner');
//get the text as an array of word-like things
var words = src.innerHTML.replace(/ +/g, " ").split(' ');

//start off with no page text
var cHeight = contentBox.offsetHeight, wCount = words.length;

while(wCount > 0) {
    var Len = 1, Overflow = false;
    var pageText = words[0];                        //Prevents the continued check on 'is pageText set'.
    while(!Overflow && Len < wCount) {              //Adds to the text, until the boundary is breached.
        //20 words per run, but never more than the total amount of words.
        for(var j = 0; j < 20 && Len < wCount; ++Len, ++j) pageText += ' ' + words[Len];
        inner.innerHTML = pageText;
        Overflow = (inner.offsetHeight > cHeight);  //Determines, whether the boundary has been crossed.
    }
    if(Overflow) {                                  //Will only be executed, if the boundary has been broken.
        for(--Len; Len >= 0; --Len) {               //Removes the last word of the text, until it fits again.
            var pageText = pageText.slice(0, -(words[Len].length + 1)); //Shortens the text in question.
            inner.innerHTML = pageText;

            //Checks, whether the text still is too long.
            if(inner.offsetHeight <= cHeight) break;//Breaks the loop
        }
    }
    var Child = document.createElement("span");
    Child.style.display = "none";                   //Prevents the sidebars from showing (and distorting the following pages)
            Child.innerHTML = pageText;
            contentBox.appendChild(Child);
            words.splice(0, Len);
            wCount -= Len;
}   