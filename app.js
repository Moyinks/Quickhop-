// ========================================
// QuickShop - Modern JavaScript Application
// ========================================

// Firebase Setup
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyAw8di7eWu6TKFCJMuNwcIUh2RT1I0OPh0",
  authDomain: "quickshop-6a4ad.firebaseapp.com",
  projectId: "quickshop-6a4ad",
  storageBucket: "quickshop-6a4ad.firebasestorage.app",
  messagingSenderId: "983595260829",
  appId: "1:983595260829:web:0e772d1ed07b8f32eb2d74"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ========================================
// Application State & Constants
// ========================================

const KEY = 'quickshop_stable_v1';
let state = JSON.parse(localStorage.getItem(KEY) || 'null') || {
  products: [],
  sales: [],
  changes: [],
  notes: []
};

state.notes = state.notes || [];

const CATEGORIES = ['All', 'Drinks', 'Snacks', 'Groceries', 'Clothing', 'Others'];
const DAY = 24 * 60 * 60 * 1000;

let activeCategory = 'All';
let modalContext = null;
let aiVisible = false;
let invImageData = null;
let activeReportRange = 'daily';
let editingNoteId = null;
let searchTimer = null;

// ========================================
// Utility Functions
// ========================================

function uid() {
  return 'p' + Math.random().toString(36).slice(2, 9);
}

function n(v) {
  return Number(v || 0);
}

function fmt(v) {
  return '₦' + Number(v || 0).toLocaleString('en-NG');
}

function startOfDay(ts) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatShortDate(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
}

function formatDateTime(ts) {
  const d = new Date(ts);
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function toast(msg) {
  const t = document.createElement('div');
  t.textContent = msg;
  Object.assign(t.style, {
    position: 'fixed',
    right: '14px',
    bottom: '90px',
    zIndex: 600,
    background: 'white',
    padding: '12px 16px',
    borderRadius: '10px',
    boxShadow: '0 8px 24px rgba(2,6,23,0.12)',
    fontWeight: 700,
    animation: 'slideIn 0.3s ease'
  });
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2000);
}

// ========================================
// Data Management
// ========================================

function saveState() {
  const user = auth.currentUser;
  if (user) {
    const userDocRef = doc(db, "users", user.uid);
    setDoc(userDocRef, state, { merge: true })
      .catch(err => console.error("Error saving to Firestore:", err));
  }

  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Save to localStorage failed', e);
    alert('Failed to save — localStorage may be full.');
  }
}

async function loadUserData(uid) {
  const userDocRef = doc(db, "users", uid);
  const docSnap = await getDoc(userDocRef);

  if (docSnap.exists()) {
    state = docSnap.data();
    state.notes = state.notes || [];
  } else {
    await setDoc(userDocRef, state);
  }

  init();
}

// ========================================
// DOM References
// ========================================

const loginScreen = document.getElementById("loginScreen");
const appScreen = document.querySelector(".app");
const btnLogin = document.getElementById("btnLogin");
const btnSignup = document.getElementById("btnSignup");
const loginEmail = document.getElementById("loginEmail");
const loginPass = document.getElementById("loginPass");

const chipsEl = document.getElementById('chips');
const searchEl = document.getElementById('searchInput');
const productListEl = document.getElementById('productList');
const dashRevenueEl = document.getElementById('dashRevenue');
const dashProfitEl = document.getElementById('dashProfit');
const dashTopEl = document.getElementById('dashTop');

const modalBackdrop = document.getElementById('modalBackdrop');
const modalTitle = document.getElementById('modalTitle');
const modalItem = document.getElementById('modalItem');
const modalQty = document.getElementById('modalQty');
const modalConfirm = document.getElementById('modalConfirm');
const modalCancel = document.getElementById('modalCancel');

const aiCard = document.getElementById('aiCard');
const aiContentEl = document.getElementById('aiContent');
const refreshInsightsBtn = document.getElementById('refreshInsights');
const toggleInsightsBtn = document.getElementById('toggleInsightsBtn');

const panels = {
  home: document.getElementById('homePanel'),
  inventory: document.getElementById('inventoryPanel'),
  reports: document.getElementById('reportsPanel'),
  notes: document.getElementById('notesPanel'),
  settings: document.getElementById('settingsPanel')
};

const inventoryList = document.getElementById('inventoryList');
const addProductBtn = document.getElementById('addProductBtn');
const invName = document.getElementById('invName');
const invPrice = document.getElementById('invPrice');
const invCost = document.getElementById('invCost');
const invQty = document.getElementById('invQty');
const invImg = document.getElementById('invImg');
const invImgPreview = document.getElementById('invImgPreview');
const invImgPreviewImg = document.getElementById('invImgPreviewImg');
const invImgClear = document.getElementById('invImgClear');
const toggleAddFormBtn = document.getElementById('toggleAddFormBtn');
const addForm = document.getElementById('addForm');
const invCategory = document.getElementById('invCategory');

const btnLoadDemo = document.getElementById('btnLoadDemo');
const btnClearStore = document.getElementById('btnClearStore');
const customListArea = document.getElementById('customListArea');
const reportMini = document.getElementById('reportMini');
const reportSummaryEl = document.getElementById('reportSummary');
const reportBreakdownEl = document.getElementById('reportBreakdown');
const exportAllBtn = document.getElementById('exportReport');
const exportVisibleBtn = document.getElementById('exportCurrentReport');

const notesListEl = document.getElementById('notesList');
const noteTitleEl = document.getElementById('noteTitle');
const noteContentEl = document.getElementById('noteContent');
const noteSaveBtn = document.getElementById('noteSaveBtn');
const noteCancelBtn = document.getElementById('noteCancelBtn');

// ========================================
// Authentication
// ========================================

btnLogin.addEventListener("click", async () => {
  try {
    await signInWithEmailAndPassword(auth, loginEmail.value, loginPass.value);
  } catch (err) {
    alert("Login failed: " + err.message);
  }
});

btnSignup.addEventListener("click", async () => {
  try {
    await createUserWithEmailAndPassword(auth, loginEmail.value, loginPass.value);
    alert("Account created. You can now login.");
  } catch (err) {
    alert("Signup failed: " + err.message);
  }
});

onAuthStateChanged(auth, user => {
  if (user) {
    loginScreen.style.display = "none";
    appScreen.style.display = "block";
    loadUserData(user.uid);
  } else {
    loginScreen.style.display = "flex";
    appScreen.style.display = "none";
    init();
  }
});

// ========================================
// Category Chips
// ========================================

function renderChips() {
  chipsEl.innerHTML = '';
  CATEGORIES.forEach(c => {
    const el = document.createElement('button');
    el.className = 'chip' + (c === activeCategory ? ' active' : '');
    el.textContent = c;
    el.type = 'button';
    el.addEventListener('click', () => {
      activeCategory = c;
      renderChips();
      renderProducts();
    });
    chipsEl.appendChild(el);
  });
}

// ========================================
// Search Functionality
// ========================================

function scheduleRenderProducts() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(renderProducts, 120);
}

searchEl.addEventListener('input', scheduleRenderProducts);

// ========================================
// Product List Rendering (Home)
// ========================================

function renderProducts() {
  productListEl.innerHTML = '';
  const q = (searchEl.value || '').trim().toLowerCase();

  const items = state.products.filter(p => {
    if (activeCategory !== 'All' && (p.category || 'Others') !== activeCategory) return false;
    if (q && !((p.name || '').toLowerCase().includes(q))) return false;
    return true;
  });

  if (items.length === 0) {
    productListEl.innerHTML = `
      <div style="padding:14px;background:var(--card-bg);border-radius:12px;border:1px solid rgba(7,18,43,0.04)" class="small">
        No products — add from Inventory or load demo
      </div>`;
    return;
  }

  for (const p of items) {
    const card = document.createElement('div');
    card.className = 'product-card';

    const thumbHtml = p.image
      ? `<img src="${p.image}" alt="${escapeHtml(p.name)}">`
      : (p.icon
        ? `<div>${escapeHtml(p.icon)}</div>`
        : `<div>${escapeHtml((p.name || '').split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase())}</div>`);

    const qtyText = (typeof p.qty === 'number') ? `${p.qty} in stock` : '—';

    card.innerHTML = `
      <div class="p-thumb">${thumbHtml}</div>
      <div class="p-info">
        <div class="p-name">${escapeHtml(p.name)}</div>
        <div class="p-sub">${qtyText} • ${fmt(p.price)}</div>
      </div>
      <div class="p-actions">
        <div class="p-actions-row">
          <button data-action="sell" data-id="${p.id}" class="btn-sell" aria-label="Sell ${escapeHtml(p.name)}">Sell</button>
          <button data-action="undo" data-id="${p.id}" class="btn-undo" aria-label="Undo ${escapeHtml(p.name)}">Undo</button>
        </div>
      </div>`;

    productListEl.appendChild(card);
  }
}

productListEl.addEventListener('click', (ev) => {
  const sellBtn = ev.target.closest('[data-action="sell"]');
  if (sellBtn) {
    openModalFor('sell', sellBtn.dataset.id);
    return;
  }

  const undoBtn = ev.target.closest('[data-action="undo"]');
  if (undoBtn) {
    undoLastFor(undoBtn.dataset.id);
    return;
  }
});

// ========================================
// Modal Management
// ========================================

function showModal() {
  modalBackdrop.style.display = 'flex';
  modalBackdrop.setAttribute('aria-hidden', 'false');
  setTimeout(() => modalQty.focus(), 100);
}

function hideModal() {
  modalBackdrop.style.display = 'none';
  modalBackdrop.setAttribute('aria-hidden', 'true');
  modalContext = null;
}

function openModalFor(mode, productId) {
  const p = state.products.find(x => x.id === productId);
  if (!p) {
    alert('Product not found');
    return;
  }

  modalContext = { mode, productId };
  modalTitle.textContent = mode === 'sell' ? 'Sell items' : 'Add stock';
  modalItem.textContent = `${p.name} — ${typeof p.qty === 'number' ? p.qty + ' in stock' : 'stock unknown'}`;
  modalQty.value = 1;
  showModal();
}

modalCancel.addEventListener('click', () => hideModal());
modalBackdrop.addEventListener('click', (e) => {
  if (e.target === modalBackdrop) hideModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') hideModal();
});

modalConfirm.addEventListener('click', () => {
  if (!modalContext) {
    hideModal();
    return;
  }

  const q = Math.max(1, Math.floor(n(modalQty.value)));

  if (modalContext.mode === 'sell') {
    doSell(modalContext.productId, q);
  } else {
    doAddStock(modalContext.productId, q);
  }

  hideModal();
});

// ========================================
// Product Actions
// ========================================

function doAddStock(productId, qty) {
  const p = state.products.find(x => x.id === productId);
  if (!p) return;

  p.qty = (typeof p.qty === 'number' ? p.qty : 0) + qty;
  state.changes.push({ type: 'add', productId, qty, ts: Date.now() });

  saveState();
  renderInventory();
  renderProducts();
  renderDashboard();
  toast(`Added ${qty} to ${p.name}`);
}

function doSell(productId, qty) {
  const p = state.products.find(x => x.id === productId);
  if (!p) return;

  if (typeof p.qty !== 'number') p.qty = 0;

  if (p.qty < qty) {
    if (!confirm(`${p.name} has only ${p.qty} in stock. Sell anyway?`)) return;
  }

  p.qty = Math.max(0, p.qty - qty);

  const sale = {
    productId,
    qty,
    price: n(p.price),
    cost: n(p.cost),
    ts: Date.now()
  };

  state.sales.push(sale);
  state.changes.push({ type: 'sell', productId, qty, ts: sale.ts });

  saveState();
  renderInventory();
  renderProducts();
  renderDashboard();
  toast(`Sold ${qty} × ${p.name}`);
}

function undoLastFor(productId) {
  for (let i = state.changes.length - 1; i >= 0; i--) {
    const ch = state.changes[i];
    if (ch.productId !== productId) continue;

    if (ch.type === 'add') {
      const p = state.products.find(x => x.id === productId);
      if (p) p.qty = (typeof p.qty === 'number' ? Math.max(0, p.qty - ch.qty) : 0);
      state.changes.splice(i, 1);
      saveState();
      renderInventory();
      renderProducts();
      renderDashboard();
      toast(`Reverted add of ${ch.qty}`);
      return;
    }

    if (ch.type === 'sell') {
      for (let j = state.sales.length - 1; j >= 0; j--) {
        const s = state.sales[j];
        if (s.productId === productId && s.qty === ch.qty && Math.abs(s.ts - ch.ts) < 120000) {
          state.sales.splice(j, 1);
          const p = state.products.find(x => x.id === productId);
          if (p) p.qty = (typeof p.qty === 'number' ? p.qty + ch.qty : ch.qty);
          state.changes.splice(i, 1);
          saveState();
          renderInventory();
          renderProducts();
          renderDashboard();
          toast(`Reverted sale of ${ch.qty}`);
          return;
        }
      }

      const p = state.products.find(x => x.id === productId);
      if (p) p.qty = (typeof p.qty === 'number' ? p.qty + ch.qty : ch.qty);
      state.changes.splice(i, 1);
      saveState();
      renderInventory();
      renderProducts();
      renderDashboard();
      toast('Reverted sale record');
      return;
    }
  }

  alert('No recent changes to undo for this product');
}

// ========================================
// Inventory Management
// ========================================

toggleAddFormBtn.addEventListener('click', () => {
  const show = addForm.style.display === 'none' || addForm.style.display === '';
  addForm.style.display = show ? 'flex' : 'none';
  if (show) setTimeout(() => invName.focus(), 80);
});

function clearInvImage() {
  invImageData = null;
  invImg.value = '';
  invImgPreview.style.display = 'none';
  invImgPreviewImg.src = '';
}

invImg.addEventListener('change', (e) => {
  const file = invImg.files && invImg.files[0];
  if (!file) {
    clearInvImage();
    return;
  }

  if (file.size > 1024 * 1024) {
    if (!confirm('Selected image is large (~>1MB) and may fill localStorage. Continue?')) {
      invImg.value = '';
      return;
    }
  }

  const reader = new FileReader();
  reader.onload = (ev) => {
    invImageData = ev.target.result;
    invImgPreviewImg.src = invImageData;
    invImgPreview.style.display = 'flex';
  };
  reader.onerror = () => {
    alert('Failed to read image');
    clearInvImage();
  };
  reader.readAsDataURL(file);
});

invImgClear.addEventListener('click', (e) => {
  e.preventDefault();
  clearInvImage();
});

addProductBtn.addEventListener('click', () => {
  const name = (invName.value || '').trim();
  const price = n(invPrice.value);
  const cost = n(invCost.value);
  const qty = n(invQty.value);
  const category = (invCategory.value || 'Others');

  if (!name) {
    alert('Provide product name');
    invName.focus();
    return;
  }
  if (price <= 0) {
    alert('Provide a selling price (> 0)');
    invPrice.focus();
    return;
  }
  if (cost < 0) {
    alert('Cost cannot be negative');
    invCost.focus();
    return;
  }
  if (qty < 0) {
    alert('Stock cannot be negative');
    invQty.focus();
    return;
  }

  const p = {
    id: uid(),
    name,
    price,
    cost,
    qty: qty || 0,
    category,
    image: invImageData || null,
    icon: null
  };

  state.products.push(p);
  saveState();

  invName.value = '';
  invPrice.value = '';
  invCost.value = '';
  invQty.value = '';
  invCategory.value = 'Others';
  clearInvImage();
  addForm.style.display = 'none';

  renderInventory();
  renderProducts();
  renderDashboard();
  renderCustomList();
  toast('Product saved');
});

function renderInventory() {
  inventoryList.innerHTML = '';

  if (state.products.length === 0) {
    inventoryList.innerHTML = `
      <div style="padding:12px;background:var(--card-bg);border-radius:12px;border:1px solid rgba(7,18,43,0.04)" class="small">
        No products in inventory
      </div>`;
    return;
  }

  for (const p of state.products) {
    const el = document.createElement('div');
    el.className = 'inventory-card';

    const thumb = p.image
      ? `<img src="${p.image}" alt="${escapeHtml(p.name)}">`
      : (p.icon
        ? `<div>${escapeHtml(p.icon)}</div>`
        : `<div>${escapeHtml((p.name || '').split(' ').map(x => x[0]).slice(0, 2).join('').toUpperCase())}</div>`);

    el.innerHTML = `
      <div class="inventory-top">
        <div class="p-thumb">${thumb}</div>
        <div class="inventory-info">
          <div class="inventory-name">${escapeHtml(p.name)}</div>
          <div class="inventory-meta">${p.qty || 0} in stock • ${fmt(p.price)}</div>
        </div>
      </div>
      <div class="inventory-actions">
        <button data-restock="${p.id}" class="btn-restock" aria-label="Restock ${escapeHtml(p.name)}">Restock</button>
        <button data-edit="${p.id}" class="btn-edit" aria-label="Edit ${escapeHtml(p.name)}">Edit</button>
        <button data-delete="${p.id}" class="btn-delete" aria-label="Delete ${escapeHtml(p.name)}">Delete</button>
      </div>`;

    inventoryList.appendChild(el);
  }
}

inventoryList.addEventListener('click', (ev) => {
  const restock = ev.target.closest('[data-restock]');
  if (restock) {
    openModalFor('add', restock.dataset.restock);
    return;
  }

  const edit = ev.target.closest('[data-edit]');
  if (edit) {
    openEditProduct(edit.dataset.edit);
    return;
  }

  const del = ev.target.closest('[data-delete]');
  if (del) {
    removeProduct(del.dataset.delete);
    return;
  }
});

function openEditProduct(id) {
  const p = state.products.find(x => x.id === id);
  if (!p) return;

  const newName = prompt('Name', p.name);
  if (newName === null) return;

  const newPrice = prompt('Selling price (₦)', String(p.price));
  if (newPrice === null) return;

  const newCost = prompt('Cost price (₦)', String(p.cost));
  if (newCost === null) return;

  const newQty = prompt('Stock quantity', String(p.qty || 0));
  if (newQty === null) return;

  p.name = (newName || p.name).trim();
  p.price = Math.max(0, n(newPrice));
  p.cost = Math.max(0, n(newCost));
  p.qty = Math.max(0, n(newQty));

  saveState();
  renderInventory();
  renderProducts();
  renderDashboard();
  renderCustomList();
  toast('Product updated');
}

function removeProduct(id) {
  const p = state.products.find(x => x.id === id);
  if (!p) return;

  if (!confirm(`Delete "${p.name}" and remove associated history?`)) return;

  state.products = state.products.filter(x => x.id !== id);
  state.sales = state.sales.filter(s => s.productId !== id);
  state.changes = state.changes.filter(c => c.productId !== id);

  saveState();
  renderInventory();
  renderProducts();
  renderDashboard();
  renderCustomList();
  toast('Product deleted');
}

// ========================================
// Dashboard
// ========================================

function renderDashboard() {
  const since = startOfDay(Date.now());
  const salesToday = state.sales.filter(s => s.ts >= since);

  const revenue = salesToday.reduce((a, s) => a + s.price * s.qty, 0);
  const cost = salesToday.reduce((a, s) => a + s.cost * s.qty, 0);
  const profit = revenue - cost;

  dashRevenueEl.textContent = fmt(revenue);
  dashProfitEl.textContent = fmt(profit);

  const byProd = {};
  state.sales.forEach(s => byProd[s.productId] = (byProd[s.productId] || 0) + s.qty);
  const arr = Object.entries(byProd).sort((a, b) => b[1] - a[1]);

  dashTopEl.textContent = arr.length
    ? (state.products.find(p => p.id === arr[0][0])?.name || '—')
    : '—';

  if (aiVisible) renderInsights();
}

// ========================================
// AI Insights
// ========================================

function salesInRange(startTs, endTs) {
  return state.sales.filter(s => s.ts >= startTs && s.ts < endTs);
}

function avgDailySales(productId, periodDays = 14) {
  const now = Date.now();
  const start = now - periodDays * DAY;
  const sales = salesInRange(start, now).filter(s => s.productId === productId);
  const totalQty = sales.reduce((a, s) => a + s.qty, 0);
  return totalQty / periodDays;
}

function generateInsights() {
  const now = Date.now();
  const todayStart = startOfDay(now);
  const weekStart = todayStart - 6 * DAY;
  const prevWeekStart = weekStart - 7 * DAY;
  const prevWeekEnd = weekStart;

  const revThisWeek = salesInRange(weekStart, now).reduce((a, s) => a + s.price * s.qty, 0);
  const revPrevWeek = salesInRange(prevWeekStart, prevWeekEnd).reduce((a, s) => a + s.price * s.qty, 0);
  const revChangePct = revPrevWeek === 0
    ? (revThisWeek === 0 ? 0 : 100)
    : ((revThisWeek - revPrevWeek) / revPrevWeek) * 100;

  const byProd = {};
  salesInRange(weekStart, now).forEach(s => byProd[s.productId] = (byProd[s.productId] || 0) + s.qty);

  const movers = Object.entries(byProd)
    .map(([pid, qty]) => {
      const p = state.products.find(x => x.id === pid);
      return { pid, name: p ? p.name : pid, qty };
    })
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  const lowMargin = state.products
    .map(p => {
      const margin = (n(p.price) - n(p.cost));
      const marginPct = n(p.price) ? (margin / n(p.price)) * 100 : 0;
      return { id: p.id, name: p.name, margin, marginPct, price: n(p.price) };
    })
    .filter(x => x.marginPct < 20)
    .sort((a, b) => a.marginPct - b.marginPct)
    .slice(0, 5);

  const stockWarnings = [];
  for (const p of state.products) {
    const avgDaily = avgDailySales(p.id, 14);
    const daysLeft = (avgDaily > 0)
      ? ((typeof p.qty === 'number' ? p.qty : 0) / avgDaily)
      : Infinity;
    const targetDays = 14;
    const recommendedOrder = Math.max(
      0,
      Math.ceil(avgDaily * targetDays) - (typeof p.qty === 'number' ? p.qty : 0)
    );

    stockWarnings.push({
      id: p.id,
      name: p.name,
      qty: p.qty || 0,
      avgDaily: Number(avgDaily.toFixed(2)),
      daysLeft: isFinite(daysLeft) ? Number(daysLeft.toFixed(1)) : Infinity,
      recommendedOrder
    });
  }

  const suggestions = [];
  if (revChangePct > 10) {
    suggestions.push(`Good news — revenue is up ${revChangePct.toFixed(0)}% versus last week.`);
  } else if (revChangePct < -10) {
    suggestions.push(`Warning — revenue dropped ${Math.abs(revChangePct).toFixed(0)}% versus last week.`);
  } else {
    suggestions.push(`Revenue roughly stable vs last week (${revChangePct.toFixed(0)}%).`);
  }

  if (movers.length) {
    const top = movers[0];
    const otherNames = movers.slice(1, 3).map(m => m.name);
    suggestions.push(`Top seller this week: ${top.name} (${top.qty} sold). Also moving: ${otherNames.join(', ') || '—'}.`);
  } else {
    suggestions.push('No sales recorded in the last 7 days.');
  }

  if (lowMargin.length) {
    suggestions.push(`Low margins: ${lowMargin.slice(0, 3).map(x => `${x.name} (${Math.round(x.marginPct)}%)`).join(', ')} — consider raising price or promoting higher-margin items.`);
  }

  const urgent = stockWarnings.filter(s => isFinite(s.daysLeft) && s.daysLeft <= 3).sort((a, b) => a.daysLeft - b.daysLeft);
  if (urgent.length) {
    suggestions.push(`Running low: ${urgent.slice(0, 3).map(u => `${u.name} (${u.qty} left — ${u.daysLeft} days)`).join(', ')}. Reorder recommended.`);
  } else {
    suggestions.push('No immediate stock shortages detected (based on recent sales rate).');
  }

  return { revThisWeek, revPrevWeek, revChangePct, movers, lowMargin, stockWarnings, suggestions };
}

function renderInsights() {
  const ins = generateInsights();
  let html = '';
  html += `<div style="display:flex;gap:10px;align-items:center;margin-bottom:8px"><div style="flex:1"><strong>Revenue (7d)</strong><div class="small">${fmt(ins.revThisWeek)}</div></div><div style="width:140px;text-align:right"><strong>Change</strong><div class="small">${ins.revChangePct >= 0 ? '+' : ''}${ins.revChangePct.toFixed(0)}%</div></div></div>`;
  html += `<div style="display:flex;flex-direction:column;gap:6px;margin-bottom:10px">`;
  ins.suggestions.forEach(s => html += `<div class="ai-suggestion">${escapeHtml(s)}</div>`);
  html += `</div>`;

  if (ins.movers.length) {
    html += `<div style="margin-bottom:8px"><strong>Top movers (7d)</strong>`;
    html += `<div style="display:flex;gap:8px;margin-top:6px">`;
    ins.movers.slice(0, 4).forEach(m => {
      html += `<div style="flex:1;background:#fff;padding:8px;border-radius:10px;border:1px solid rgba(7,18,43,0.04)"><div style="font-weight:800">${escapeHtml(m.name)}</div><div class="small">${m.qty} sold</div></div>`;
    });
    html += `</div></div>`;
  }

  html += `<div><strong>Stock forecast</strong><div class="small" style="margin-top:6px">Days left (based on last 14d avg) — reorder suggestion for 14 days</div>`;
  html += `<div style="margin-top:8px;display:flex;flex-direction:column;gap:8px">`;
  const sorted = ins.stockWarnings.slice().sort((a, b) => (a.daysLeft === Infinity ? 9999 : a.daysLeft) - (b.daysLeft === Infinity ? 9999 : b.daysLeft));
  sorted.slice(0, 6).forEach(s => {
    const safeDays = (s.daysLeft === Infinity) ? 9999 : Number(s.daysLeft);
    const pct = safeDays >= 30 ? 100 : Math.max(6, Math.min(100, Math.round((safeDays / 30) * 100)));
    const barColor = (safeDays <= 3) ? 'linear-gradient(90deg,#ef4444,#f97316)' : (safeDays <= 10 ? 'linear-gradient(90deg,#f59e0b,#f97316)' : 'linear-gradient(90deg,#06b6d4,#3b82f6)');
    html += `<div style="display:flex;gap:8px;align-items:center;justify-content:space-between">
      <div style="flex:1"><div style="font-weight:700">${escapeHtml(s.name)}</div><div class="small">${s.qty} in stock • avg/day ${s.avgDaily}</div>
        <div class="bar" style="margin-top:6px"><div class="bar-inner" style="width:${pct}%;background:${barColor}"></div></div>
      </div>
      <div style="width:86px;text-align:right"><div class="small">Days</div><div style="font-weight:900">${s.daysLeft === Infinity ? '—' : s.daysLeft}</div><div class="small" style="margin-top:6px;color:#0b1220">Reorder ${s.recommendedOrder}</div></div>
    </div>`;
  });
  html += `</div></div>`;
  aiContentEl.innerHTML = html;
}

toggleInsightsBtn?.addEventListener('click', () => {
  aiVisible = !aiVisible;
  aiCard.style.display = aiVisible ? 'block' : 'none';
  toggleInsightsBtn.textContent = aiVisible ? 'Hide Insights' : 'Show Insights';
  toggleInsightsBtn.setAttribute('aria-pressed', aiVisible ? 'true' : 'false');
  if (aiVisible) renderInsights();
});

refreshInsightsBtn?.addEventListener('click', () => {
  if (!aiVisible) {
    aiVisible = true;
    aiCard.style.display = 'block';
    toggleInsightsBtn.textContent = 'Hide Insights';
    toggleInsightsBtn.setAttribute('aria-pressed', 'true');
  }
  renderInsights();
  toast('Insights refreshed');
});

// ========================================
// Reports
// ========================================

function createBuckets(range) {
  const now = Date.now();
  const buckets = [];

  if (range === 'daily') {
    for (let i = 6; i >= 0; i--) {
      const start = startOfDay(now - i * DAY);
      const end = start + DAY;
      buckets.push({ start, end, label: formatShortDate(start) });
    }
  } else if (range === 'weekly') {
    const weekEnd = startOfDay(now) + DAY;
    const weeks = 4;
    for (let i = weeks - 1; i >= 0; i--) {
      const start = weekEnd - (i + 1) * 7 * DAY;
      const end = weekEnd - i * 7 * DAY;
      buckets.push({ start, end, label: `${formatShortDate(start)} - ${formatShortDate(end - 1)}` });
    }
  } else if (range === 'monthly') {
    const months = 6;
    const monthEnd = startOfDay(now) + DAY;
    for (let i = months - 1; i >= 0; i--) {
      const start = monthEnd - (i + 1) * 30 * DAY;
      const end = monthEnd - i * 30 * DAY;
      buckets.push({ start, end, label: `${formatShortDate(start)} - ${formatShortDate(end - 1)}` });
    }
  }

  return buckets;
}

function aggregateSalesInRange(start, end) {
  const sales = state.sales.filter(s => s.ts >= start && s.ts < end);
  const units = sales.reduce((a, s) => a + s.qty, 0);
  const revenue = sales.reduce((a, s) => a + s.qty * s.price, 0);
  const profit = sales.reduce((a, s) => a + s.qty * (s.price - s.cost), 0);
  return { units, revenue, profit };
}

function getTopProducts(days = 30, limit = 5) {
  const cutoff = Date.now() - (days * DAY);
  const map = {};
  state.sales.filter(s => s.ts >= cutoff).forEach(s => {
    const p = map[s.productId] || (map[s.productId] = { units: 0, revenue: 0, profit: 0 });
    p.units += s.qty;
    p.revenue += s.qty * s.price;
    p.profit += s.qty * (s.price - s.cost);
  });

  const arr = Object.entries(map).map(([id, vals]) => {
    const prod = state.products.find(x => x.id === id);
    return { id, name: prod ? prod.name : id, units: vals.units, revenue: vals.revenue, profit: vals.profit };
  });
  arr.sort((a, b) => b.revenue - a.revenue);
  return arr.slice(0, limit);
}

function renderReports(range = activeReportRange) {
  activeReportRange = range;
  document.querySelectorAll('.report-range-btn').forEach(b => b.classList.toggle('active', b.dataset.range === range));

  const buckets = createBuckets(range);
  const rangeStart = buckets[0].start;
  const rangeEnd = buckets[buckets.length - 1].end;
  const totalMetrics = aggregateSalesInRange(rangeStart, rangeEnd);

  reportMini.textContent = fmt(totalMetrics.revenue);

  reportSummaryEl.innerHTML = `
    <div class="report-summary-cards">
      <div class="report-card"><div class="small">Revenue (range)</div><div style="font-weight:800;margin-top:6px">${fmt(totalMetrics.revenue)}</div></div>
      <div class="report-card"><div class="small">Profit (range)</div><div style="font-weight:800;margin-top:6px">${fmt(totalMetrics.profit)}</div></div>
      <div class="report-card"><div class="small">Units (range)</div><div style="font-weight:800;margin-top:6px">${totalMetrics.units}</div></div>
    </div>
  `;

  let tbl = `<div style="background:var(--card-bg);padding:10px;border-radius:12px;border:1px solid rgba(7,18,43,0.04);margin-top:12px"><table style="width:100%;border-collapse:collapse"><thead><tr style="text-align:left"><th style="padding:8px">Period</th><th style="padding:8px">Units</th><th style="padding:8px">Revenue</th><th style="padding:8px">Profit</th></tr></thead><tbody>`;
  for (const b of buckets) {
    const m = aggregateSalesInRange(b.start, b.end);
    tbl += `<tr><td style="padding:8px;border-top:1px solid #f1f5f9">${escapeHtml(b.label)}</td><td style="padding:8px;border-top:1px solid #f1f5f9">${m.units}</td><td style="padding:8px;border-top:1px solid #f1f5f9">${fmt(m.revenue)}</td><td style="padding:8px;border-top:1px solid #f1f5f9">${fmt(m.profit)}</td></tr>`;
  }
  tbl += `</tbody></table></div>`;

  const topProducts = getTopProducts(30, 8);
  let topHtml = `<div style="margin-top:12px"><div style="font-weight:800;margin-bottom:8px">Top products (30d)</div>`;
  if (topProducts.length === 0) {
    topHtml += `<div class="small">No sales in last 30 days.</div>`;
  } else {
    topHtml += `<div style="background:var(--card-bg);padding:10px;border-radius:12px;border:1px solid rgba(7,18,43,0.04)"><table style="width:100%;border-collapse:collapse"><thead><tr style="text-align:left"><th style="padding:8px">Product</th><th style="padding:8px">Units</th><th style="padding:8px">Revenue</th><th style="padding:8px">Profit</th></tr></thead><tbody>`;
    topProducts.forEach(p => {
      topHtml += `<tr><td style="padding:8px;border-top:1px solid #f1f5f9">${escapeHtml(p.name)}</td><td style="padding:8px;border-top:1px solid #f1f5f9">${p.units}</td><td style="padding:8px;border-top:1px solid #f1f5f9">${fmt(p.revenue)}</td><td style="padding:8px;border-top:1px solid #f1f5f9">${fmt(p.profit)}</td></tr>`;
    });
    topHtml += `</tbody></table></div>`;
  }
  topHtml += `</div>`;

  reportBreakdownEl.innerHTML = tbl + topHtml;
}

document.querySelectorAll('.report-range-btn').forEach(b => b.addEventListener('click', () => renderReports(b.dataset.range)));

exportAllBtn?.addEventListener('click', () => {
  const rows = [['Timestamp', 'Product', 'Qty', 'UnitPrice', 'Total', 'Cost', 'Profit']];
  state.sales.forEach(s => {
    const p = state.products.find(x => x.id === s.productId);
    const name = p?.name || s.productId;
    const total = s.qty * s.price;
    const cost = s.qty * s.cost;
    const profit = total - cost;
    rows.push([new Date(s.ts).toISOString(), name, s.qty, s.price, total, cost, profit]);
  });
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sales_all.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

exportVisibleBtn?.addEventListener('click', () => {
  const buckets = createBuckets(activeReportRange);
  const rows = [['Period', 'Units', 'Revenue', 'Profit']];
  for (const b of buckets) {
    const m = aggregateSalesInRange(b.start, b.end);
    rows.push([b.label, m.units, m.revenue, m.profit]);
  }
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `report_${activeReportRange}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

// ========================================
// Notes Management
// ========================================

function renderNotes() {
  notesListEl.innerHTML = '';
  const notes = (state.notes || []).slice().sort((a, b) => b.ts - a.ts);

  if (notes.length === 0) {
    notesListEl.innerHTML = `<div class="small">No notes yet — add one above.</div>`;
    return;
  }

  for (const note of notes) {
    const item = document.createElement('div');
    item.className = 'note-item';
    const titleHtml = note.title ? `<div style="font-weight:800">${escapeHtml(note.title)}</div>` : '';
    item.innerHTML = `
      ${titleHtml}
      <div style="margin-top:6px;white-space:pre-wrap">${escapeHtml(note.content)}</div>
      <div class="note-meta">${formatDateTime(note.ts)}</div>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px">
        <button data-edit-note="${note.id}" class="btn-edit" type="button">Edit</button>
        <button data-delete-note="${note.id}" class="btn-delete" type="button">Delete</button>
      </div>
    `;
    notesListEl.appendChild(item);
  }

  notesListEl.querySelectorAll('[data-edit-note]').forEach(b => b.addEventListener('click', () => startEditNote(b.dataset.editNote)));
  notesListEl.querySelectorAll('[data-delete-note]').forEach(b => b.addEventListener('click', () => deleteNote(b.dataset.deleteNote)));
}

function startEditNote(id) {
  const note = state.notes.find(n => n.id === id);
  if (!note) return;

  editingNoteId = id;
  noteTitleEl.value = note.title || '';
  noteContentEl.value = note.content || '';
  noteSaveBtn.textContent = 'Update Note';
  noteTitleEl.focus();
  setActiveView('notes');
}

function deleteNote(id) {
  const note = state.notes.find(n => n.id === id);
  if (!note) return;

  if (!confirm('Delete this note?')) return;

  state.notes = state.notes.filter(n => n.id !== id);
  saveState();
  renderNotes();
  toast('Note deleted');
}

noteSaveBtn.addEventListener('click', () => {
  const title = (noteTitleEl.value || '').trim();
  const content = (noteContentEl.value || '').trim();

  if (!content) {
    alert('Please write something in the note');
    noteContentEl.focus();
    return;
  }

  if (editingNoteId) {
    const note = state.notes.find(n => n.id === editingNoteId);
    if (!note) {
      editingNoteId = null;
      return;
    }
    note.title = title;
    note.content = content;
    note.ts = Date.now();
    editingNoteId = null;
    noteSaveBtn.textContent = 'Save Note';
    toast('Note updated');
  } else {
    const note = { id: uid(), title, content, ts: Date.now() };
    state.notes.push(note);
    toast('Note saved');
  }

  noteTitleEl.value = '';
  noteContentEl.value = '';
  saveState();
  renderNotes();
});

noteCancelBtn.addEventListener('click', () => {
  editingNoteId = null;
  noteTitleEl.value = '';
  noteContentEl.value = '';
  noteSaveBtn.textContent = 'Save Note';
});

// ========================================
// Settings & Demo
// ========================================

btnLoadDemo?.addEventListener('click', () => {
  if (!confirm('Load demo products into store? This will be saved to your account if logged in.')) return;

  state.products.push({ id: uid(), name: 'Rice (5kg)', price: 2000, cost: 1500, qty: 34, category: 'Groceries', icon: '🍚' });
  state.products.push({ id: uid(), name: 'Bottled Water', price: 150, cost: 70, qty: 80, category: 'Drinks', icon: '💧' });
  state.products.push({ id: uid(), name: 'T-Shirt', price: 1200, cost: 600, qty: 50, category: 'Clothing', icon: '👕' });
  state.products.push({ id: uid(), name: 'Indomie', price: 200, cost: 60, qty: 120, category: 'Snacks', icon: '🍜' });

  saveState();
  renderInventory();
  renderProducts();
  renderDashboard();
  renderCustomList();
  toast('Demo loaded');
});

btnClearStore?.addEventListener('click', () => {
  if (!confirm('Clear all products and history? This action cannot be undone.')) return;

  state.products = [];
  state.sales = [];
  state.changes = [];
  state.notes = [];

  saveState();
  renderInventory();
  renderProducts();
  renderDashboard();
  renderCustomList();
  renderNotes();
  toast('Store cleared');
});

function renderCustomList() {
  customListArea.innerHTML = '';

  if (state.products.length === 0) {
    customListArea.innerHTML = `<div class="small">No products.</div>`;
    return;
  }

  for (const p of state.products) {
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.justifyContent = 'space-between';
    row.style.alignItems = 'center';
    row.style.padding = '8px 0';
    row.style.borderBottom = '1px dashed #eef2f3';

    row.innerHTML = `<div style="display:flex;gap:8px;align-items:center"><div style="width:36px;height:36px;border-radius:8px;overflow:hidden;flex-shrink:0">${p.image ? `<img src="${p.image}" style="width:36px;height:36px;object-fit:cover">` : (p.icon ? `<div style="font-size:18px;padding:6px">${escapeHtml(p.icon)}</div>` : `<div style="padding:6px;font-weight:800">${escapeHtml((p.name || '').slice(0, 2).toUpperCase())}</div>`)}</div><div><strong>${escapeHtml(p.name)}</strong><div class="small">${p.qty || 0} in stock • ${fmt(p.price)}</div></div></div>
      <div style="display:flex;gap:8px"><button data-edit="${p.id}" class="btn-edit">Edit</button><button data-del="${p.id}" class="btn-delete">Delete</button></div>`;

    customListArea.appendChild(row);
  }

  customListArea.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => openEditProduct(b.dataset.edit)));
  customListArea.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => removeProduct(b.dataset.del)));
}

// ========================================
// Navigation & View Management
// ========================================

function setActiveView(view) {
  document.querySelectorAll('.nav-btn').forEach(b => {
    const isActive = b.dataset.view === view;
    b.classList.toggle('active', isActive);
    b.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });

  Object.values(panels).forEach(p => p.classList.remove('active'));
  if (panels[view]) panels[view].classList.add('active');

  if (view === 'reports') renderReports(activeReportRange);
  if (view === 'settings') renderCustomList();
  if (view === 'home') renderDashboard();
  if (view === 'notes') renderNotes();
}

document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => setActiveView(btn.dataset.view));
  btn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setActiveView(btn.dataset.view);
    }
  });
});

document.getElementById('btnSettings')?.addEventListener('click', () => setActiveView('settings'));

// ========================================
// Initialization
// ========================================

function init() {
  renderChips();
  renderProducts();
  renderInventory();
  renderDashboard();
  renderCustomList();
  renderNotes();
  addForm.style.display = 'none';
  invImageData = null;
  toggleInsightsBtn.textContent = 'Show Insights';
  toggleInsightsBtn.setAttribute('aria-pressed', 'false');
  setActiveView('home');
}

// Expose for debugging
window._quickshop = { state, saveState, renderProducts, renderInventory, setActiveView, renderReports, renderNotes };