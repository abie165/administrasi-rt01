import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, setDoc, getDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { getStorage, ref as storageRef, uploadBytesResumable, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-storage.js";

/*
 * LOGIN SEDERHANA:
 * Pengguna cukup memasukkan PASSWORD.
 * Email di bawah hanya identitas internal Firebase dan TIDAK ditampilkan di aplikasi.
 * Buat 1 akun Email/Password di Firebase Authentication dengan email:
 * munzifani@gmail.com
 */
const LOGIN_EMAIL = "munzifani@gmail.com";

const firebaseConfig={
  apiKey:"AIzaSyDiklmp3N0o0kMRy84LkzUguvCEmFVSluM",
  authDomain:"administrasi-rt01.firebaseapp.com",
  projectId:"administrasi-rt01",
  storageBucket:"administrasi-rt01.firebasestorage.app",
  messagingSenderId:"143863042733",
  appId:"1:143863042733:web:137940acec212002316c24"
};

const configured=!firebaseConfig.apiKey.startsWith("GANTI_");
let db=null,auth=null,storage=null,role=null,warga=[],kas=[],dokumen=[];

if(configured){
  const app=initializeApp(firebaseConfig);
  auth=getAuth(app);
  db=getFirestore(app);
  storage=getStorage(app);
  onAuthStateChanged(auth,async user=>{
    if(!user){setRole(null);return}
    try{
      const u=await getDoc(doc(db,"users",user.uid));
      const r=u.exists()?u.data().role:null;
      if(r!=="pengelola"){
        await signOut(auth);
        setRole(null);
        return;
      }
      // Data lama yang belum memiliki urutan diinisialisasi sekali oleh pengelola.
      await migrateWargaOrder();
      setRole("pengelola");
      // Setelah sinkronisasi data warga lama selesai, muat ulang data dari Firebase
      // agar data langsung muncul tanpa perlu refresh halaman manual.
      await load();
    }catch(e){
      console.error(e);
      setRole(null);
    }
  });
}

const $=id=>document.getElementById(id);
const rupiah=n=>new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(Number(n)||0);
const age=d=>{
  if(!d)return null;
  const b=new Date(d),t=new Date();
  let a=t.getFullYear()-b.getFullYear();
  if(t.getMonth()<b.getMonth()||(t.getMonth()===b.getMonth()&&t.getDate()<b.getDate()))a--;
  return a;
};
const group=a=>a==null?"-":a<=5?"0-5":a<=12?"6-12":a<=17?"13-17":a<=59?"18-59":"60+";
const mask=v=>v&&v.length>=8?v.slice(0,4)+"********"+v.slice(-4):"********";
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
const fmt=d=>d?new Date(d+"T00:00:00").toLocaleDateString("id-ID",{day:"2-digit",month:"2-digit",year:"numeric"}):"-";
const fmtKas=d=>d?new Date(d+"T00:00:00").toLocaleDateString("id-ID",{day:"2-digit",month:"short",year:"numeric"}):"-";

function setRole(r){
  role=r;
  $("manageBtn").textContent=r?"Keluar":"Pengelola";
  document.querySelectorAll(".admin-only").forEach(x=>x.classList.toggle("hidden",!r));
  document.querySelectorAll(".admin-col").forEach(x=>x.style.display=r?"table-cell":"none");
  renderWarga();
  renderKas();
  renderDokumen();
}

function page(id){
  document.querySelectorAll(".page").forEach(x=>x.classList.remove("active"));
  $(id).classList.add("active");

  // Hanya untuk tampilan: warna halaman mengikuti page yang sedang dibuka.
  document.body.dataset.page=id;

  document.querySelectorAll(".bottom-nav button")
    .forEach(x=>x.classList.toggle("active",x.dataset.page===id));
}
document.querySelectorAll(".bottom-nav button").forEach(b=>b.onclick=()=>page(b.dataset.page));
page("dashboard");

async function load(){
  if(!configured){warga=[];kas=[];dokumen=[];renderAll();return}
  // Ambil tiap koleksi secara terpisah agar aturan/masalah koleksi dokumen
  // tidak membuat data warga dan kas yang sudah ada ikut gagal ditampilkan.
  const [wResult,kResult,dResult]=await Promise.allSettled([
    getDocs(collection(db,"warga_public")),
    getDocs(collection(db,"kas")),
    getDocs(collection(db,"dokumen_rt"))
  ]);
  if(wResult.status==="fulfilled"){
    warga=wResult.value.docs.map(d=>({id:d.id,...d.data()}))
      .sort((a,b)=>{
        const ao=Number.isFinite(Number(a.urutan))?Number(a.urutan):Number.MAX_SAFE_INTEGER;
        const bo=Number.isFinite(Number(b.urutan))?Number(b.urutan):Number.MAX_SAFE_INTEGER;
        if(ao!==bo)return ao-bo;
        return String(a.nama||"").localeCompare(String(b.nama||""),"id");
      });
  }else console.error("Gagal memuat data warga:",wResult.reason);
  if(kResult.status==="fulfilled")kas=kResult.value.docs.map(d=>({id:d.id,...d.data()}));
  else console.error("Gagal memuat kas:",kResult.reason);
  if(dResult.status==="fulfilled")dokumen=dResult.value.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>Number(b.createdAt||0)-Number(a.createdAt||0));
  else {console.error("Gagal memuat dokumen RT. Pastikan Firestore Rules sudah diperbarui:",dResult.reason);dokumen=[];}
  renderAll();
}

async function migrateWargaOrder(){
  try{
    const snap=await getDocs(collection(db,"warga_private"));
    const docs=snap.docs.slice().sort((a,b)=>{
      const ad=a.data()||{}, bd=b.data()||{};
      const ao=Number(ad.urutan), bo=Number(bd.urutan);
      if(Number.isFinite(ao)&&Number.isFinite(bo))return ao-bo;
      if(Number.isFinite(ao))return -1;
      if(Number.isFinite(bo))return 1;
      const at=Number(ad.updatedAt||0), bt=Number(bd.updatedAt||0);
      if(at!==bt)return at-bt;
      return a.id.localeCompare(b.id);
    });

    let maxOrder=0;
    docs.forEach(d=>{
      const n=Number(d.data()?.urutan);
      if(Number.isFinite(n)&&n>maxOrder)maxOrder=n;
    });

    for(const d of docs){
      const data=d.data()||{};
      let order=Number(data.urutan);
      if(!Number.isFinite(order)){
        order=++maxOrder;
        await updateDoc(doc(db,"warga_private",d.id),{urutan:order});
      }

      const createdAt=Number(data.createdAt||data.updatedAt||Date.now());
      if(!data.createdAt){
        await updateDoc(doc(db,"warga_private",d.id),{createdAt});
      }

      // Sinkronkan metadata urutan ke koleksi publik agar halaman Warga
      // dapat mengurutkan data tanpa perlu membaca warga_private.
      await setDoc(doc(db,"warga_public",d.id),{
        nama:data.nama||"",
        nikMask:mask(data.nik||""),
        kkMask:mask(data.kk||""),
        tempat:data.tempat||"",
        tanggal:data.tanggal||"",
        jk:data.jk||"",
        status:data.status||"",
        urutan:order,
        createdAt
      },{merge:true});
    }
  }catch(e){
    console.warn("Inisialisasi urutan warga dilewati:",e);
  }
}
function renderAll(){renderWarga();renderKas();renderDokumen();stats()}

function stats(){
  const total=warga.length;
  const kk=warga.filter(x=>x.status==="Kepala Keluarga").length;
  const l=warga.filter(x=>x.jk==="Laki-laki").length;
  const p=warga.filter(x=>x.jk==="Perempuan").length;

  $("totalWarga").textContent=total;
  $("totalKK").textContent=kk;
  $("totalLaki").textContent=l;
  $("totalPerempuan").textContent=p;
  $("sTotal").textContent=total;
  $("sKK").textContent=kk;
  $("sL").textContent=l;
  $("sP").textContent=p;

  const g={"0-5":0,"6-12":0,"13-17":0,"18-59":0,"60+":0};
  warga.forEach(x=>{const a=group(age(x.tanggal));if(g[a]!=null)g[a]++});
  const html=Object.entries(g).map(([k,v])=>`<div class="age-item"><small>${k} tahun</small><b>${v}</b></div>`).join("");
  $("sAge").innerHTML=html;

  const masuk=kas.filter(x=>x.jenis==="masuk").reduce((s,x)=>s+Number(x.nominal||0),0);
  const keluar=kas.filter(x=>x.jenis==="keluar").reduce((s,x)=>s+Number(x.nominal||0),0);
  $("masuk").textContent=rupiah(masuk);
  $("keluar").textContent=rupiah(keluar);
  $("saldo").textContent=rupiah(masuk-keluar);
  $("kasMasuk").textContent=rupiah(masuk);
  $("kasKeluar").textContent=rupiah(keluar);
  $("kasSaldo").textContent=rupiah(masuk-keluar);
}

function renderWarga(){
  const q=$("search")?.value.toLowerCase()||"";
  const jk=$("filterJK")?.value||"";
  const st=$("filterStatus")?.value||"";
  const ug=$("filterUmur")?.value||"";

  const rows=warga.filter(x=>
    (x.nama||"").toLowerCase().includes(q)&&
    (!jk||x.jk===jk)&&
    (!st||x.status===st)&&
    (!ug||group(age(x.tanggal))===ug)
  );

  $("wargaBody").innerHTML=rows.length?rows.map(x=>`
    <tr>
      <td><b>${esc(x.nama)}</b></td>
      <td>${esc(x.nikMask||"********")}</td>
      <td>${esc(x.kkMask||"********")}</td>
      <td>${esc(x.tempat||"")}</td>
      <td>${fmt(x.tanggal)}</td>
      <td>${esc(x.jk||"")}</td>
      <td>${esc(x.status||"")}</td>
      <td class="admin-col" style="display:${role?"table-cell":"none"}">
        <button class="edit" onclick="editWarga('${x.id}')">Edit</button>
        <button class="delete" onclick="hapusWarga('${x.id}')">Hapus</button>
      </td>
    </tr>`).join(""):
    `<tr><td colspan="9" class="empty">Belum ada data warga.</td></tr>`;
}
const monthNames={
  "01":"Januari","02":"Februari","03":"Maret","04":"April",
  "05":"Mei","06":"Juni","07":"Juli","08":"Agustus",
  "09":"September","10":"Oktober","11":"November","12":"Desember"
};

function renderKas(){
  kas.sort((a,b)=>(b.tanggal||"").localeCompare(a.tanggal||""));

  // Isi pilihan tahun dari transaksi yang tersedia, tanpa mengubah data Firebase.
  const yearSelect=$("kasYear");
  const selectedYear=yearSelect.value;
  const years=[...new Set(kas.map(x=>(x.tanggal||"").slice(0,4)).filter(y=>/^\d{4}$/.test(y)))].sort().reverse();
  yearSelect.innerHTML='<option value="">Semua tahun</option>'+years.map(y=>`<option value="${y}">${y}</option>`).join("");
  if(years.includes(selectedYear))yearSelect.value=selectedYear;

  const q=$("kasSearch").value.trim().toLocaleLowerCase("id");
  const year=yearSelect.value, month=$("kasMonth").value, jenis=$("kasJenis").value;
  const rows=kas.filter(x=>{
    const date=x.tanggal||"";
    const haystack=`${x.keterangan||""} ${date} ${x.jenis||""}`.toLocaleLowerCase("id");
    return (!q||haystack.includes(q))&&
      (!year||date.slice(0,4)===year)&&
      (!month||date.slice(5,7)===month)&&
      (!jenis||x.jenis===jenis);
  });

  $("kasBody").innerHTML=rows.length?rows.map(x=>`
    <tr>
      <td class="kas-date">${fmtKas(x.tanggal)}</td>
      <td class="kas-description">${esc(x.keterangan||"")}${role?`<span class="kas-row-actions"><button class="edit" onclick="editKas('${x.id}')">Edit</button><button class="delete" onclick="hapusKas('${x.id}')">Hapus</button></span>`:""}</td>
      <td class="kas-nominal">${x.jenis==="masuk"?`<span class="kas-income">+ ${rupiah(x.nominal)}</span>`:`<span class="kas-expense">- ${rupiah(x.nominal)}</span>`}</td>
    </tr>`).join(""):
    `<tr><td colspan="3" class="empty">${kas.length?"Tidak ada transaksi yang sesuai dengan filter.":"Belum ada transaksi."}</td></tr>`;

  // Rekap mengikuti pilihan Tahun + Bulan. Filter pencarian dan jenis sengaja
  // tidak memengaruhi rekap agar angka tetap menjadi ringkasan keuangan periode.
  const recapRows=kas.filter(x=>{
    const date=x.tanggal||"";
    return (!year||date.slice(0,4)===year)&&(!month||date.slice(5,7)===month);
  });
  const recapMasuk=recapRows.filter(x=>x.jenis==="masuk").reduce((s,x)=>s+Number(x.nominal||0),0);
  const recapKeluar=recapRows.filter(x=>x.jenis==="keluar").reduce((s,x)=>s+Number(x.nominal||0),0);
  const recapSaldo=recapMasuk-recapKeluar;

  let recapLabel="Semua transaksi";
  if(month&&year)recapLabel=`${monthNames[month]} ${year}`;
  else if(month)recapLabel=`${monthNames[month]} (semua tahun)`;
  else if(year)recapLabel=`Semua bulan tahun ${year}`;

  $("rekapLabel").textContent=recapLabel;
  $("rekapMasuk").innerHTML=`<span class="kas-income">${rupiah(recapMasuk)}</span>`;
  $("rekapKeluar").innerHTML=`<span class="kas-expense">${rupiah(recapKeluar)}</span>`;
  $("rekapSaldo").textContent=rupiah(recapSaldo);

  stats();
}

function renderDokumen(){
  const host=$("dokumenList");
  if(!host)return;
  const q=($("dokumenSearch")?.value||"").trim().toLocaleLowerCase("id");
  const kategori=$("dokumenKategori")?.value||"";
  const rows=dokumen.filter(x=>(!kategori||x.kategori===kategori)&&(!q||`${x.judul||""} ${x.kategori||""} ${x.keterangan||""} ${x.namaFile||""}`.toLocaleLowerCase("id").includes(q)));
  host.innerHTML=rows.length?rows.map(x=>`<article class="dokumen-card"><div class="dokumen-icon">📕</div><div class="dokumen-info"><span class="dokumen-tag">${esc(x.kategori||"Lainnya")}</span><h2>${esc(x.judul||x.namaFile||"Dokumen PDF")}</h2>${x.keterangan?`<p>${esc(x.keterangan)}</p>`:""}<small>PDF${x.createdAt?` · Diunggah ${new Date(Number(x.createdAt)).toLocaleDateString("id-ID",{day:"2-digit",month:"long",year:"numeric"})}`:""}</small><div class="dokumen-actions"><a class="doc-link" href="${esc(x.url||"#")}" target="_blank" rel="noopener noreferrer">👁️ Lihat PDF</a><a class="doc-link secondary-link" href="${esc(x.url||"#")}" download="${esc(x.namaFile||"dokumen.pdf")}" target="_blank" rel="noopener noreferrer">⬇️ Unduh</a>${role?`<button class="delete doc-delete" onclick="hapusDokumen('${x.id}')">Hapus</button>`:""}</div></div></article>`).join(""):`<div class="empty-documents">${dokumen.length?"Tidak ada dokumen yang sesuai dengan pencarian.":"Belum ada dokumen. Dokumen yang diunggah pengelola akan muncul di sini."}</div>`;
}

$("dokumenSearch").oninput=renderDokumen;
$("dokumenKategori").onchange=renderDokumen;
$("addDokumen").onclick=()=>{
  if(role!=="pengelola")return;
  $("dokumenForm").reset();
  $("dokumenError").textContent="";
  $("saveDokumen").disabled=false;
  $("saveDokumen").textContent="Unggah";
  $("dokumenDialog").showModal();
};

$("dokumenForm").onsubmit=async e=>{
  e.preventDefault();
  if(role!=="pengelola"){
    $("dokumenError").textContent="Silakan masuk sebagai Pengelola terlebih dahulu.";
    return;
  }
  const file=$("dFile").files[0];
  if(!file){
    $("dokumenError").textContent="Silakan pilih file PDF terlebih dahulu.";
    return;
  }
  if(file.type!=="application/pdf"&&!file.name.toLowerCase().endsWith(".pdf")){
    $("dokumenError").textContent="File harus berformat PDF.";
    return;
  }
  if(file.size>20*1024*1024){
    $("dokumenError").textContent="Ukuran file maksimal 20 MB.";
    return;
  }
  if(!configured||!storage||!db){
    $("dokumenError").textContent="Firebase belum siap. Muat ulang halaman, lalu coba lagi.";
    return;
  }
  if(!auth?.currentUser){
    $("dokumenError").textContent="Sesi Pengelola tidak aktif. Keluar lalu masuk kembali.";
    return;
  }

  const button=$("saveDokumen");
  const originalLabel="Unggah";
  button.disabled=true;
  button.textContent="Menyiapkan unggahan…";
  $("dokumenError").textContent="";
  let fileRef=null;
  let uploadTask=null;
  let uploaded=false;
  const safeName=file.name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]/g,"_").slice(-120);
  const path=`dokumen_rt/${Date.now()}_${safeName}`;
  try{
    fileRef=storageRef(storage,path);
    uploadTask=uploadBytesResumable(fileRef,file,{contentType:"application/pdf"});
    button.textContent="Mengunggah 0%…";

    // Upload resumable agar progres terlihat dan kesalahan jaringan dapat ditangani.
    await new Promise((resolve,reject)=>{
      let settled=false;
      const finish=(fn,value)=>{
        if(settled)return;
        settled=true;
        clearTimeout(timeoutId);
        fn(value);
      };
      const timeoutId=setTimeout(()=>{
        try{uploadTask.cancel()}catch(_){}
        finish(reject,new Error("Waktu unggah habis. Periksa koneksi internet dan coba lagi."));
      },120000);

      uploadTask.on("state_changed",snapshot=>{
        const percent=snapshot.totalBytes
          ? Math.round(snapshot.bytesTransferred/snapshot.totalBytes*100) : 0;
        button.textContent=`Mengunggah ${percent}%…`;
      },error=>finish(reject,error),()=>finish(resolve,uploadTask.snapshot));
    });
    uploaded=true;
    const url=await getDownloadURL(fileRef);
    await addDoc(collection(db,"dokumen_rt"),{
      judul:$("dJudul").value.trim(),
      kategori:$("dKategori").value,
      keterangan:$("dKeterangan").value.trim(),
      namaFile:file.name,
      storagePath:path,
      url,
      createdAt:Date.now(),
      uploadedBy:auth.currentUser.uid
    });
    $("dokumenDialog").close();
    await load();
  }catch(err){
    console.error("Unggah dokumen gagal:",err);
    // Jika file berhasil tersimpan tetapi metadata gagal, jangan hapus file otomatis.
    // Ini mencegah file yang sudah terunggah hilang akibat masalah Firestore.
    const code=err?.code||"";
    let message="Unggah gagal. ";
    if(code.includes("storage/unauthorized")||code.includes("permission-denied")){
      message="Izin Firebase ditolak. Pastikan Anda masuk sebagai Pengelola dan aturan Firebase Storage serta Firestore sudah diterapkan.";
    }else if(code.includes("storage/")||code.includes("unavailable")||code.includes("network")){
      message="Koneksi atau Firebase Storage bermasalah. Pastikan Storage sudah diaktifkan di proyek Firebase, lalu coba lagi.";
    }else if(err?.message?.includes("Waktu unggah habis")){
      message=err.message+" Jika berulang, coba file yang lebih kecil.";
    }else if(uploaded){
      message="File kemungkinan sudah tersimpan, tetapi catatan dokumennya belum berhasil disimpan. Jangan unggah berulang kali dulu; periksa koneksi/izin Firestore.";
    }else{
      message+="Periksa koneksi internet dan pengaturan Firebase. ";
    }
    $("dokumenError").textContent=message+(code?` (Kode: ${code})`:"");
  }finally{
    button.disabled=false;
    button.textContent=originalLabel;
  }
};

window.hapusDokumen=async id=>{
  if(role!=="pengelola")return;
  const item=dokumen.find(x=>x.id===id);
  if(!item||!confirm(`Hapus dokumen "${item.judul||item.namaFile}"? Tindakan ini tidak dapat dibatalkan.`))return;
  try{
    await deleteDoc(doc(db,"dokumen_rt",id));
    if(item.storagePath&&storage)await deleteObject(storageRef(storage,item.storagePath)).catch(err=>console.warn("File Storage mungkin sudah tidak ada:",err));
    await load();
  }catch(err){console.error(err);alert("Gagal menghapus dokumen: "+(err.message||err));}
};

$("search").oninput=renderWarga;
["filterJK","filterStatus","filterUmur"].forEach(id=>$(id).onchange=renderWarga);
$("kasSearch").oninput=renderKas;
["kasYear","kasMonth","kasJenis"].forEach(id=>$(id).onchange=renderKas);

$("manageBtn").onclick=()=>{
  if(role){
    signOut(auth);
    return;
  }
  $("adminError").textContent="";
  $("adminPassword").value="";
  $("adminDialog").showModal();
};

$("adminForm").onsubmit=async e=>{
  e.preventDefault();
  if(!configured){
    $("adminError").textContent="Firebase belum dikonfigurasi.";
    return;
  }
  const password=$("adminPassword").value;
  if(!password){
    $("adminError").textContent="Masukkan password.";
    return;
  }
  try{
    await signInWithEmailAndPassword(auth,LOGIN_EMAIL,password);
    $("adminDialog").close();
  }catch(err){
    console.error(err);
    $("adminError").textContent="Password salah atau akun pengelola belum dibuat di Firebase.";
  }
};

$("addWarga").onclick=()=>{
  if(role!=="pengelola")return;
  $("wTitle").textContent="Tambah Warga";
  $("wargaForm").reset();
  $("wId").value="";
  $("wargaDialog").showModal();
};

$("wargaForm").onsubmit=async e=>{
  e.preventDefault();
  if(role!=="pengelola")return;

  const id=$("wId").value;
  const oldWarga=id?warga.find(x=>x.id===id):null;
  const now=Date.now();
  const full={
    nama:$("wNama").value.trim(),
    nik:$("wNik").value.trim(),
    kk:$("wKk").value.trim(),
    tempat:$("wTempat").value.trim(),
    tanggal:$("wTanggal").value,
    jk:$("wJk").value,
    status:$("wStatus").value,
    urutan:Number(oldWarga?.urutan||0),
    createdAt:Number(oldWarga?.createdAt||now),
    updatedAt:now
  };

  if(!id){
    const maxOrder=warga.reduce((m,x)=>{
      const n=Number(x.urutan);
      return Number.isFinite(n)?Math.max(m,n):m;
    },0);
    full.urutan=maxOrder+1;
  }else if(!full.urutan){
    full.urutan=warga.length+1;
  }

  if(!/^\d{16}$/.test(full.nik)||!/^\d{16}$/.test(full.kk)){
    alert("NIK dan No. KK harus 16 digit.");
    return;
  }

  const pub={
    nama:full.nama,
    nikMask:mask(full.nik),
    kkMask:mask(full.kk),
    tempat:full.tempat,
    tanggal:full.tanggal,
    jk:full.jk,
    status:full.status,
    urutan:full.urutan,
    createdAt:full.createdAt
  };

  try{
    if(!configured){alert("Firebase belum dikonfigurasi.");return}
    if(id){
      await updateDoc(doc(db,"warga_private",id),full);
      await setDoc(doc(db,"warga_public",id),pub);
    }else{
      const r=await addDoc(collection(db,"warga_private"),full);
      await setDoc(doc(db,"warga_public",r.id),pub);
    }
    $("wargaDialog").close();
    await load();
  }catch(err){
    console.error(err);
    alert("Gagal menyimpan data warga: "+err.message);
  }
};

window.editWarga=async id=>{
  if(role!=="pengelola"||!configured)return;
  try{
    const d=await getDoc(doc(db,"warga_private",id));
    if(!d.exists()){alert("Data warga tidak ditemukan.");return}
    const x=d.data();
    $("wTitle").textContent="Edit Warga";
    $("wId").value=id;
    $("wNama").value=x.nama||"";
    $("wNik").value=x.nik||"";
    $("wKk").value=x.kk||"";
    $("wTempat").value=x.tempat||"";
    $("wTanggal").value=x.tanggal||"";
    $("wJk").value=x.jk||"Laki-laki";
    $("wStatus").value=x.status||"Anak";
    $("wargaDialog").showModal();
  }catch(err){
    alert("Gagal membuka data warga: "+err.message);
  }
};

window.hapusWarga=async id=>{
  if(role!=="pengelola"||!confirm("Hapus data warga ini?"))return;
  try{
    await deleteDoc(doc(db,"warga_private",id));
    await deleteDoc(doc(db,"warga_public",id));
    await load();
  }catch(err){
    alert("Gagal menghapus data warga: "+err.message);
  }
};

$("addKas").onclick=()=>{
  if(role!=="pengelola")return;
  $("kTitle").textContent="Tambah Transaksi";
  $("kasForm").reset();
  $("kId").value="";
  $("kTanggal").value=new Date().toISOString().slice(0,10);
  $("kasDialog").showModal();
};

$("kasForm").onsubmit=async e=>{
  e.preventDefault();
  if(role!=="pengelola")return;
  const id=$("kId").value;
  const data={
    tanggal:$("kTanggal").value,
    keterangan:$("kKet").value.trim(),
    jenis:$("kJenis").value,
    nominal:Number($("kNominal").value||0),
    updatedAt:Date.now()
  };
  try{
    if(!configured){alert("Firebase belum dikonfigurasi.");return}
    if(id)await updateDoc(doc(db,"kas",id),data);
    else await addDoc(collection(db,"kas"),data);
    $("kasDialog").close();
    await load();
  }catch(err){
    alert("Gagal menyimpan transaksi: "+err.message);
  }
};

window.editKas=async id=>{
  if(role!=="pengelola")return;
  const x=kas.find(k=>k.id===id);
  if(!x)return;
  $("kTitle").textContent="Edit Transaksi";
  $("kId").value=id;
  $("kTanggal").value=x.tanggal||"";
  $("kKet").value=x.keterangan||"";
  $("kJenis").value=x.jenis||"masuk";
  $("kNominal").value=x.nominal||0;
  $("kasDialog").showModal();
};

window.hapusKas=async id=>{
  if(role!=="pengelola"||!confirm("Hapus transaksi ini?"))return;
  try{
    await deleteDoc(doc(db,"kas",id));
    await load();
  }catch(err){
    alert("Gagal menghapus transaksi: "+err.message);
  }
};

load();
