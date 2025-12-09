// fail.js
import { db } from './firebase.js';
import { ref, push, set } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";

const menuGrid = document.getElementById('menuGrid');
const rincianList = document.getElementById('rincianList');
const totalInput = document.getElementById('total');
const form = document.getElementById('orderForm');

const rincianModal = document.getElementById('rincianModal');
const paymentModal = document.getElementById('paymentModal');

const modalClose = document.querySelector('.close-modal');
const paymentClose = document.querySelector('.close-payment-modal');
const closePaymentBtn = document.getElementById('closePaymentBtn');
const confirmBtn = document.getElementById('confirmOrderBtn');

const payNomorMeja = document.getElementById('payNomorMeja');
const payTotal = document.getElementById('payTotal');
const payMetode = document.getElementById('payMetode');
const payInstruksi = document.getElementById('payInstruksi');
const payQRIS = document.getElementById('payQRIS');
const payStatus = document.getElementById('payStatus');

let menuOptions = [];
let orderData = {};

// Load menu dari file JSON
fetch('menu.json')
    .then(res => res.json())
    .then(data => {
        menuOptions = data;
        renderMenu();
    });

document.getElementById("searchMenu").addEventListener("input", renderMenu);

function renderMenu() {
    menuGrid.innerHTML = "";
    const keyword = document.getElementById("searchMenu").value.toLowerCase();
    menuOptions
        .filter(menu => menu.name.toLowerCase().includes(keyword))
        .forEach(menu => {
            const qty = orderData[menu.id] || 0;
            const div = document.createElement("div");
            div.className = "menu-item";
            div.innerHTML = `
                <img src="${menu.img}">
                <div class="nama">${menu.name}</div>
                <div class="harga">Rp ${menu.harga.toLocaleString()}</div>
                <div class="qty-control">
                    <button class="kurang">-</button>
                    <input type="number" class="qty-input" min="0" value="${qty}" data-id="${menu.id}">
                    <button class="tambah">+</button>
                </div>
            `;
            menuGrid.appendChild(div);

            div.querySelector(".tambah").onclick = () => tambahQty(menu.id);
            div.querySelector(".kurang").onclick = () => kurangQty(menu.id);
            div.querySelector(".qty-input").oninput = e => {
                let val = parseInt(e.target.value);
                if (isNaN(val) || val < 0) val = 0;
                if (val === 0) delete orderData[menu.id];
                else orderData[menu.id] = val;
                updateRincian();
            };
        });
}

function tambahQty(id) {
    orderData[id] = (orderData[id] || 0) + 1;
    updateRincian();
    updateQtyInput(id);
}

function kurangQty(id) {
    if (!orderData[id]) return;
    orderData[id]--;
    if (orderData[id] <= 0) delete orderData[id];
    updateRincian();
    updateQtyInput(id);
}

function updateQtyInput(id) {
    const input = document.querySelector(`.qty-input[data-id='${id}']`);
    if (input) input.value = orderData[id] || 0;
}

function updateRincian() {
    rincianList.innerHTML = "";
    let nomor = 1, total = 0;
    Object.keys(orderData).forEach(id => {
        const menu = menuOptions.find(m => m.id == id);
        const qty = orderData[id];
        const subtotal = menu.harga * qty;
        total += subtotal;
        const tr = document.createElement("tr");
        tr.innerHTML = `<td>${nomor++}</td><td>${menu.name}</td><td>${qty}</td><td>Rp ${subtotal.toLocaleString()}</td>`;
        rincianList.appendChild(tr);
    });
    totalInput.value = total.toLocaleString();
}

// Modal close handlers
modalClose.onclick = () => rincianModal.style.display = 'none';
paymentClose.onclick = () => paymentModal.style.display = 'none';
closePaymentBtn.onclick = () => paymentModal.style.display = 'none';

window.onclick = e => {
    if (e.target == rincianModal) rincianModal.style.display = 'none';
    if (e.target == paymentModal) paymentModal.style.display = 'none';
};

// Form submit (tampilkan modal konfirmasi)
form.addEventListener("submit", e => {
    e.preventDefault();
    if (Object.keys(orderData).length === 0) return alert("Pilih menu dulu!");

    const modalRincian = document.getElementById('modalRincian');
    const modalTotal = document.getElementById('modalTotal');
    modalRincian.innerHTML = "";
    let nomor = 1, total = 0;
    Object.keys(orderData).forEach(id => {
        const menu = menuOptions.find(m => m.id == id);
        const qty = orderData[id];
        const subtotal = menu.harga * qty;
        total += subtotal;
        const tr = document.createElement("tr");
        tr.innerHTML = `<td>${nomor++}</td><td>${menu.name}</td><td>${qty}</td><td>Rp ${subtotal.toLocaleString()}</td>`;
        modalRincian.appendChild(tr);
    });
    modalTotal.textContent = total.toLocaleString();

    rincianModal.style.display = 'block';
});

// Konfirmasi & simpan ke Firebase
confirmBtn.onclick = () => {
    const nomorMeja = form.nomorMeja.value;
    const namaPemesan = form.namaPemesan.value;
    const pembayaran = form.pembayaran.value;
    if (!nomorMeja || !namaPemesan || !pembayaran) {
        alert("Harap isi semua data pemesan dan metode pembayaran!");
        return;
    }

    const pesanan = Object.keys(orderData).map(id => {
        const menu = menuOptions.find(m => m.id == id);
        return { item: menu.name, harga: menu.harga, qty: orderData[id] };
    });
   const totalNumber = Object.keys(orderData).reduce((sum, id) => {
    const menu = menuOptions.find(m => m.id == id);
    return sum + (menu.harga * orderData[id]);
}, 0);

    const tanggal = new Date().toLocaleString('id-ID', { hour12: false });

    const newOrderRef = push(ref(db, 'pesanan'));

set(newOrderRef, {
    nomorMeja,
    namaPemesan,
    pembayaran,
    pesanan,
    total: totalNumber,
    tanggal,
    status: "Sedang dalam antrian"
})
.then(() => {
    // Simpan ID pesanan terakhir agar halaman riwayat bisa memanggilnya
    localStorage.setItem('lastOrderId', newOrderRef.key);

    // Modal konfirmasi & pembayaran...
// Peringatan tambahan untuk transfer / catat kode pesanan
if (pembayaran === 'Debit' || pembayaran === 'QRIS') {
    const proceed = confirm(
        `Pastikan tujuan transfer dan nominal sesuai!\n` +
        `Catat atau fotokan Kode Pesanan: ${newOrderRef.key}\n` +
        `atau Nomor Meja: ${nomorMeja} sebelum melanjutkan pembayaran.`
    );
    if (!proceed) {
        return; // Batalkan konfirmasi jika user klik "Batal"
    }
}

        // Jangan tutup modal konfirmasi, tapi ubah isinya jadi info pembayaran
        const modalContent = rincianModal.querySelector('.modal-content');
modalContent.innerHTML = `
    <div class="modal-header">
        <h3>Pembayaran & Status Pesanan</h3>
        <span class="close-modal">&times;</span>
    </div>
    <div class="modal-body" id="paymentContent">
        <p><strong>Nomor Meja:</strong> ${nomorMeja}</p>
        <p><strong>Kode Pesanan:</strong> ${newOrderRef.key}</p>
        <p><strong>Total Bayar:</strong> Rp ${totalNumber.toLocaleString()}</p>
        <p><strong>Metode Pembayaran:</strong> ${pembayaran}</p>
        <div id="payInstruksi"></div>
        <canvas id="payQRIS" style="display:none;"></canvas>
        <p><strong>Status:</strong> <span id="payStatus">Sedang dalam antrian</span></p>
    </div>
    <div class="modal-footer">
        <button id="closeModalBtn">Tutup</button>
        <button id="goToOrdersBtn">Lihat Pesanan Saya</button>
    </div>
`;


        // Setup close modal
        modalContent.querySelector('.close-modal').onclick = () => rincianModal.style.display = 'none';
        modalContent.querySelector('#closeModalBtn').onclick = () => rincianModal.style.display = 'none';

        // Setup tombol lanjut ke halaman pesanan (ubah sesuai URL)
        modalContent.querySelector('#goToOrdersBtn').onclick = () => {
            window.location.href = 'halaman-pesanan.html';  // Ganti URL sesuai halaman pesanan
        };

        // Update instruksi pembayaran dan QR
        const payInstruksiNew = modalContent.querySelector('#payInstruksi');
        const payQRISNew = modalContent.querySelector('#payQRIS');
        const payStatusNew = modalContent.querySelector('#payStatus');

        if (pembayaran === 'Cash') {
            payInstruksiNew.innerHTML = "<p>Silakan bayar ke kasir</p>";
        } else if (pembayaran === 'Debit') {
            payInstruksiNew.innerHTML = "<p>Transfer ke rekening: 123-456-789</p>";
        } else if (pembayaran === 'QRIS') {
            payQRISNew.style.display = 'block';
            QRCode.toCanvas(payQRISNew, `Total:${totalNumber}`, err => {
                if (err) console.error(err);
            });
        }
        payStatusNew.textContent = "Sedang dalam antrian";

        // Reset form & data
        form.reset();
        orderData = {};
        updateRincian();
        renderMenu();
    })
    .catch(error => {
        console.error("Gagal simpan data:", error);
        alert("Gagal menyimpan pesanan. Silakan coba lagi.");
    });
};
document.getElementById('lihatPesananBtn').onclick = () => {
    window.location.href = 'halaman-pesanan.html';
};

