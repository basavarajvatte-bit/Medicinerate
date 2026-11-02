(function(){
  var SHOP="तुळजाभवानी मेडिकल";
  var NUM="919673643799";
  function txt(e){return e?e.textContent.trim():""}
  function esc(t){return String(t).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
  function rowVal(box,label){
    var rows=box.querySelectorAll(".row");
    for(var i=0;i<rows.length;i++){
      var sp=rows[i].children;
      if(sp.length>1&&txt(sp[0]).indexOf(label)===0)return txt(sp[1]);
    }
    return "";
  }
  function readItems(){
    var out=document.getElementById("scanres"),res=[];
    var boxes=out.querySelectorAll(".result");
    for(var i=0;i<boxes.length;i++){
      var b=boxes[i];
      if(b.classList.contains("tot"))continue;
      res.push({
        n:txt(b.querySelector("h2")).replace(/^\d+\.\s*/,""),
        s:txt(b.querySelector(".salt")),
        f:!!b.querySelector(".row"),
        mrp:rowVal(b,"MRP"),
        our:rowVal(b,"आमच्याकडे")
      });
    }
    return res;
  }
  function build(){
    var out=document.getElementById("scanres");
    var items=readItems(),tot=out.querySelector(".tot");
    var lines=["*"+SHOP+"*",""],miss=[];
    items.forEach(function(it,k){
      lines.push((k+1)+". "+it.n);
      if(it.f){lines.push("   MRP: "+it.mrp);lines.push("   आमचा दर: "+it.our)}
      else{
        lines.push("   ❌ आमच्याकडे सध्या उपलब्ध नाही");
        if(it.s)lines.push("   सॉल्ट: "+it.s);
        miss.push(it);
      }
      lines.push("");
    });
    if(tot){
      lines.push("एकूण MRP: "+rowVal(tot,"एकूण MRP"));
      lines.push("आमचा एकूण दर: "+rowVal(tot,"आमच्याकडे एकूण"));
      lines.push("माझी एकूण बचत: "+rowVal(tot,"तुमची एकूण बचत"));
      lines.push("");
    }
    if(miss.length){
      lines.push("*मला हवी असलेली पण उपलब्ध नसलेली औषधे:*");
      miss.forEach(function(it){lines.push("- "+it.n+(it.s?" ("+it.s+")":""))});
      lines.push("");
    }
    lines.push("आम्हाला संधी दिल्याबद्दल धन्यवाद 🙏");
    return lines.join("\n");
  }
  function addBtn(){
    var out=document.getElementById("scanres");
    if(!out||out.querySelector(".ordbtn"))return;
    if(!out.querySelector(".result"))return;
    var a=document.createElement("button");
    a.className="btn scan ordbtn";
    a.style.marginTop="14px";
    a.textContent="💊 गोळ्या पाहिजेत तर क्लिक करा";
    a.onclick=function(){
      window.open("https://wa.me/"+NUM+"?text="+encodeURIComponent(build()),"_blank");
    };
    var tot=out.querySelector(".tot");
    if(tot)tot.appendChild(a);else out.appendChild(a);
  }
  var lastFirst=null;
  function logScan(){
    var out=document.getElementById("scanres");
    var first=out.querySelector(".result");
    if(!first||first===lastFirst)return;
    lastFirst=first;
    var items=readItems().map(function(it){return{n:it.n,s:it.s,f:it.f}});
    try{
      fetch("/api/log",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({items:items})}).catch(function(){});
    }catch(e){}
  }
  var t=document.getElementById("scanres");
  if(t)new MutationObserver(function(){logScan();addBtn()}).observe(t,{childList:true,subtree:true});

  /* मालकासाठी स्कॅन अहवाल */
  var all=document.getElementById("all");
  if(all){
    var card=document.createElement("div");
    card.className="result";
    card.innerHTML='<b>📊 स्कॅन अहवाल</b><p class="salt">ग्राहकांनी कोणती औषधे स्कॅन केली</p>'+
      '<div style="display:flex;gap:8px"><button class="btn" id="rp1">आज</button><button class="btn" id="rp7">गेले ७ दिवस</button></div>'+
      '<div id="rpout" style="margin-top:12px"></div>';
    all.parentNode.insertBefore(card,all);
    var load=function(days){
      var o=document.getElementById("rpout"),pw="";
      try{pw=localStorage.getItem("opw")||""}catch(e){}
      o.innerHTML='<div class="spin"><div class="ring"></div><div class="spm">अहवाल आणत आहे…</div></div>';
      fetch("/api/log",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({report:true,days:days,password:pw})})
      .then(function(r){return r.json().then(function(j){return{r:r,j:j}})})
      .then(function(x){
        if(!x.r.ok){o.innerHTML='<div class="un">'+esc(x.j.error||"अहवाल मिळाला नाही.")+'</div>';return}
        var it=x.j.items||[];
        if(!it.length){o.innerHTML='<div class="empty">अजून कोणतेही स्कॅन झालेले नाही.</div>';return}
        var have=it.filter(function(i){return i.f}).sort(function(a,b){return b.c-a.c});
        var miss=it.filter(function(i){return !i.f}).sort(function(a,b){return b.c-a.c});
        var row=function(i){return '<div class="row"><span>'+esc(i.n)+(i.s?'<small style="display:block;color:var(--mute)">'+esc(i.s)+'</small>':'')+'</span><b>'+i.c+' वेळा</b></div>'};
        o.innerHTML='<div class="sum" style="display:flex;justify-content:space-between;font-weight:800;padding:12px 14px;border-radius:12px;background:var(--goodbg);color:var(--good)"><span>एकूण '+it.length+' औषधे</span><span>आमच्याकडे '+have.length+' · नाही '+miss.length+'</span></div>'+
          '<h3 style="color:var(--bad);margin:14px 0 4px">❌ आमच्याकडे नव्हती (मागवायला हवीत)</h3>'+(miss.length?miss.map(row).join(""):'<div class="empty">काहीच नाही 👍</div>')+
          '<h3 style="color:var(--good);margin:14px 0 4px">✅ आमच्याकडे होती</h3>'+(have.length?have.map(row).join(""):'<div class="empty">काहीच नाही</div>');
      }).catch(function(){o.innerHTML='<div class="un">इंटरनेट तपासा.</div>'});
    };
    document.getElementById("rp1").onclick=function(){load(1)};
    document.getElementById("rp7").onclick=function(){load(7)};
  }
})();
