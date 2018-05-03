window.onload=function(){
    var books=document.getElementsByClassName("trade");
    for(var i=0;i<books.length;i++){
        console.log(books[i]);
        // remember to understand what the third parameter is for
        books[i].addEventListener("click",tradeRequest,false);
    }
}

function tradeRequest(e){
    console.log(this);
    var title=this.parentNode.getElementsByTagName('p')[0].innerHTML;
    var owner=this.parentNode.getElementsByTagName("span")[1].innerHTML;
    console.log(owner);
    console.log(title);
    var url="/request?name="+title+"&owner="+owner;
    url=encodeURI(url);
    console.log(url);
    var xhr=new XMLHttpRequest;
    xhr.open("GET",url,true);
    xhr.send(null);
    xhr.onload=function(e){
        if(xhr.readyState==4){
            console.log("status 4");
            if(xhr.status==200){
                if(xhr.response=="error"){
                    window.alert("You can't send a request to trade your own book");
                    return; 
                }
            }
        }
    }
}
