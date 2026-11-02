(function(){
  var SHOP="तुळजाभवानी मेडिकल";
  var NUM="919673643799";
  function txt(e){return e?e.textContent.trim():""}
  function rowVal(box,label){
    var rows=box.querySelectorAll(".row");
    for(var i=0;i<rows.length;i++){
      var sp=rows[i].children;
      if(sp.length>1&&txt(sp[0]).indexOf(label)===0)return txt(sp[1]);
    }
    return "";
  }
  function build(){
    var out=document.getElementById("scanres");
    var lines=["*"+SHOP+"*",""];
    var boxes=out.querySelectorAll(".result");
    var k=0,tot=null;
    for(var i=0;i<boxes.length;i++){
      var b=boxes[i];
      if(b.classList.contains("tot")){tot=b;continue}
      k++;
      var name=txt(b.querySelector("h2")).replace(/^\d+\.\s*/,"");
      var mrp=rowVal(b,"MRP"),our=rowVal(b,"आमच्याकडे");
      lines.push(k+". "+name);
      if(mrp&&our){lines.push("   MRP: "+mrp);lines.push("   आमचा दर: "+our)}
      else lines.push("   दर: दुकानात विचारा");
      lines.push("");
    }
    if(tot){
      lines.push("एकूण MRP: "+rowVal(tot,"एकूण MRP"));
      lines.push("आमचा एकूण दर: "+rowVal(tot,"आमच्याकडे एकूण"));
      lines.push("माझी एकूण बचत: "+rowVal(tot,"तुमची एकूण बचत"));
      lines.push("");
    }
    lines.push("आम्हाला संधी दिल्याबद्दल धन्यवाद 🙏");
    return lines.join("\n");
  }
  function addBtn(){
    var out=document.getElementById("scanres");
    if(!out)return;
    var tot=out.querySelector(".tot");
    if(!tot||tot.querySelector(".ordbtn"))return;
    var a=document.createElement("button");
    a.className="btn scan ordbtn";
    a.style.marginTop="14px";
    a.textContent="💊 गोळ्या पाहिजेत तर क्लिक करा";
    a.onclick=function(){
      window.open("https://wa.me/"+NUM+"?text="+encodeURIComponent(build()),"_blank");
    };
    tot.appendChild(a);
  }
  var t=document.getElementById("scanres");
  if(t)new MutationObserver(addBtn).observe(t,{childList:true,subtree:true});
})();
