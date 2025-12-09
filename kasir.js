import { ref, onValue, remove, update, set } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";
import { db } from "./firebase.js";

const ordersTable = document.getElementById("orders");

// Render data pesanan ke tabel
function renderOrders(data) {
  ordersTable.innerHTML = "";

  if (!data) return;

  Object.entries(data).forEach(([key, order]) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${order.nomor_meja}</td>
      <td>${order.nama_pemesan}</td>
      <td>${order.metode_bayar}</td>
      <td>${order.rincian}</td>
      <td>${order.nominal}</td>
      <td>${order.status || ''}</td>
      <td>
        <button class="btn-approve" onclick="approveOrder('${key}')">Setujui</button>
        <button class="btn-edit" onclick="editOrder('${key}')">Edit</button>
        <button class="btn-cancel" onclick="cancelOrder('${key}')">Cancel</button>
      </td>
    `;

    ordersTable.appendChild(tr);
  });
}

// Listen data realtime pesanan
const pesananRef = ref(db, "pesanan");
onValue(pesananRef, (snapshot) => {
  const data = snapshot.val();
  renderOrders(data);
});

// Fungsi setujui pesanan
window.approveOrder = async function(key) {
  const orderRef = ref(db, `pesanan/${key}`);
  const approvedRef = ref(db, `pesanan_disetujui/${key}`);

  // Ambil data pesanan
  const snapshot = await new Promise((resolve) => {
    onValue(orderRef, (snap) => resolve(snap), { onlyOnce: true });
  });

  const order = snapshot.val();
  if (!order) return alert("Pesanan tidak ditemukan");

  // Simpan ke pesanan_disetujui dengan data ringkas
  await set(approvedRef, {
    nomor_meja: order.nomor_meja,
    metode_bayar: order.metode_bayar,
    nominal: order.nominal
  });

  // Hapus pesanan asli
  await remove(orderRef);

  alert("Pesanan disetujui!");
};

// Fungsi cancel pesanan
window.cancelOrder = async function(key) {
  const orderRef = ref(db, `pesanan/${key}`);
  await remove(orderRef);
  alert("Pesanan dibatalkan!");
};

// Fungsi edit pesanan
window.editOrder = async function(key) {
  const orderRef = ref(db, `pesanan/${key}`);

  const snapshot = await new Promise((resolve) => {
    onValue(orderRef, (snap) => resolve(snap), { onlyOnce: true });
  });

  const order = snapshot.val();
  if (!order) return alert("Pesanan tidak ditemukan");

  const newMetode = prompt("Metode pembayaran baru:", order.metode_bayar);
  const newNominal = prompt("Nominal baru:", order.nominal);

  if (!newMetode || !newNominal) return alert("Edit dibatalkan");

  await update(orderRef, {
    metode_bayar: newMetode,
    nominal: Number(newNominal)
  });

  alert("Pesanan berhasil diupdate!");
};
