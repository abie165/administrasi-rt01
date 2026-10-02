import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

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
let db=null,auth=null,role=null,warga=[],kas=[];

if(configured){
  const app=initializeApp(firebaseConfig);
  auth=getAuth(app);
  db=getFirestore(app);
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
      setRole("pengelola");
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

function setRole(r){
  role=r;
  $("manageBtn").textContent=r?"Keluar":"Pengelola";
  document.querySelectorAll(".admin-only").forEach(x=>x.classList.toggle("hidden",!r));
  document.querySelectorAll(".admin-col").forEach(x=>x.style.display=r?"table-cell":"none");
  renderWarga();
  renderKas();
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
  if(!configured){warga=[];kas=[];renderAll();return}
  try{
    const [w,k]=await Promise.all([
      getDocs(collection(db,"warga_public")),
      getDocs(collection(db,"kas"))
    ]);
    warga=w.docs.map(d=>({id:d.id,...d.data()}));
    kas=k.docs.map(d=>({id:d.id,...d.data()}));
    renderAll();
  }catch(e){
    console.error(e);
    warga=[];kas=[];renderAll();
  }
}

function renderAll(){renderWarga();renderKas();stats()}

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
  $("umurStats").innerHTML=html;
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
      <td>${esc(x.tempat||"")}, ${fmt(x.tanggal)}</td>
      <td>${esc(x.jk||"")}</td>
      <td>${esc(x.status||"")}</td>
      <td class="admin-col" style="display:${role?"table-cell":"none"}">
        <button class="edit" onclick="editWarga('${x.id}')">Edit</button>
        <button class="delete" onclick="hapusWarga('${x.id}')">Hapus</button>
      </td>
    </tr>`).join(""):
    `<tr><td colspan="7" class="empty">Belum ada data warga.</td></tr>`;
}

function renderKas(){
  kas.sort((a,b)=>(b.tanggal||"").localeCompare(a.tanggal||""));
  $("kasBody").innerHTML=kas.length?kas.map(x=>`
    <tr>
      <td>${fmt(x.tanggal)}</td>
      <td>${esc(x.keterangan||"")}</td>
      <td>${x.jenis==="masuk"?rupiah(x.nominal):"-"}</td>
      <td>${x.jenis==="keluar"?rupiah(x.nominal):"-"}</td>
      <td class="admin-col" style="display:${role?"table-cell":"none"}">
        <button class="edit" onclick="editKas('${x.id}')">Edit</button>
        <button class="delete" onclick="hapusKas('${x.id}')">Hapus</button>
      </td>
    </tr>`).join(""):
    `<tr><td colspan="5" class="empty">Belum ada transaksi.</td></tr>`;
  stats();
}

$("search").oninput=renderWarga;
["filterJK","filterStatus","filterUmur"].forEach(id=>$(id).onchange=renderWarga);

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
  const full={
    nama:$("wNama").value.trim(),
    nik:$("wNik").value.trim(),
    kk:$("wKk").value.trim(),
    tempat:$("wTempat").value.trim(),
    tanggal:$("wTanggal").value,
    jk:$("wJk").value,
    status:$("wStatus").value,
    alamat:$("wAlamat").value.trim(),
    updatedAt:Date.now()
  };

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
    status:full.status
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
    $("wAlamat").value=x.alamat||"";
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
