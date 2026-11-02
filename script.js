/* ===== Data awal dari struktur spreadsheet ===== */
const CATS={
 Income:['Gaji','Merch','Event','Freelance','Arisan','Piutang','Tabungan/Dana Darurat','Dana Darurat'],
 Savings:['Tabungan','Dana Darurat','Dasawisma','Pinjaman','Emas','THR Barang Lebaran','Celengan'],
 Spending:['Makan/minum','Transport','Kopi Icha','Rokok','Xoma','Jajan','Belanja Fashion','Skin & Body Care','Motor','Kuota','Kesehatan','Hiburan','Kebutuhan Rumah','Orangtua','Hadiah','Sedekah','Band','Parkir','Sekolah Rara','Bulanan Rara','Event Lari & Fotoyu','Traktir','Belanja Pangan','Potongan BCA','Hutang/Pinjam']
};
const BILLS=['Markas','Wifi Markas','Wifi Xsat','Wifi P71','Ceper','Mandiri','P71','Kost Rara','Listrik Xsat','Listrik Markas','Belanja Bulanan','Langganan Vidio','RT','BPJS Icha'];
const DEBTS=[['Kas Beatspank',1015300,736000],['Pinjaman Gaya',4000000,500000],['Pinjaman mas Bobby',3000000,0],['Cicilan laptop Rara',13600000,6852500],['Cicilan babut 2025',12330000,0]];
const TYPES=['Income','Savings','Bills','Spending','Bayar Cicilan'];
const KEY='minical.v1';
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const today=()=>{const d=new Date();return new Date(d-d.getTimezoneOffset()*6e4).toISOString().slice(0,10)};

/* ===== State (data lama tanpa field tertentu tetap aman) ===== */
let S=null;
try{S=JSON.parse(localStorage.getItem(KEY))}catch(e){}
S=Object.assign({tx:[],shop:[],bills:BILLS.map(name=>({id:uid(),name,amt:0})),debts:DEBTS.map(([name,total,paid])=>({id:uid(),name,total,paid}))},S&&S.tx?S:{});
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){alert('Penyimpanan browser penuh atau diblokir. Segera export data.')}};
let month=today().slice(0,7),view='dash',chart=null;

/* ===== Layout dashboard (hanya tampilan, terpisah dari data keuangan) ===== */
const LKEY='minical_layout';
const WIDGETS={rem:['Pengingat Pembayaran',1],sum:['Sisa Uang & Tabungan',1],chart:['Distribusi Spending',0],debt:['Tracker Utang',0],shop:['Perencana Belanja',0],recent:['Transaksi Terakhir',0]};
const defLayout=()=>Object.entries(WIDGETS).map(([id,[title,wide]])=>({id,title,visible:true,wide:!!wide}));
let L=null;
try{L=JSON.parse(localStorage.getItem(LKEY))}catch(e){}
L=Array.isArray(L)?L.filter(w=>w&&WIDGETS[w.id]):[];
L=L.concat(defLayout().filter(d=>!L.some(w=>w.id===d.id))); // widget baru dari update tetap muncul
const saveLayout=()=>{try{localStorage.setItem(LKEY,JSON.stringify(L))}catch(e){}};
let edit=false,addOpen=false;

/* ===== Helpers ===== */
const $=id=>document.getElementById(id);
const rp=n=>(n<0?'-':'')+'Rp '+Math.abs(Math.round(n)).toLocaleString('id-ID');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fdate=d=>new Date(d+'T00:00').toLocaleDateString('id-ID',{day:'numeric',month:'short'});
const add=(a,f=x=>x)=>a.reduce((s,x)=>s+f(x),0);
const sum=(T,type)=>add(T.filter(t=>t.type===type),t=>t.amt);
const group=T=>Object.entries(T.reduce((o,t)=>(o[t.cat]=(o[t.cat]||0)+t.amt,o),{})).sort((a,b)=>b[1]-a[1]);
const byNew=(a,b)=>b.date.localeCompare(a.date)||b.id.localeCompare(a.id);
const mtx=()=>S.tx.filter(t=>t.date.startsWith(month));
const paidOf=d=>d.paid+sum(S.tx.filter(t=>t.cat===d.name),'Bayar Cicilan');
const unpaidOf=d=>Math.max(d.total-paidOf(d),0);
const billPaid=(b,T)=>T.some(t=>t.type==='Bills'&&t.cat===b.name);
const payDate=()=>today().startsWith(month)?today():month+'-01'; // bayar dari bulan yang sedang dilihat
const legendPos=()=>innerWidth<640?'bottom':'right';
const empty=m=>`<div class="py-6 text-center text-sm text-slate-400">${m}</div>`;
const tag=(ok,y,n)=>`<span class="tag ${ok?'bg-teal-400/15 mint':'bg-rose-500/15 rose'}">${ok?y:n}</span>`;
const xBtn=(fn,id)=>`<button class="text-slate-500 hover:text-rose-400 px-1" aria-label="Hapus" onclick="${fn}('${id}')">✕</button>`;
const payBtn=(k,id)=>`<button class="btn btn-mint !py-1 !px-2.5 !text-xs" onclick="pay('${k}','${id}')">Bayar</button>`;
const put=(id,h)=>{const e=$(id);if(e)e.innerHTML=h}; // aman walau widget sedang disembunyikan
const ctl=(t,fn,lbl,off,x)=>`<button class="ctl${x?' ctl-x':''}" onclick="${fn}" aria-label="${lbl}" title="${lbl}"${off?' disabled':''}>${t}</button>`;

/* ===== Navigasi ===== */
const NAV=[['dash','◈','Dashboard'],['tx','＋','Transaksi'],['debt','⛓','Utang & Tagihan'],['shop','🛒','Belanja']];
function buildNav(){
 const b=(cls,lbl)=>NAV.map(([v,i,n])=>`<button class="nav-b ${cls}" data-v="${v}" onclick="go('${v}')"><span${lbl?' class="text-lg leading-none"':''}>${i}</span>${lbl?n.split(' ')[0]:n}</button>`).join('');
 $('navSide').innerHTML=b('',0);
 $('navBot').innerHTML=b('!flex-col !gap-0.5 !px-1 !py-2 !text-[11px] !text-center items-center',1);
}
function go(v){
 view=v;
 $('editBtn').classList.toggle('hidden',v!=='dash');
 if(v!=='dash'&&edit)toggleEdit();
 document.querySelectorAll('.view').forEach(e=>e.classList.toggle('on',e.id==='v-'+v));
 document.querySelectorAll('.nav-b').forEach(e=>e.classList.toggle('on',e.dataset.v===v));
 $('ttl').textContent=NAV.find(n=>n[0]===v)[2];
 scrollTo({top:0});
 render();
}

/* ===== Dashboard modular ===== */
const BODY={
 rem:`<div id="reminder"></div>`,
 sum:`<div class="text-sm text-slate-400">Sisa Uang bulan ini</div><div id="sisa" class="text-4xl sm:text-5xl font-extrabold tracking-tight mt-1"></div>
  <div class="text-xs text-slate-400 mt-2">Sisa Uang = Income − (Savings + Bills Paid + Spending + Bayar Cicilan)</div><div id="stats" class="auto-grid mt-5"></div>
  <div class="mt-5 pt-4 border-t border-white/10"><div class="text-sm text-slate-400">Total Tabungan</div><div id="tab" class="text-3xl font-extrabold mint"></div><div id="tabSub" class="text-xs text-slate-400"></div><div id="tabList" class="auto-grid text-sm mt-3"></div></div>`,
 chart:`<div id="topBadge"></div><div class="relative h-72 mt-3"><canvas id="chart"></canvas></div><p id="chartEmpty" class="text-sm text-slate-400 text-center py-6 hidden">Belum ada data spending di bulan ini.</p>`,
 debt:`<div id="dashDebt" class="space-y-3"></div><button class="btn btn-ghost w-full mt-4" onclick="go('debt')">Kelola utang & tagihan</button>`,
 shop:`<div id="dashShop"></div><button class="btn btn-ghost w-full mt-4" onclick="go('shop')">Buka perencana</button>`,
 recent:`<div id="recent" class="divide-y divide-white/5"></div>`
};
function renderDashboard(){
 const vis=L.filter(w=>w.visible),hid=L.filter(w=>!w.visible);
 put('dash',vis.map((w,i)=>`<div id="w-${w.id}" class="glass p-5 widget${w.wide?' w-wide':''}${edit?' w-edit':''}">
  <div class="flex items-center gap-2 mb-3 flex-wrap">${edit
   ?`<input class="inp !py-1.5 flex-1 min-w-[8rem] font-bold" maxlength="40" value="${esc(w.title)}" aria-label="Judul widget" oninput="wTitle('${w.id}',this.value)">
    <div class="flex gap-1 ml-auto">${ctl('▲',`wMove('${w.id}',-1)`,'Naikkan',!i)}${ctl('▼',`wMove('${w.id}',1)`,'Turunkan',i===vis.length-1)}${ctl('⇔',`wWide('${w.id}')`,w.wide?'Perkecil':'Perlebar')}${ctl('✕',`wHide('${w.id}')`,'Hapus widget',0,1)}</div>`
   :`<h2 class="font-bold flex-1 min-w-0 truncate">${esc(w.title)}</h2><div id="hx-${w.id}" class="text-xs shrink-0"></div>`}</div>
  <div class="w-body">${BODY[w.id]}</div></div>`).join('')||`<div class="glass w-wide">${empty('Semua widget disembunyikan. Klik ⚙ Edit Dashboard lalu “+ Tambah Widget Baru”.')}</div>`);
 put('dashTools',edit?`<div class="glass p-4"><div class="flex flex-wrap gap-2"><button class="btn btn-mint" onclick="addOpen=!addOpen;renderDashboard()">+ Tambah Widget Baru</button><button class="btn btn-ghost" onclick="resetLayout()">↺ Susunan bawaan</button></div>
  ${addOpen?`<div class="flex flex-wrap gap-2 mt-3">${hid.map(w=>`<button class="btn btn-ghost !py-1.5" onclick="wShow('${w.id}')">+ ${esc(w.title)}</button>`).join('')||'<span class="text-sm text-slate-400">Semua widget sudah tampil.</span>'}</div>`:''}</div>`:'');
 $('editHint').classList.toggle('hidden',!edit);
 const b=$('editBtn');b.className='btn !py-2 !px-3 whitespace-nowrap shrink-0 '+(edit?'btn-mint':'btn-ghost');b.setAttribute('aria-pressed',edit);
 b.innerHTML=edit?'✓<span class="hidden sm:inline"> Selesai</span>':'⚙<span class="hidden sm:inline"> Edit Dashboard</span>';
 b.title=edit?'Selesai mengedit':'Edit Dashboard';
 fillDash();
}
const layoutChanged=()=>{saveLayout();renderDashboard()};
const wGet=id=>L.find(w=>w.id===id);
function toggleEdit(){edit=!edit;addOpen=false;renderDashboard()}
function wHide(id){wGet(id).visible=false;layoutChanged()}
function wShow(id){const w=wGet(id);L=L.filter(x=>x!==w).concat(w);w.visible=true;addOpen=L.some(x=>!x.visible);layoutChanged()}
function wWide(id){const w=wGet(id);w.wide=!w.wide;layoutChanged()}
function wTitle(id,v){wGet(id).title=v.trim()||WIDGETS[id][0];saveLayout()} // tanpa render ulang agar fokus input tidak hilang
function wMove(id,d){
 const v=L.filter(w=>w.visible),i=v.findIndex(w=>w.id===id),t=v[i+d];if(!t)return;
 const a=L.indexOf(v[i]),b=L.indexOf(t);[L[a],L[b]]=[L[b],L[a]];layoutChanged();
}
function resetLayout(){if(confirm('Kembalikan susunan dan judul widget ke bawaan?')){L=defLayout();addOpen=false;layoutChanged()}}

/* Isi widget: hanya membaca hasil hitungan, tidak mengubah data */
function fillDash(){
 const T=mtx(),[inc,sav,bil,spd,cic]=TYPES.map(t=>sum(T,t)),sisa=inc-(sav+bil+spd+cic);
 // [B] Sisa Uang & Tabungan
 put('sisa',`<span class="${sisa>=0?'mint':'rose'}">${rp(sisa)}</span>`);
 put('stats',[['Income','+ '+rp(inc),'mint'],['Savings','− '+rp(sav),'amb'],['Bills Paid','− '+rp(bil),'rose'],['Spending','− '+rp(spd),'rose'],['Bayar Cicilan','− '+rp(cic),'rose']]
  .map(([l,v,c])=>`<div class="rounded-xl bg-white/5 p-3"><div class="text-xs text-slate-400">${l}</div><div class="font-bold mt-1 text-sm sm:text-base whitespace-nowrap ${c}">${v}</div></div>`).join(''));
 const allSav=S.tx.filter(t=>t.type==='Savings');
 put('tab',rp(add(allSav,t=>t.amt)));
 put('tabSub',`Akumulasi semua bulan · bulan ini ${rp(sav)}`);
 put('tabList',group(allSav).map(([c,v])=>`<div class="rounded-lg bg-white/5 px-3 py-2 flex justify-between gap-2"><span class="text-slate-300 truncate">${esc(c)}</span><span class="font-semibold">${rp(v)}</span></div>`).join('')||'<div class="text-slate-400">Belum ada tabungan tercatat.</div>');
 // [C] Pos Spending terbesar + grafik
 const ent=group(T.filter(t=>t.type==='Spending'));
 put('topBadge',ent.length?`<div class="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 flex items-center gap-3"><span class="text-xl">🔥</span><div class="font-extrabold rose text-sm">Pos Pengeluaran Terbesar Bulan Ini: ${esc(ent[0][0])} - ${rp(ent[0][1])}</div></div>`
  :`<div class="text-sm text-slate-400">Pos pengeluaran terbesar akan muncul setelah ada transaksi Spending bulan ini.</div>`);
 renderChart(ent);
 // [A] Pengingat Unpaid
 const ub=S.bills.filter(b=>!billPaid(b,T)),ud=S.debts.filter(d=>unpaidOf(d)>0),n=ub.length+ud.length;
 const rem=(x,k,lbl,cls,txt)=>`<div class="flex justify-between items-center gap-2 py-1"><span class="min-w-0">${esc(x.name)} <span class="tag ${cls}">${lbl}</span></span><button class="text-xs underline shrink-0 ${k==='d'?'rose':'text-slate-300'}" onclick="pay('${k}','${x.id}')">${txt}</button></div>`;
 put('reminder',n?`<div class="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">`+ub.map(b=>rem(b,'b','Bills','bg-white/10 text-slate-300',b.amt?rp(b.amt):'Bayar')).join('')+ud.map(d=>rem(d,'d','Utang','bg-rose-500/20 rose',rp(unpaidOf(d)))).join('')+`</div>`
  :`<div class="text-sm mint">✔ Semua tagihan bulan ini sudah dibayar dan tidak ada utang tersisa.</div>`);
 put('hx-rem',n?`<span class="tag bg-rose-500/20 rose">⏰ ${n} Unpaid</span>`:'');
 $('w-rem')?.classList.toggle('w-alert',n>0);
 // [D] Tracker Utang
 put('dashDebt',S.debts.map(d=>{const p=paidOf(d),u=unpaidOf(d);
  return `<div><div class="flex justify-between gap-2 text-sm"><span class="font-semibold truncate">${esc(d.name)}</span>${u?`<span class="rose font-semibold shrink-0">${rp(u)}</span>`:tag(1,'Lunas')}</div>
  <div class="bar mt-1.5"><i style="width:${d.total?Math.min(100,p/d.total*100):0}%"></i></div><div class="text-xs text-slate-400 mt-1">${rp(p)} dari ${rp(d.total)}</div></div>`}).join('')||empty('Tidak ada utang.'));
 put('hx-debt',`<span class="text-slate-400">Sisa </span><span class="rose font-bold">${rp(add(S.debts,unpaidOf))}</span>`);
 // [E] Belanja (diisi renderShop) & [F] Transaksi terakhir
 renderShop();
 put('recent',S.tx.slice().sort(byNew).slice(0,6).map(t=>txRow(t)).join('')||empty('Belum ada transaksi. Catat yang pertama di menu Transaksi.'));
}

/* ===== Render ===== */
function render(){
 const T=mtx();
 $('mon').value=month;
 fillDash();
 // Transaksi
 $('txList').innerHTML=T.slice().sort(byNew).map(t=>txRow(t,1)).join('')||empty('Belum ada transaksi di bulan ini.');
 // Utang
 $('debtBody').innerHTML=S.debts.map(d=>{const p=paidOf(d),u=unpaidOf(d),ok=!u;
  return `<tr><td class="py-2.5 pr-2 font-semibold">${esc(d.name)}<div class="bar mt-1.5 w-28"><i style="width:${d.total?Math.min(100,p/d.total*100):0}%"></i></div></td><td class="text-right">${rp(d.total)}</td><td class="text-right mint">${rp(p)}</td><td class="text-right ${ok?'':'rose'} font-semibold">${rp(u)}</td>
  <td class="text-center">${tag(ok,'Lunas','Belum Lunas')}</td><td class="text-right whitespace-nowrap">${ok?'':payBtn('d',d.id)+' '}${xBtn('delDebt',d.id)}</td></tr>`}).join('')||`<tr><td colspan="6">${empty('Tidak ada utang. Tambahkan di bawah jika ada.')}</td></tr>`;
 // Tagihan
 $('billList').innerHTML=S.bills.map(b=>{const ok=billPaid(b,T);
  return `<div class="flex items-center justify-between gap-2 py-2.5"><div><div class="font-semibold text-sm">${esc(b.name)}</div><div class="text-xs text-slate-400">${b.amt?rp(b.amt):'Nominal bebas'}</div></div>
  <div class="flex items-center gap-2">${tag(ok,'Paid','Unpaid')}${ok?'':payBtn('b',b.id)}${xBtn('delBill',b.id)}</div></div>`}).join('')||empty('Belum ada tagihan tetap.');
}
function renderChart(ent){
 const cv=$('chart'),has=ent.length>0;
 if(chart&&chart.canvas!==cv){chart.destroy();chart=null} // widget dibangun ulang / disembunyikan
 if(!cv)return;
 $('chartEmpty').classList.toggle('hidden',has);
 cv.parentElement.classList.toggle('hidden',!has);
 if(!window.Chart||(!chart&&!has))return;
 const data={labels:ent.map(e=>e[0]),datasets:[{data:ent.map(e=>e[1]),backgroundColor:ent.map((e,i)=>`hsl(${(i*47+160)%360},80%,62%)`),borderColor:'#0f172a',borderWidth:2}]};
 if(chart){chart.data=data;return chart.update()}
 chart=new Chart(cv,{type:'doughnut',data,options:{maintainAspectRatio:false,cutout:'62%',plugins:{
  legend:{position:legendPos(),labels:{boxWidth:10,font:{size:11}}},
  tooltip:{callbacks:{label:c=>` ${c.label}: ${rp(c.parsed)} (${(c.parsed/add(c.dataset.data)*100).toFixed(1)}%)`}}}}});
}
function txRow(t,del){
 const inc=t.type==='Income',cls=inc?'mint':t.type==='Savings'?'amb':'rose';
 return `<div class="flex items-center justify-between gap-3 py-2.5"><div class="min-w-0"><div class="text-sm font-semibold truncate">${esc(t.name)}</div><div class="text-xs text-slate-400">${fdate(t.date)} · ${esc(t.type)} · ${esc(t.cat)}</div></div>
 <div class="flex items-center gap-2 shrink-0"><span class="font-bold text-sm ${cls}">${inc?'+':'−'} ${rp(t.amt)}</span>${del?xBtn('delTx',t.id):''}</div></div>`;
}

/* ===== Form transaksi ===== */
function catsFor(type){
 if(type==='Bills')return S.bills.map(b=>b.name);
 if(type==='Bayar Cicilan')return S.debts.filter(d=>unpaidOf(d)>0).map(d=>d.name);
 return CATS[type]||[];
}
function fillCats(sel){
 const c=catsFor($('fType').value);
 $('fCat').innerHTML=c.length?c.map(x=>`<option>${esc(x)}</option>`).join(''):'<option value="">(belum ada pilihan)</option>';
 if(sel&&c.includes(sel))$('fCat').value=sel;
}
function setMsg(m,ok){const e=$('fMsg');e.textContent=m;e.className='text-xs mt-2 min-h-[1rem] '+(ok?'mint':'rose')}
function resetForm(){$('fDate').value=today();$('fAmt').value=$('fName').value='';setMsg('');fillCats()}
function addTx(){
 const date=$('fDate').value,amt=parseFloat($('fAmt').value),type=$('fType').value,cat=$('fCat').value;
 if(!date)return setMsg('Isi tanggal transaksi.');
 if(!(amt>0))return setMsg('Jumlah harus lebih dari 0.');
 if(!cat)return setMsg('Pilih kategori. Untuk Bayar Cicilan, pastikan masih ada utang aktif.');
 S.tx.push({id:uid(),date,name:$('fName').value.trim()||cat,amt,type,cat});save();
 month=date.slice(0,7);
 $('fAmt').value=$('fName').value='';fillCats();render();setMsg('Tersimpan ✔ '+rp(amt)+' · '+cat,true);
}
function delTx(id){if(confirm('Hapus transaksi ini?')){S.tx=S.tx.filter(t=>t.id!==id);save();render()}}
function pay(k,id){
 const b=k==='b',x=(b?S.bills:S.debts).find(o=>o.id===id);if(!x)return;
 go('tx');
 $('fType').value=b?'Bills':'Bayar Cicilan';fillCats(x.name);
 $('fDate').value=payDate();
 $('fAmt').value=b?(x.amt||''):unpaidOf(x);
 $('fName').value=(b?'':'Cicilan ')+x.name;
 $('fAmt').focus();
}

/* ===== Utang & tagihan ===== */
const changed=()=>{save();fillCats();render()};
function addDebt(){
 const n=$('dName').value.trim(),t=parseFloat($('dTotal').value),p=parseFloat($('dPaid').value)||0;
 if(!n||!(t>0))return alert('Isi nama dan nilai total utang.');
 if(S.debts.some(d=>d.name===n))return alert('Nama utang sudah ada.');
 S.debts.push({id:uid(),name:n,total:t,paid:p});['dName','dTotal','dPaid'].forEach(i=>$(i).value='');changed();
}
function delDebt(id){if(confirm('Hapus utang ini? Riwayat pembayarannya tetap ada di transaksi.')){S.debts=S.debts.filter(d=>d.id!==id);changed()}}
function addBill(){
 const n=$('bName').value.trim();if(!n)return alert('Isi nama tagihan.');
 if(S.bills.some(b=>b.name===n))return alert('Nama tagihan sudah ada.');
 S.bills.push({id:uid(),name:n,amt:parseFloat($('bAmt').value)||0});$('bName').value=$('bAmt').value='';changed();
}
function delBill(id){if(confirm('Hapus tagihan ini?')){S.bills=S.bills.filter(b=>b.id!==id);changed()}}

/* ===== Belanja ===== */
const shopSaved=()=>{save();renderShop()};
function addShop(){
 const n=$('sName').value.trim();if(!n)return $('sName').focus();
 S.shop.push({id:uid(),name:n,est:parseFloat($('sEst').value)||0,done:false});$('sName').value=$('sEst').value='';$('sName').focus();shopSaved();
}
function togShop(id){const i=S.shop.find(x=>x.id===id);if(i){i.done=!i.done;shopSaved()}}
function delShop(id){S.shop=S.shop.filter(x=>x.id!==id);shopSaved()}
function clearShop(){S.shop=S.shop.filter(x=>!x.done);shopSaved()}
function shopSummary(){
 const open=S.shop.filter(i=>!i.done),tot=add(S.shop,i=>i.est),left=add(open,i=>i.est),done=tot-left;
 return `<div class="text-xs text-slate-400">Total anggaran</div><div class="text-2xl font-extrabold amb mb-1">${rp(tot)}</div>
  <div class="text-xs text-slate-400 mb-3">${S.shop.length-open.length}/${S.shop.length} barang dicentang · sisa ${rp(left)}</div>
  <div class="bar mb-4"><i style="width:${tot?done/tot*100:0}%"></i></div>`
  +(open.slice(0,8).map(i=>`<div class="flex justify-between text-sm py-1"><span class="truncate pr-2">${esc(i.name)}</span><span class="text-slate-300">${rp(i.est)}</span></div>`).join('')||'<div class="text-sm text-slate-400">Tidak ada barang yang menunggu.</div>')
  +(open.length>8?`<div class="text-xs text-slate-400 mt-1">+${open.length-8} lainnya</div>`:'');
}
function renderShop(){
 const tot=add(S.shop,i=>i.est),left=add(S.shop.filter(i=>!i.done),i=>i.est),done=tot-left;
 $('shTotal').textContent=rp(tot);$('shDone').textContent=rp(done);$('shLeft').textContent=rp(left);
 $('shopList').innerHTML=S.shop.map(i=>`<div class="flex items-center gap-3 py-2.5"><input type="checkbox" class="w-5 h-5 accent-teal-300 shrink-0" ${i.done?'checked':''} onchange="togShop('${i.id}')" aria-label="Centang ${esc(i.name)}">
  <span class="flex-1 text-sm ${i.done?'line-through text-slate-500':''}">${esc(i.name)}</span><span class="text-sm font-semibold ${i.done?'text-slate-500':'amb'}">${rp(i.est)}</span>${xBtn('delShop',i.id)}</div>`).join('')||empty('Daftar belanja masih kosong.');
 put('sideShop',shopSummary());put('dashShop',shopSummary());
}

/* ===== Backup ===== */
function dl(name,text,mime){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:mime}));a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
function exportCSV(){
 const q=v=>'"'+String(v).replace(/"/g,'""')+'"';
 const rows=[['Tanggal','Nama Transaksi','Jumlah (Rp)','Tipe','Kategori'],...S.tx.slice().sort((a,b)=>a.date.localeCompare(b.date)).map(t=>[t.date,t.name,t.amt,t.type,t.cat]),
  [],['Utang & Cicilan','Nilai Total','Paid','Unpaid','Status'],...S.debts.map(d=>{const u=unpaidOf(d);return [d.name,d.total,paidOf(d),u,u?'Belum Lunas':'Lunas']})];
 dl(`minical-backup-${today()}.csv`,'\ufeff'+rows.map(r=>r.map(q).join(',')).join('\r\n'),'text/csv;charset=utf-8');
}
function exportJSON(){dl(`minical-backup-${today()}.json`,JSON.stringify(S,null,2),'application/json')}

/* ===== Init ===== */
if(window.Chart)Chart.defaults.color='#94a3b8';
buildNav();
$('fType').innerHTML=TYPES.map(t=>`<option>${t}</option>`).join('');
$('fType').onchange=()=>fillCats();
$('mon').onchange=e=>{if(e.target.value){month=e.target.value;render()}};
$('fDate').value=today();fillCats();
renderDashboard();
addEventListener('resize',()=>{const p=legendPos();if(chart&&chart.options.plugins.legend.position!==p){chart.options.plugins.legend.position=p;chart.update('none')}});
go('dash');
