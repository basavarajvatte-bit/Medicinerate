(function(){
  var W=typeof window!=="undefined"?window:globalThis;
  var SHOP="तुळजाभवानी मेडिकल";
  var NUM="919673643799";
  function g(id){return document.getElementById(id)}
  function E(t){return String(t).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
  function F(x){return "₹"+(Math.round(x*100)/100).toString()}
  function M(){return W.meds||[]}
  function I(n){return '<svg class="i" aria-hidden="true"><use href="#i-'+n+'"/></svg>'}
  function P(d){return d.t?" / "+d.t+" गोळ्या":""}
  /* निवडलेल्या गोळ्यांची किंमत: 112 / 10 गोळ्या असेल आणि 4 घेतल्या तर 44.80 */
  function L(c,d){
    if(!(d.m>0))d=Object.assign({},d,{m:d.p});
    if(!d.t)return {q:0,p:d.p,m:d.m};
    var q=c.q||(d.t>1&&d.t<10?d.t:10);
    return {q:q,p:d.p/d.t*q,m:d.m/d.t*q};
  }
  function qtyHtml(c,k){
    var d=M()[c.sel];
    if(!d||!d.t)return "";
    var x=L(c,d),h='<label class="qty"><span>किती गोळ्या हव्या?</span><select data-q="'+k+'" aria-label="गोळ्यांची संख्या">';
    for(var i=1;i<=60;i++)h+='<option value="'+i+'"'+(i===x.q?' selected':'')+'>'+i+'</option>';
    return h+'</select></label><div class="qtyp"><span>किंमत</span><b>'+F(x.p)+'</b></div>';
  }
  function FW(t){return (String(t||"").toLowerCase().match(/[a-z]{3,}/)||[""])[0]}
  function sameBrand(a,b){var x=FW(a);return !!x&&x===FW(b)}
  function K(t){return (String(t||"").toLowerCase().match(/[a-z]{4,}/g)||[]).sort().join(" ")}

  /* ---------- स्टाईल ---------- */
  if(typeof document!=="undefined"&&document.head){
    var st=document.createElement("style");
    st.textContent=
      ".same{display:flex;gap:7px;margin-top:12px;color:var(--good);font-weight:600;font-size:14px;line-height:1.35}"+
      ".same svg{margin-top:3px}"+
      ".opts{display:grid;gap:8px;margin-top:10px}"+
      ".opt{display:flex;align-items:center;gap:10px;margin:0;padding:11px 12px;border:1.5px solid var(--line);border-radius:12px;background:var(--card);color:var(--ink);font-size:17px;cursor:pointer}"+
      ".opt input{width:22px;height:22px;flex:none;margin:0;padding:0;accent-color:var(--brand)}"+
      ".opt.on{border-color:var(--brand);background:var(--goodbg)}"+
      ".opt .onm{flex:1;min-width:0;font-weight:700;line-height:1.3}"+
      ".opt small{display:block;font-weight:400;color:var(--mute);font-size:13px}"+
      ".opt .price{font:400 25px/1.1 var(--disp);text-align:right}"+
      ".opt .price small{font:400 13px Mukta,sans-serif}"+
      ".bdg{display:inline-block;font:800 12px/1.5 Mukta,sans-serif;padding:0 7px;border-radius:999px;margin:2px 4px 2px 0;background:var(--brand);color:var(--brand-ink)}"+
      ".bdg.b2{background:var(--accent);color:var(--accent-ink)}"+
      ".addrow{display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center;justify-content:center;margin-top:14px}"+
      ".addtwo{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px}"+
      ".addbtn{width:100%;background:var(--card);color:var(--brand);border:2px dashed var(--brand);font:800 15px/1.25 Mukta,sans-serif;padding:10px 6px;border-radius:12px;cursor:pointer}"+
      ".addgal{border:0;background:none;color:var(--brand);font:700 15px Mukta,sans-serif;text-decoration:underline;text-underline-offset:3px;cursor:pointer;padding:2px}"+
      ".sc.grp{margin-top:6px;border-top-left-radius:6px;border-top-right-radius:6px;border-left:4px solid var(--accent)}"+
      ".grpnote{font-size:14px;font-weight:700;color:var(--mute);margin:0 0 6px}"+
      ".qty{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:10px 0 0;font-weight:700;font-size:16px;color:var(--ink)}"+
      ".qty select{width:92px;flex:none;padding:8px 10px;font-weight:700}"+
      ".qtyp{display:flex;justify-content:space-between;align-items:baseline;margin-top:6px;font-size:16px;color:var(--mute)}"+
      ".qtyp b{font:400 25px/1.1 var(--disp);color:var(--brand)}"+
      ".use{margin-top:12px;padding:10px 12px;border-radius:10px;background:var(--goodbg);border-left:4px solid var(--accent);font-size:20px;line-height:1.3;font-weight:800}"+
      ".opt.xh{display:none}"+
      ".oth{margin-top:10px;padding:10px 12px;border-radius:10px;border:1.5px dashed var(--accent);font-size:15px}"+
      ".morebtn{display:block;margin:8px auto 0;padding:6px 14px;border-radius:999px;border:1.5px solid var(--brand);background:transparent;color:var(--brand);font:700 14px Mukta,sans-serif;cursor:pointer}"+
      ".mini{font-size:12px;line-height:1.4;color:var(--mute);margin:12px 2px 0}"+
      ".gsearch{display:block;text-align:center;margin-top:8px;padding:9px 10px;border-radius:10px;border:1.5px solid var(--brand);color:var(--brand);text-decoration:none;font-weight:700;font-size:15px}"+
      ".ask{display:flex;align-items:center;gap:8px;margin-top:10px;padding:10px 12px;border-radius:10px;background:var(--bg);border-left:4px solid var(--accent);color:var(--ink);text-decoration:none;font-weight:600;font-size:16px}";
    document.head.appendChild(st);
  }

  /* ---------- स्कॅनचा निकाल -> कार्ड्स ---------- */
  function cardsFrom(items){
    var meds=M();
    return items.map(function(it){
      var alts=(it.alts&&it.alts.length)?it.alts.slice():(it.idx!=null?[{i:it.idx,st:"check"}]:[]);
      alts=alts.filter(function(a){return meds[a.i]});
      var ex=(it.exact!=null)?it.exact:((it.by==="name"&&it.idx!=null)?it.idx:null);
      var up=function(d){return d.p/(d.t||1)};
      alts.sort(function(a,b){return (up(meds[a.i])-up(meds[b.i]))||((b.i===ex)-(a.i===ex))});
      return {os:it.otherStr||[],n:it.name||"",s:it.salt||"",u:it.use||"",g:!!it.guess,ex:ex,alts:alts,sel:alts.length?alts[0].i:null};
    });
  }
  function cardHtml(c,k){
    var meds=M();
    var pv=(W.__cards||[])[k-1],grp=pv&&K(c.s)&&K(pv.s)===K(c.s);
    var h='<div class="result sc'+(grp?' grp':'')+'">'+(grp?'<p class="grpnote">वरच्या औषधाचाच घटक</p>':'')+'<h2>'+(k+1)+'. '+E(c.n)+'</h2>'+(c.s?'<p class="salt">'+E(c.s)+'</p>':'')+
      (c.g?'<a class="gsearch" target="_blank" rel="noopener" href="https://www.google.com/search?q='+encodeURIComponent(c.n+" composition uses")+'">🔍 Google वर घटक पहा</a>':'');
    if(!c.alts.length){
      var wa="*"+SHOP+"*\n\nहे औषध मागवून देता येईल का?\nऔषध: "+c.n+(/[a-z]/i.test(c.s)?"\nघटक: "+c.s:"");
      if(c.os&&c.os.length){
        h+='<div class="oth">⚠️ <b>'+E(c.n)+' ची ही ताकद आमच्याकडे नाही.</b> आमच्याकडे फक्त <b>'+c.os.map(E).join(", ")+'</b> मध्ये आहे. डॉक्टरांना विचारल्याशिवाय ताकद बदलू नका.</div>';
      }
      h+='<a class="ask" target="_blank" rel="noopener" href="https://wa.me/'+NUM+'?text='+encodeURIComponent(wa)+'" aria-label="WhatsApp वर दुकानाला विचारा"><span aria-hidden="true">💬</span><span>हे औषध मागवून देता येईल का, ते दुकानात विचारा.</span></a>';
    }else{
      h+='<div class="same">'+I("ok")+'<span>'+(c.ex!=null
        ?'हे औषध आमच्याकडे आहे.'
        :(sameBrand(c.n,meds[c.alts[0].i].n)?'घटक तोच.':'घटक तोच, कंपनी वेगळी.'))+'</span></div>';
      h+='<div class="opts">';
      var hid=0;
      c.alts.forEach(function(a,j){
        var d=meds[a.i],cheap=(j===0&&c.alts.length>1);
        var xh=!c.open&&j>=3&&a.i!==c.sel&&a.i!==c.ex;if(xh)hid++;
        h+='<label class="opt'+(a.i===c.sel?' on':'')+(xh?' xh':'')+'"><input type="radio" name="g'+k+'" value="'+a.i+'"'+(a.i===c.sel?' checked':'')+'>'+
          '<span class="onm">'+E(d.n)+(d.c?' · '+E(d.c):'')+
          (cheap?'<span class="bdg">सर्वात स्वस्त</span>':'')+
          (a.i===c.ex?'<span class="bdg b2">तुम्ही स्कॅन केलेले</span>':'')+
          '<small>'+E(d.s)+(d.m>0?' · MRP '+F(d.m):'')+'</small></span><span class="price">'+F(d.p)+(d.t?'<small>/ '+d.t+' गोळ्या</small>':'')+'</span></label>';
      });
      h+='</div>'+(hid?'<button type="button" class="morebtn" data-more="'+k+'">आणखी '+hid+' पर्याय पहा ▾</button>':'')+'<div id="qb'+k+'">'+qtyHtml(c,k)+'</div>';
    }
    h+=(c.u?'<div class="use">'+E(c.u)+'</div>':'')+'</div>';
    return h;
  }
  function totals(cards){
    var t=0,m=0,n=0,meds=M();
    cards.forEach(function(c){if(c.sel!=null&&meds[c.sel]){var x=L(c,meds[c.sel]);t+=x.p;m+=x.m;n++}});
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
        var x=L(c,d);
        lines.push((k+1)+". "+d.n+(d.c?" ("+d.c+")":""));
        if(d.m>0)lines.push("   MRP: "+F(d.m)+P(d));
        lines.push("   आमचा दर: "+F(d.p)+P(d));
        if(x.q)lines.push("   मला हव्या: "+x.q+" गोळ्या = "+F(x.p));
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
    b.className="btn ordbtn";
    b.textContent="💊 गोळ्या पाहिजेत तर क्लिक करा";
    b.onclick=function(){window.open("https://wa.me/"+NUM+"?text="+encodeURIComponent(build(W.__cards||[])),"_blank")};
    return b;
  }
  function refreshTot(){
    var tb=g("totbox");if(!tb)return;
    var cs=W.__cards||[],x=totals(cs),bar=g("ordbar");
    tb.innerHTML=totHtml(cs);
    bar.innerHTML=x.n?'<div><small>एकूण '+x.n+' औषधे</small><b>'+F(x.t)+'</b></div>':'';
    bar.appendChild(orderBtn());
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
    out.addEventListener("click",function(e){
      var b=e.target&&e.target.closest&&e.target.closest("[data-more]");
      if(!b)return;
      var k=+b.dataset.more,c=(W.__cards||[])[k];if(c)c.open=true;
      var ls=out.querySelectorAll('input[name="g'+k+'"]');
      for(var i=0;i<ls.length;i++)ls[i].parentNode.classList.remove("xh");
      b.parentNode.removeChild(b);
    });
    out.addEventListener("change",function(e){
      var t=e.target;
      if(t&&t.dataset&&t.dataset.q!=null){
        var q=(W.__cards||[])[+t.dataset.q];
        if(!q)return;
        q.q=+t.value;
        g("qb"+t.dataset.q).innerHTML=qtyHtml(q,+t.dataset.q);
        refreshTot();
        return;
      }
      if(!t||t.type!=="radio"||!/^g\d+$/.test(t.name))return;
      var k=+t.name.slice(1),c=(W.__cards||[])[k];
      if(!c)return;
      c.sel=+t.value;
      c.q=null;
      g("qb"+k).innerHTML=qtyHtml(c,k);
      var labs=out.querySelectorAll('input[name="'+t.name+'"]');
      for(var i=0;i<labs.length;i++){labs[i].parentNode.classList.toggle("on",labs[i].checked)}
      refreshTot();
    });
  }
  /* सर्व स्कॅन केलेली औषधे एकत्र दाखवणे */
  function resultsHtml(secs,slot){
    var h=(W.__cards||[]).map(cardHtml).join("");
    if((W.__cards||[]).some(function(c){return c.alts.length}))h+='<p class="mini">ताकद (mg) जुळते का ते दुकानात विचारा. दुसऱ्या कंपनीचे औषध हवे असेल तर वर तेच निवडा.</p>';
    h+=slot||'<div class="addtwo"><button class="addbtn" id="addcam">➕ आणखी औषध जोडा</button><button class="addbtn" id="addgal">गॅलरीतून जोडा</button></div>';
    h+='<div class="result tot" id="totbox"></div>';
    h+='<p class="note">'+(secs?'स्कॅनला '+secs+' सेकंद लागले. ':'')+'औषध घेण्यापूर्वी फार्मासिस्टकडून खात्री करा. दुसऱ्या कंपनीचे औषध घेताना घटक आणि ताकद (mg) सारखी आहे का ते फार्मासिस्टला विचारा.</p>';
    h+='<div class="ordbar" id="ordbar"></div>';
    if(!slot)h+='<div class="addrow"><button class="addgal" id="newlist">नवीन यादी सुरू करा</button></div>';
    return h;
  }
  function wireAdd(){
    var c=g("addcam"),v=g("addgal"),n=g("newlist");
    if(c)c.onclick=function(){g("file").click()};
    if(v)v.onclick=function(){g("file2").click()};
    if(n)n.onclick=function(){W.__cards=[];g("scanres").innerHTML=""};
  }
  /* नाव टाइप करून शोधलेले औषध यादीत जोडणे */
  function insertCard(list,c){
    var key=K(c.s),at=-1;
    if(key)list.forEach(function(o,i){if(K(o.s)===key)at=i});
    if(at>=0)list.splice(at+1,0,c);else list.push(c);
  }
  function addMed(i){
    var d=M()[i];if(!d)return;
    var list=W.__cards||(W.__cards=[]);
    var have=list.some(function(o){return o.sel===i||o.n.toLowerCase()===d.n.toLowerCase()});
    if(!have)insertCard(list,{n:d.n,s:d.s,u:"",ex:i,alts:[{i:i,st:"check"}],sel:i});
    var out=g("scanres");
    out.innerHTML=resultsHtml("");
    bind(out);refreshTot();wireAdd();
    g("res").innerHTML="";g("sug").innerHTML="";g("q").value="";
    var bar=g("ordbar");if(bar)bar.scrollIntoView({behavior:"smooth",block:"center"});
  }
  var oldShow=W.show;
  if(oldShow)W.show=function(){
    oldShow();
    var r=document.querySelector("#res .result");
    if(!r||W.sel==null)return;
    var b=document.createElement("button"),i=W.sel;
    b.className="addbtn";b.style.marginTop="12px";
    b.textContent="➕ यादीत जोडा";
    b.onclick=function(){addMed(i)};
    r.appendChild(b);
  };
  W.doScan=async function(f){
    var out=g("scanres"),t0=Date.now();
    var add=(W.__cards||[]).length>0;
    g("res").innerHTML="";g("sug").innerHTML="";
    var msgs=["फोटो वाचत आहे…","भरपूर पाणी प्या 💧","औषधाचे नाव ओळखत आहे…","रोज थोडा व्यायाम करा 🚶","माहिती तपासत आहे…","पुरेशी झोप घ्या 😴","आमचा दर शोधत आहे…","औषधे वेळेवर घ्या 💊"],mi=0;
    var pic=URL.createObjectURL(f);
    W.__last=f;
    var wait='<div class="scanview"><img src="'+pic+'" alt=""><i class="sweep"></i></div><div class="spm" id="spm" role="status">'+msgs[0]+'</div>';
    if(add){out.innerHTML=resultsHtml("",wait);bind(out);refreshTot();g("spm").scrollIntoView({behavior:"smooth",block:"center"})}
    else{W.__cards=[];out.innerHTML=wait}
    var tm=setInterval(function(){var e=g("spm");if(!e){clearInterval(tm);return}mi=(mi+1)%msgs.length;e.textContent=msgs[mi]},1500);
    try{
      var blob=await W.shrink(f),img=await W.b64(blob);
      var list=M().map(function(d,i){return i+": "+d.n+" ("+d.s+")"}).join("\n");
      var res=await fetch("/api/scan",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({image:img,list:list})});
      var j=await res.json().catch(function(){return{}});
      if(!res.ok)throw new Error(j.error||"स्कॅन झाले नाही.");
      clearInterval(tm);URL.revokeObjectURL(pic);
      var cards=cardsFrom(j.items||[]);
      var old=W.__cards||[];
      cards=cards.filter(function(c){return !old.some(function(o){return o.n.toLowerCase()===c.n.toLowerCase()})});
      cards.forEach(function(c){insertCard(old,c)});
      W.__cards=old;
      if(!W.__cards.length){
        out.innerHTML='<div class="empty">औषध ओळखता आले नाही. स्पष्ट फोटो काढा किंवा नाव टाइप करा.</div>';
        return;
      }
      out.innerHTML=resultsHtml(((Date.now()-t0)/1000).toFixed(1));
      bind(out);
      refreshTot();
      wireAdd();
      if(cards.length)logScan(cards);
    }catch(e){
      clearInterval(tm);URL.revokeObjectURL(pic);
      var m=String(e&&e.message||"");
      if(!m||/fetch|network|load failed/i.test(m))m="इंटरनेट जोडणी मिळाली नाही.";
      else m=m.split("(")[0].trim();
      var fail='<div class="fail">'+E(m)+'<p>पुन्हा स्कॅन करा किंवा खाली औषधाचे नाव टाइप करा.</p><button class="btn" id="retry">पुन्हा स्कॅन करा</button></div>';
      if(add){out.innerHTML=resultsHtml("",fail);bind(out);refreshTot()}
      else out.innerHTML=fail;
      g("retry").onclick=function(){W.doScan(W.__last)};
    }
  };
  /* गॅलरीतून एकावेळी अनेक फोटो */
  var gf=g("file2");
  if(gf){
    gf.multiple=true;
    gf.onchange=async function(){
      var fs=Array.prototype.slice.call(this.files||[]);
      this.value="";
      if(fs.length>5){alert("एका वेळी जास्तीत जास्त 5 फोटो निवडा. पहिले 5 फोटो स्कॅन होतील.");fs=fs.slice(0,5)}
      for(var i=0;i<fs.length;i++)await W.doScan(fs[i]);
    };
  }
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
