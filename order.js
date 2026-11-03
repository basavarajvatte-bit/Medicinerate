(function(){
  var W=typeof window!=="undefined"?window:globalThis;
  var SHOP="तुळजाभवानी मेडिकल";
  var NUM="919673643799";
  function g(id){return document.getElementById(id)}
  function E(t){return String(t).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
  function F(x){return "₹"+(Math.round(x*100)/100).toString()}
  function M(){return W.meds||[]}

  /* ---------- स्टाईल ---------- */
  if(typeof document!=="undefined"&&document.head){
    var st=document.createElement("style");
    st.textContent=
      ".same{margin-top:10px;padding:10px 12px;border-radius:10px;background:var(--goodbg);color:var(--good);font-weight:600;font-size:15px}"+
      ".opts{display:grid;gap:8px;margin-top:10px}"+
      ".opt{display:flex;align-items:center;gap:10px;margin:0;padding:10px 12px;border:1.5px solid var(--line);border-radius:12px;background:var(--card);color:var(--ink);font-size:16px;cursor:pointer}"+
      ".opt input{width:22px;height:22px;flex:none;margin:0;padding:0;accent-color:var(--brand)}"+
      ".opt.on{border-color:var(--brand);background:var(--goodbg)}"+
      ".opt .onm{flex:1;min-width:0;font-weight:600}"+
      ".opt small{display:block;font-weight:400;color:var(--mute);font-size:12px}"+
      ".bdg{display:inline-block;font-size:11px;font-weight:800;padding:1px 7px;border-radius:999px;margin-left:6px;background:var(--brand);color:var(--brand-ink)}"+
      ".bdg.b2{background:var(--accent);color:#14281d}"+
      ".ask{margin-top:10px;padding:10px 12px;border-radius:10px;background:var(--bg);border-left:4px solid var(--accent);color:var(--ink);font-weight:600;font-size:15px}";
    document.head.appendChild(st);
  }

  /* ---------- स्कॅनचा निकाल -> कार्ड्स ---------- */
  function cardsFrom(items){
    var meds=M();
    return items.map(function(it){
      var alts=(it.alts&&it.alts.length)?it.alts.slice():(it.idx!=null?[{i:it.idx,st:"check"}]:[]);
      alts=alts.filter(function(a){return meds[a.i]});
      var ex=(it.exact!=null)?it.exact:((it.by==="name"&&it.idx!=null)?it.idx:null);
      alts.sort(function(a,b){return (meds[a.i].p-meds[b.i].p)||((b.i===ex)-(a.i===ex))});
      return {n:it.name||"",s:it.salt||"",u:it.use||"",ex:ex,alts:alts,sel:alts.length?alts[0].i:null};
    });
  }
  function cardHtml(c,k){
    var meds=M();
    var h='<div class="result sc"><h2>'+(k+1)+'. '+E(c.n)+'</h2><p class="salt">'+E(c.s)+'</p>';
    if(!c.alts.length){
      h+='<div class="ask">आमच्या यादीत हे औषध किंवा याच घटकाचे औषध नाही. दुकानात विचारा.</div>';
    }else{
      var any=c.alts.some(function(a){return a.st==="check"});
      h+='<div class="same">'+(c.ex!=null
        ?'✅ तुम्ही स्कॅन केलेले औषध आमच्याकडे आहे. <u>तोच घटक (content)</u> असलेली इतर कंपन्यांची औषधे देखील:'
        :'✅ "'+E(c.n)+'" आमच्याकडे नाही, पण <u>तोच घटक (content): '+E(c.s)+'</u> असलेली ही औषधे आमच्याकडे आहेत:')+'</div>';
      h+='<div class="opts">';
      c.alts.forEach(function(a,j){
        var d=meds[a.i],cheap=(j===0&&c.alts.length>1);
        h+='<label class="opt'+(a.i===c.sel?' on':'')+'"><input type="radio" name="g'+k+'" value="'+a.i+'"'+(a.i===c.sel?' checked':'')+'>'+
          '<span class="onm">'+E(d.n)+(d.c?' · '+E(d.c):'')+
          (cheap?'<span class="bdg">सर्वात स्वस्त</span>':'')+
          (a.i===c.ex?'<span class="bdg b2">तुम्ही स्कॅन केलेले</span>':'')+
          '<small>'+E(d.s)+' · MRP '+F(d.m)+'</small></span><span class="price">'+F(d.p)+'</span></label>';
      });
      h+='</div><p class="note" style="margin:8px 0 0">'+(any?'ताकद (mg) जुळते का ते दुकानात विचारा. ':'ताकद सारखी आहे ✓. ')+
         'दुसऱ्या कंपनीचे औषध हवे असेल तर वर तेच निवडा.</p>';
    }
    h+='<div class="use"><small>उपयोग</small>'+E(c.u)+'</div></div>';
    return h;
  }
  function totals(cards){
    var t=0,m=0,n=0,meds=M();
    cards.forEach(function(c){if(c.sel!=null&&meds[c.sel]){var d=meds[c.sel];t+=d.p;m+=d.m;n++}});
    return {t:t,m:m,n:n};
  }
  function totHtml(cards){
    var x=totals(cards);
    if(!x.n)return "";
    var sv=x.m-x.t,pc=x.m>0?Math.round(sv/x.m*100):0,miss=cards.length-x.n;
    return '<h2>एकूण ('+x.n+' औषधे)</h2>'+
      '<div class="row"><span>एकूण MRP</span><b>'+F(x.m)+'</b></div>'+
      '<div class="row"><span>आमच्याकडे एकूण</span><span class="big">'+F(x.t)+'</span></div>'+
      '<div class="row"><span>तुमची एकूण बचत</span><b style="color:var(--good)">'+F(sv)+' ('+pc+'% सूट)</b></div>'+
      (miss?'<p class="note">'+miss+' औषधे आमच्या यादीत नाहीत, त्यांची किंमत एकूणमध्ये धरलेली नाही.</p>':'');
  }

  /* ---------- WhatsApp ऑर्डर संदेश ---------- */
  function build(cards){
    var meds=M(),lines=["*"+SHOP+"*",""],miss=[];
    cards.forEach(function(c,k){
      if(c.sel!=null&&meds[c.sel]){
        var d=meds[c.sel];
        lines.push((k+1)+". "+d.n+(d.c?" ("+d.c+")":""));
        lines.push("   MRP: "+F(d.m));
        lines.push("   आमचा दर: "+F(d.p));
        if(c.sel!==c.ex)lines.push("   (स्कॅन केलेले: "+c.n+(c.s?", घटक: "+c.s:"")+")");
      }else{
        lines.push((k+1)+". "+c.n);
        lines.push("   ❌ आमच्याकडे सध्या उपलब्ध नाही");
        if(c.s)lines.push("   सॉल्ट: "+c.s);
        miss.push(c);
      }
      lines.push("");
    });
    var x=totals(cards);
    if(x.n){
      lines.push("एकूण MRP: "+F(x.m));
      lines.push("आमचा एकूण दर: "+F(x.t));
      lines.push("माझी एकूण बचत: "+F(x.m-x.t));
      lines.push("");
    }
    if(miss.length){
      lines.push("*मला हवी असलेली पण उपलब्ध नसलेली औषधे:*");
      miss.forEach(function(c){lines.push("- "+c.n+(c.s?" ("+c.s+")":""))});
      lines.push("");
    }
    lines.push("आम्हाला संधी दिल्याबद्दल धन्यवाद 🙏");
    return lines.join("\n");
  }
  function orderBtn(){
    var b=document.createElement("button");
    b.className="btn scan ordbtn";
    b.style.marginTop="14px";
    b.textContent="💊 गोळ्या पाहिजेत तर क्लिक करा";
    b.onclick=function(){window.open("https://wa.me/"+NUM+"?text="+encodeURIComponent(build(W.__cards||[])),"_blank")};
    return b;
  }
  function refreshTot(){
    var tb=g("totbox");if(!tb)return;
    tb.innerHTML=totHtml(W.__cards||[]);
    tb.appendChild(orderBtn());
  }
  function logScan(cards){
    try{
      fetch("/api/log",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({items:cards.map(function(c){return{n:c.n,s:c.s,f:c.alts.length>0}})})}).catch(function(){});
    }catch(e){}
  }

  /* ---------- ग्राहकाचा स्कॅन (index.html चा doScan बदलतो) ---------- */
  function bind(out){
    if(out.__bound)return;
    out.__bound=true;
    out.addEventListener("change",function(e){
      var t=e.target;
      if(!t||t.type!=="radio"||!/^g\d+$/.test(t.name))return;
      var k=+t.name.slice(1),c=(W.__cards||[])[k];
      if(!c)return;
      c.sel=+t.value;
      var labs=out.querySelectorAll('input[name="'+t.name+'"]');
      for(var i=0;i<labs.length;i++){labs[i].parentNode.classList.toggle("on",labs[i].checked)}
      refreshTot();
    });
  }
  W.doScan=async function(f){
    var out=g("scanres"),t0=Date.now();
    g("res").innerHTML="";g("sug").innerHTML="";
    var msgs=["फोटो वाचत आहे…","औषधाचे नाव ओळखत आहे…","माहिती तपासत आहे…","आमचा दर शोधत आहे…"],mi=0;
    out.innerHTML='<div class="spin" role="status"><div class="ring"></div><div class="spm" id="spm">'+msgs[0]+'</div></div>';
    var tm=setInterval(function(){var e=g("spm");if(!e){clearInterval(tm);return}mi=(mi+1)%msgs.length;e.textContent=msgs[mi]},1500);
    try{
      var blob=await W.shrink(f),img=await W.b64(blob);
      var list=M().map(function(d,i){return i+": "+d.n+" ("+d.s+")"}).join("\n");
      var res=await fetch("/api/scan",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({image:img,list:list})});
      var j=await res.json().catch(function(){return{}});
      if(!res.ok)throw new Error(j.error||"स्कॅन झाले नाही.");
      clearInterval(tm);
      var cards=cardsFrom(j.items||[]);
      W.__cards=cards;
      if(!cards.length){
        out.innerHTML='<div class="empty">औषध ओळखता आले नाही. स्पष्ट फोटो काढा किंवा नाव टाइप करा.</div>';
        return;
      }
      var h=cards.map(cardHtml).join("");
      h+='<div class="result tot" id="totbox"></div>';
      h+='<p class="note">स्कॅनला '+((Date.now()-t0)/1000).toFixed(1)+' सेकंद लागले. औषध घेण्यापूर्वी फार्मासिस्टकडून खात्री करा. दुसऱ्या कंपनीचे औषध घेताना घटक आणि ताकद (mg) सारखी आहे का ते फार्मासिस्टला विचारा.</p>';
      out.innerHTML=h;
      bind(out);
      refreshTot();
      logScan(cards);
    }catch(e){
      clearInterval(tm);
      out.innerHTML='<div class="empty">'+E(e&&e.message?e.message:"स्कॅन झाले नाही.")+' पुन्हा प्रयत्न करा किंवा नाव टाइप करा.</div>';
    }
  };
  W.__tulja={cardsFrom:cardsFrom,cardHtml:cardHtml,totHtml:totHtml,build:build};

  /* मालकासाठी स्कॅन अहवाल */
  var all=g("all");
  if(all){
    var card=document.createElement("div");
    card.className="result";
    card.innerHTML='<b>📊 स्कॅन अहवाल</b><p class="salt">ग्राहकांनी कोणती औषधे स्कॅन केली</p>'+
      '<div style="display:flex;gap:8px"><button class="btn" id="rp1">आज</button><button class="btn" id="rp7">गेले ७ दिवस</button></div>'+
      '<div id="rpout" style="margin-top:12px"></div>';
    all.parentNode.insertBefore(card,all);
    var load=function(days){
      var o=g("rpout"),pw="";
      try{pw=localStorage.getItem("opw")||""}catch(e){}
      o.innerHTML='<div class="spin"><div class="ring"></div><div class="spm">अहवाल आणत आहे…</div></div>';
      fetch("/api/log",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({report:true,days:days,password:pw})})
      .then(function(r){return r.json().then(function(j){return{r:r,j:j}})})
      .then(function(x){
        if(!x.r.ok){o.innerHTML='<div class="un">'+E(x.j.error||"अहवाल मिळाला नाही.")+'</div>';return}
        var it=x.j.items||[];
        if(!it.length){o.innerHTML='<div class="empty">अजून कोणतेही स्कॅन झालेले नाही.</div>';return}
        var have=it.filter(function(i){return i.f}).sort(function(a,b){return b.c-a.c});
        var miss=it.filter(function(i){return !i.f}).sort(function(a,b){return b.c-a.c});
        var row=function(i){return '<div class="row"><span>'+E(i.n)+(i.s?'<small style="display:block;color:var(--mute)">'+E(i.s)+'</small>':'')+'</span><b>'+i.c+' वेळा</b></div>'};
        o.innerHTML='<div class="sum" style="display:flex;justify-content:space-between;font-weight:800;padding:12px 14px;border-radius:12px;background:var(--goodbg);color:var(--good)"><span>एकूण '+(x.j.scans||0)+' वेळा स्कॅन · '+it.length+' औषधे</span><span>आमच्याकडे '+have.length+' · नाही '+miss.length+'</span></div>'+
          '<h3 style="color:var(--bad);margin:14px 0 4px">❌ आमच्याकडे नव्हती (मागवायला हवीत)</h3>'+(miss.length?miss.map(row).join(""):'<div class="empty">काहीच नाही 👍</div>')+
          '<h3 style="color:var(--good);margin:14px 0 4px">✅ आमच्याकडे होती</h3>'+(have.length?have.map(row).join(""):'<div class="empty">काहीच नाही</div>');
      }).catch(function(){o.innerHTML='<div class="un">इंटरनेट तपासा.</div>'});
    };
    g("rp1").onclick=function(){load(1)};
    g("rp7").onclick=function(){load(7)};
  }
})();
