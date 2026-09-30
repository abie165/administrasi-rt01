import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

// GANTI konfigurasi berikut dengan konfigurasi proyek Firebase Anda.
const firebaseConfig = {
  apiKey: "GANTI_API_KEY",
  authDomain: "GANTI_PROJECT_ID.firebaseapp.com",
  projectId: "GANTI_PROJECT_ID",
  storageBucket: "GANTI_PROJECT_ID.firebasestorage.app",
  messagingSenderId: "GANTI_MESSAGING_SENDER_ID",
  appId: "GANTI_APP_ID"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const $ = id => document.getElementById(id);
const rupiah = n => new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(n||0);
const mask = (v) => v ? v.slice(0,4)+"********"+v.slice(-4) : "";
let role = "warga", wargaCache=[], kasCache=[];

function isAdmin(){ return role==="ketua" || role==="bendahara"; }

async function loadRole(user){
  // Sederhana dan aman untuk tahap awal: role ditentukan dari custom claims.
  // Atur custom claim 'role' = 'ketua' atau 'bendahara' melalui Admin SDK/Cloud Functions.
  const token = await user.getIdTokenResult(true);
  role = token.claims.role || "warga";
  $("roleLabel").textContent = role==="ketua" ? "Ketua RT" : role==="bendahara" ? "Bendahara/Petugas" : "Warga";
  document.querySelectorAll(".admin-only,.admin-col").forEach(el=>el.classList.toggle("hidden", !isAdmin()));
}

// Aplikasi terbuka tanpa login.
// Semua orang dapat melihat dashboard/data yang diizinkan.
// Tindakan tambah/edit/hapus meminta password admin.
// Password TIDAK disimpan di browser; validasi dilakukan melalui Firebase Authentication.
let adminMode = false;

async function adminLogin() {
  const email = prompt("Masukkan email akun Ketua RT/Bendahara:");
  if (!email) return false;
  const password = prompt("Masukkan password:");
  if (!password) return false;
  try {
    await signInWithEmailAndPassword(auth, email, password);
    const token = await auth.currentUser.getIdTokenResult(true);
    const r = token.claims.role;
    if (r !== "ketua" && r !== "bendahara") {
      await signOut(auth);
      alert("Akun ini tidak memiliki hak pengelolaan.");
      return false;
    }
    role = r;
    adminMode = true;
    $("roleLabel").textContent = r==="ketua" ? "Mode Ketua RT" : "Mode Bendahara";
    document.querySelectorAll(".admin-only,.admin-col").forEach(el=>el.classList.remove("hidden"));
    renderWarga(); renderKas();
    return true;
  } catch (err) {
    alert("Email atau password salah.");
    return false;
  }
}

function requireAdmin() {
  if (adminMode) return Promise.resolve(true);
  return adminLogin();
}

document.addEventListener("DOMContentLoaded", ()=>{
  $("appView").classList.remove("hidden");
  $("logoutBtn").classList.add("hidden");
  subscribeWarga();
  subscribeKas();
  renderDashboard();
});

$("logoutBtn").onclick=async()=>{ await signOut(auth); adminMode=false; role="warga"; document.querySelectorAll(".admin-only,.admin-col").forEach(el=>el.classList.add("hidden")); renderWarga(); renderKas(); };

document.querySelectorAll(".tabs button").forEach(btn=>btn.onclick=()=>{
  document.querySelectorAll(".tabs button").forEach(x=>x.classList.remove("active"));
  document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));
  btn.classList.add("active"); $(btn.dataset.tab).classList.add("active");
});

function subscribeWarga(){
  onSnapshot(query(collection(db,"warga"),orderBy("nama")), snap=>{
    wargaCache=snap.docs.map(d=>({id:d.id,...d.data()})); renderWarga(); renderDashboard();
  });
}
function subscribeKas(){
  onSnapshot(query(collection(db,"kas"),orderBy("tanggal","desc")), snap=>{
    kasCache=snap.docs.map(d=>({id:d.id,...d.data()})); renderKas(); renderDashboard();
  });
}
function renderWarga(){
  $("wargaBody").innerHTML=wargaCache.map(w=>`<tr>
    <td>${esc(w.nama)}</td><td>${mask(w.nik)}</td><td>${mask(w.kk)}</td>
    <td>${esc(w.tempatLahir||"")}, ${esc(w.tanggalLahir||"")}</td><td>${esc(w.jenisKelamin)}</td><td>${esc(w.statusKeluarga)}</td>
    ${isAdmin()?`<td><button onclick="editWarga('${w.id}')">Edit</button> <button class="danger" onclick="hapusWarga('${w.id}')">Hapus</button></td>`:""}
  </tr>`).join("");
}
function renderKas(){
  $("kasBody").innerHTML=kasCache.map(k=>`<tr>
    <td>${esc(k.tanggal)}</td><td>${esc(k.keterangan)}</td>
    <td>${k.jenis==="masuk"?rupiah(k.nominal):"-"}</td><td>${k.jenis==="keluar"?rupiah(k.nominal):"-"}</td>
    ${isAdmin()?`<td><button onclick="editKas('${k.id}')">Edit</button> <button class="danger" onclick="hapusKas('${k.id}')">Hapus</button></td>`:""}
  </tr>`).join("");
  const masuk=kasCache.filter(x=>x.jenis==="masuk").reduce((a,b)=>a+(+b.nominal||0),0);
  const keluar=kasCache.filter(x=>x.jenis==="keluar").reduce((a,b)=>a+(+b.nominal||0),0);
  $("totalMasuk").textContent=rupiah(masuk); $("totalKeluar").textContent=rupiah(keluar); $("saldoKas").textContent=rupiah(masuk-keluar);
}
function renderDashboard(){
  const total=wargaCache.length, kk=wargaCache.filter(w=>w.statusKeluarga==="Kepala Keluarga").length;
  $("totalWarga").textContent=total; $("totalKK").textContent=kk;
  $("laki").textContent=wargaCache.filter(w=>w.jenisKelamin==="Laki-laki").length;
  $("perempuan").textContent=wargaCache.filter(w=>w.jenisKelamin==="Perempuan").length;
  const groups={"0–5":0,"6–12":0,"13–17":0,"18–59":0,"60+":0};
  wargaCache.forEach(w=>{const a=age(w.tanggalLahir); if(a<6)groups["0–5"]++; else if(a<13)groups["6–12"]++; else if(a<18)groups["13–17"]++; else if(a<60)groups["18–59"]++; else groups["60+"]++;});
  $("umurStats").innerHTML=Object.entries(groups).map(([k,v])=>`<div><span>${k} tahun</span><br><b>${v}</b> warga</div>`).join("");
  const masuk=kasCache.filter(x=>x.jenis==="masuk").reduce((a,b)=>a+(+b.nominal||0),0);
  const keluar=kasCache.filter(x=>x.jenis==="keluar").reduce((a,b)=>a+(+b.nominal||0),0);
  $("saldo").textContent=rupiah(masuk-keluar);
}
function age(d){if(!d)return 0;const b=new Date(d),n=new Date();let a=n.getFullYear()-b.getFullYear();if(n<new Date(n.getFullYear(),b.getMonth(),b.getDate()))a--;return a}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}

$("addWargaBtn").onclick=async()=>{ if(!(await requireAdmin()))return; $("wargaForm").reset(); $("wargaId").value=""; $("wargaDialogTitle").textContent="Tambah Warga"; $("wargaDialog").showModal(); };
$("wargaForm").addEventListener("submit",async e=>{e.preventDefault(); if(!(await requireAdmin()))return;
 const data={nama:$("nama").value.trim(),nik:$("nik").value.trim(),kk:$("kk").value.trim(),tempatLahir:$("tempatLahir").value.trim(),tanggalLahir:$("tanggalLahir").value,jenisKelamin:$("jenisKelamin").value,statusKeluarga:$("statusKeluarga").value,alamat:$("alamat").value.trim(),updatedAt:new Date().toISOString()};
 const id=$("wargaId").value; if(id) await updateDoc(doc(db,"warga",id),data); else await addDoc(collection(db,"warga"),data); $("wargaDialog").close();
});
window.editWarga=async id=>{ if(!(await requireAdmin()))return;const w=wargaCache.find(x=>x.id===id); if(!w)return; $("wargaId").value=id; for(const [k,v] of Object.entries({nama:w.nama,nik:w.nik,kk:w.kk,tempatLahir:w.tempatLahir,tanggalLahir:w.tanggalLahir,jenisKelamin:w.jenisKelamin,statusKeluarga:w.statusKeluarga,alamat:w.alamat}))$(k).value=v||""; $("wargaDialogTitle").textContent="Ubah Data Warga"; $("wargaDialog").showModal();};
window.hapusWarga=async id=>{if(!(await requireAdmin()))return; if(confirm("Hapus data warga ini?"))await deleteDoc(doc(db,"warga",id));};

$("addKasBtn").onclick=async()=>{ if(!(await requireAdmin()))return; $("kasForm").reset(); $("kasId").value=""; $("kasTanggal").value=new Date().toISOString().slice(0,10); $("kasDialogTitle").textContent="Tambah Transaksi"; $("kasDialog").showModal(); };
$("kasForm").addEventListener("submit",async e=>{e.preventDefault(); if(!(await requireAdmin()))return;
 const data={tanggal:$("kasTanggal").value,keterangan:$("kasKeterangan").value.trim(),jenis:$("kasJenis").value,nominal:+$("kasNominal").value,updatedAt:new Date().toISOString()};
 const id=$("kasId").value; if(id) await updateDoc(doc(db,"kas",id),data); else await addDoc(collection(db,"kas"),data); $("kasDialog").close();
});
window.editKas=async id=>{ if(!(await requireAdmin()))return;const k=kasCache.find(x=>x.id===id); if(!k)return; $("kasId").value=id;$("kasTanggal").value=k.tanggal;$("kasKeterangan").value=k.keterangan;$("kasJenis").value=k.jenis;$("kasNominal").value=k.nominal;$("kasDialogTitle").textContent="Ubah Transaksi";$("kasDialog").showModal();};
window.hapusKas=async id=>{if(!(await requireAdmin()))return; if(confirm("Hapus transaksi ini?"))await deleteDoc(doc(db,"kas",id));};
