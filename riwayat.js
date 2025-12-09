import { db } from './firebase.js';
import { ref, get } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";

const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const orderListContainer = document.getElementById('orderListContainer');
const orderList = document.getElementById('orderList');
const noOrdersMessage = document.getElementById('noOrdersMessage');

searchBtn.addEventListener('click', searchOrders);

async function searchOrders() {
    const searchTerm = searchInput.value.trim().toLowerCase();

    if (!searchTerm) {
        alert('Harap masukkan ID Pesanan!');
        return;
    }

    const ordersRef = ref(db, 'pesanan');

    try {
        const snapshot = await get(ordersRef);
        if (snapshot.exists()) {
            const orders = snapshot.val();
            // Hanya filter berdasarkan ID Pesanan
            const filteredOrders = Object.keys(orders).filter(orderId => orderId.toLowerCase().includes(searchTerm));

            displayOrders(filteredOrders, orders);
        } else {
            showNoOrders();
        }
    } catch (error) {
        console.error('Error fetching data: ', error);
    }
}

function displayOrders(filteredOrders, orders) {
    orderList.innerHTML = '';

    if (filteredOrders.length > 0) {
        noOrdersMessage.style.display = 'none';
        orderListContainer.style.display = 'block';

        filteredOrders.forEach(orderId => {
            const order = orders[orderId];

            // Baris utama tabel
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${orderId}</td>
                <td>${order.nomorMeja}</td>
                <td>${order.namaPemesan}</td>
                <td>Rp ${order.total.toLocaleString()}</td>
                <td>${order.status}</td>
                <td>${order.pembayaran}</td>
            `;
            orderList.appendChild(tr);

            // Detail rincian
            const detailTr = document.createElement('tr');
            detailTr.id = `detail-${orderId}`;
            const detailTd = document.createElement('td');
            detailTd.colSpan = 6;
            detailTd.className = 'order-detail';

            let detailHTML = '<div class="rincian-vertikal">';
            if (order.pesanan) {
                order.pesanan.forEach((item, idx) => {
                    const subtotal = item.harga * item.qty;
                    detailHTML += `<p><strong>${idx + 1}. ${item.item}</strong> | Qty: ${item.qty} | Subtotal: Rp ${subtotal.toLocaleString()}</p>`;
                });
            }

            detailHTML += `<p><strong>Total Bayar:</strong> Rp ${order.total.toLocaleString()}</p>`;
            detailHTML += `<p><strong>Status:</strong> ${order.status}</p>`;
            detailHTML += `<p><strong>Nomor Meja:</strong> ${order.nomorMeja}</p>`;
            detailHTML += `<p><strong>Metode Pembayaran:</strong> ${order.pembayaran}</p>`;

            if (order.pembayaran === 'QRIS') {
                detailHTML += `<canvas id="qris-${orderId}"></canvas>`;
            }

            detailHTML += '</div>';
            detailTd.innerHTML = detailHTML;
            detailTr.appendChild(detailTd);
            orderList.appendChild(detailTr);

            if (order.pembayaran === 'QRIS') {
                const canvas = document.getElementById(`qris-${orderId}`);
                if (canvas) {
                    QRCode.toCanvas(
                        canvas,
                        `Kode Pesanan: ${orderId}\nTotal: Rp ${order.total.toLocaleString()}`,
                        err => { if (err) console.error(err); }
                    );
                }
            }
        });
    } else {
        showNoOrders();
    }
}

function showNoOrders() {
    noOrdersMessage.textContent = 'Tidak ada pesanan yang ditemukan.';
    noOrdersMessage.style.display = 'block';
    orderListContainer.style.display = 'none';
}

document.getElementById('home').onclick = () => {
    window.location.href = 'index.html';
};
