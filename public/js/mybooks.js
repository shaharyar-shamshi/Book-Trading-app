window.onload=function(){
    var but=document.getElementById("search");
    var rem=document.getElementsByClassName("remove");
    for(var i=0;i<rem.length;i++){
        console.log(rem[i]);
        rem[i].addEventListener("click",bookDel,false);
    }
    but.addEventListener("click",bookSearch,false);
};

function bookSearch(e){
    var bookName=document.getElementById("bookName").value;
    var xhr=new XMLHttpRequest();
    var url="/booksearch/"+bookName;
    xhr.open("GET",url,true);
    xhr.send(null);
    xhr.onload=function(e){
        console.log("request for the book data sent to the server");
        if(xhr.readyState==4){
            console.log("ready state reached four");
            if(xhr.status===200){
                console.log("status is 200");
                var bookObj=JSON.parse(xhr.response);
                addBook(bookObj);
            }
        }
    }
}
function addBook(bookObj){
    console.log(bookObj);
    var container=document.getElementById("oldBooksContainer");
    console.log(container);
    if(container==null)
        return;
    var bookdiv=document.createElement("div");
    var img=document.createElement("img");
    bookdiv.className="col-md-2 col-xs-6";
    bookdiv.style="text-align:center;";
    var p=document.createElement("p");
    p.innerHTML=bookObj.name;
    img.src=bookObj.thumbnail;
    img.style="width:90%;height:150px;"
    bookdiv.appendChild(img);
    var button=document.createElement("button");
    button.className="remove";
    button.addEventListener("click",bookDel,false);
    button.innerHTML="remove";
    bookdiv.appendChild(p);
    bookdiv.appendChild(button);
    container.appendChild(bookdiv);
}

function bookDel(e){
    // getting the image link of the book to search for it in the database and delete it
    //console.log(e);
    console.log("I am coming here");
    console.log(this);
    // this is the case of text nodes appearing in the dom.its type is 3 and you can ignore them
    // this is good practise.write like this
    var title=this.parentNode.getElementsByTagName('p')[0].innerHTML;
    this.parentNode.parentNode.removeChild(this.parentNode);
    console.log(title);
    var xhr=new XMLHttpRequest;
    //learn a  bit about the encoding of url
    //var url="/del?link="+encodeURIComponent(thumbnail);
    var url="/del/"+title;
    console.log(url);
    xhr.open("GET",url,true);
    xhr.send(null);
    xhr.onload=function(e){
        if(xhr.readyState==4){
            console.log("status 4");
            if(xhr.status==200){
                console.log("deletion done from database");
            }
        }
    }
}
