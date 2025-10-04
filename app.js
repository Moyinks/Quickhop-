import { initializeApp } from "firebase/app";
import { 
    getAuth, 
    onAuthStateChanged, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut 
} from "firebase/auth";
import { 
    getDatabase, 
    ref, 
    onValue, 
    set, 
    push, 
    update, 
    remove 
} from "firebase/database";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";

// ===============================================
// 1. CONFIGURATION
// ===============================================

// REPLACE THESE WITH YOUR OWN FIREBASE 

  const firebaseConfig = {
    apiKey: "AIzaSyAw8di7eWu6TKFCJMuNwcIUh2RT1I0OPh0",
    authDomain: "quickshop-6a4ad.firebaseapp.com",
    projectId: "quickshop-6a4ad",
    storageBucket: "quickshop-6a4ad.firebasestorage.app",
    messagingSenderId: "983595260829",
    appId: "1:983595260829:web:0e772d1ed07b8f32eb2d74"
  };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const storage = getStorage(app);

// ===============================================
// 2. APPLICATION STATE
// ===============================================

const state = {
    userId: null,
    products: {}, // Stores all products { id: { data } }
    notes: {},    // Stores all notes
    currentView: 'home',
    isEditing: false,
    editProductId: null,
    lowStockThreshold: 5 // Products below this quantity are flagged
};

// ===============================================
// 3. DATA AND FIREBASE HANDLERS
// ===============================================

const DATA = {
    // Utility to get the user-specific path in the database
    getRef(path) {
        if (!state.userId) {
            console.error("User ID is not set. Cannot access database.");
            return null;
        }
        return ref(db, `users/${state.userId}/${path}`);
    },

    // Sets up all real-time listeners for the authenticated user
    setupListeners() {
        if (!state.userId) return;

        // Listener for Products (Inventory and Home panels)
        onValue(this.getRef('products'), (snapshot) => {
            state.products = snapshot.val() || {};
            console.log("Products updated:", state.products);
            UI_RENDER.renderProductLists();
            UI_RENDER.renderDashboard();
        });

        // Listener for Notes
        onValue(this.getRef('notes'), (snapshot) => {
            state.notes = snapshot.val() || {};
            console.log("Notes updated:", state.notes);
            UI_RENDER.renderNotes();
        });
    },
    
    // --- Product CRUD Operations ---
    async saveProduct(productData, file) {
        const productId = state.isEditing ? state.editProductId : push(this.getRef('products')).key;
        let imgUrl = productData.imageUrl || ''; // Use existing URL if editing and no new file

        try {
            if (file) {
                // 1. Upload the image file
                const imageRef = storageRef(storage, `images/${state.userId}/${productId}`);
                const snapshot = await uploadBytes(imageRef, file);
                imgUrl = await getDownloadURL(snapshot.ref);
            }

            // 2. Update the database record
            await set(this.getRef(`products/${productId}`), {
                ...productData,
                imageUrl: imgUrl,
                id: productId,
                lastUpdated: Date.now()
            });

            UI_RENDER.showToast(state.isEditing ? "Product updated!" : "New product added!", 'success');
            UI_RENDER.resetForm();

        } catch (error) {
            console.error("Error saving product:", error);
            UI_RENDER.showToast("Failed to save product.", 'danger');
        }
    },
    
    // Deletes a product
    deleteProduct(productId) {
        remove(this.getRef(`products/${productId}`))
            .then(() => UI_RENDER.showToast("Product deleted.", 'success'))
            .catch((error) => console.error("Error deleting product:", error));
    },

    // Updates product quantity after a sale or restock
    updateStock(productId, delta) {
        const product = state.products[productId];
        if (!product) return;

        const newQty = product.qty + delta;
        if (newQty < 0) {
            UI_RENDER.showToast("Cannot sell more than stock available.", 'danger');
            return;
        }

        // Update the quantity
        update(this.getRef(`products/${productId}`), { 
            qty: newQty,
            lastUpdated: Date.now()
        });

        // If it was a sale, record the sale
        if (delta < 0) {
            this.recordSale(product, Math.abs(delta));
        }
        
        UI_RENDER.showToast(`${Math.abs(delta)} units sold/restocked.`, 'success');
    },

    // Records a sale transaction
    recordSale(product, qty) {
        const saleData = {
            productId: product.id,
            productName: product.name,
            qty: qty,
            price: product.price,
            cost: product.cost,
            revenue: product.price * qty,
            profit: (product.price - product.cost) * qty,
            timestamp: Date.now()
        };

        push(this.getRef('sales'), saleData);
    },

    // --- Note CRUD Operations ---
    saveNote(title, content) {
        const newNoteRef = push(this.getRef('notes'));
        set(newNoteRef, {
            id: newNoteRef.key,
            title: title || "Untitled Note",
            content: content,
            timestamp: Date.now()
        }).then(() => {
            UI_RENDER.showToast("Note saved.", 'success');
            document.getElementById('noteTitle').value = '';
            document.getElementById('noteContent').value = '';
        }).catch((error) => {
            console.error("Error saving note:", error);
            UI_RENDER.showToast("Failed to save note.", 'danger');
        });
    },

    deleteNote(noteId) {
        remove(this.getRef(`notes/${noteId}`))
            .then(() => UI_RENDER.showToast("Note deleted.", 'success'))
            .catch((error) => console.error("Error deleting note:", error));
    },
    
    // --- Demo Data ---
    loadDemoData() {
        const demoProducts = {
            "demo1": { id: "demo1", name: "Premium Coffee Mug", price: 1500, cost: 700, qty: 12, category: "Beverages", imageUrl: "https://via.placeholder.com/60/007bff/ffffff?text=Mug", lastUpdated: Date.now() },
            "demo2": { id: "demo2", name: "T-Shirt (Medium)", price: 4500, cost: 2500, qty: 4, category: "Clothing", imageUrl: "https://via.placeholder.com/60/28a745/ffffff?text=Shirt", lastUpdated: Date.now() },
            "demo3": { id: "demo3", name: "Wireless Earbuds", price: 8000, cost: 4000, qty: 15, category: "Electronics", imageUrl: "https://via.placeholder.com/60/dc3545/ffffff?text=Buds", lastUpdated: Date.now() },
            "demo4": { id: "demo4", name: "LED Desk Lamp", price: 3200, cost: 1500, qty: 2, category: "Electronics", imageUrl: "https://via.placeholder.com/60/ffc107/333333?text=Lamp", lastUpdated: Date.now() },
        };
        
        set(this.getRef('products'), demoProducts)
            .then(() => UI_RENDER.showToast("Demo data loaded!", 'success'))
            .catch(error => console.error("Error loading demo data:", error));
    }
};

// ===============================================
// 4. UI RENDERING
// ===============================================

const UI_RENDER = {
    // Toggles visibility between login and main app screens
    renderApp(isLoggedIn) {
        document.querySelector('.app').style.display = isLoggedIn ? 'grid' : 'none';
        document.getElementById('loginScreen').style.display = isLoggedIn ? 'none' : 'flex';
        // Always reset to home panel on login
        if (isLoggedIn) {
            HANDLERS.handleNavClick({ target: document.querySelector('.nav-btn[data-view="home"]') });
        }
    },

    // Renders the main product list (Home Panel)
    renderProductLists() {
        const productArray = Object.values(state.products);
        
        // 1. Home Panel List (Quick Sell)
        const productListEl = document.getElementById('productList');
        productListEl.innerHTML = productArray.map(p => this.createProductCard(p, 'sell')).join('');
        
        // 2. Inventory Panel List
        const inventoryListEl = document.getElementById('inventoryList');
        inventoryListEl.innerHTML = productArray.map(p => this.createProductCard(p, 'inventory')).join('');
        
        // Check if lists are empty
        if (productArray.length === 0) {
            productListEl.innerHTML = '<p class="small" style="text-align: center;">No products found. Add a new one or load demo data.</p>';
            inventoryListEl.innerHTML = '<p class="small" style="text-align: center;">No products in inventory.</p>';
        }
    },

    // Creates the HTML for a single product card
    createProductCard(product, type) {
        const isLowStock = product.qty <= state.lowStockThreshold;
        const cardClass = isLowStock && type === 'inventory' ? 'low-stock' : '';

        if (type === 'sell') {
            // Card for Home/Quick Sell panel
            return `
                <div class="product-card card ${cardClass}" data-id="${product.id}">
                    <div class="p-thumb"><img src="${product.imageUrl}" alt="${product.name}" onerror="this.onerror=null;this.src='https://via.placeholder.com/60?text=P'"></div>
                    <div class="p-info">
                        <div class="p-name">${product.name}</div>
                        <div class="small">${product.category} | Stock: ${product.qty}</div>
                        <strong>NGN${product.price.toLocaleString()}</strong>
                    </div>
                    <div class="p-actions">
                        <button class="btn btn-sell" data-action="sell" data-id="${product.id}">Sell 1</button>
                    </div>
                </div>
            `;
        } else if (type === 'inventory') {
            // Card for Inventory panel
            const stockPercent = (product.qty / (product.qty + state.lowStockThreshold * 2)) * 100;
            const barColor = product.qty > 10 ? '#28a745' : isLowStock ? '#dc3545' : '#ffc107';

            return `
                <div class="inventory-card product-card card" data-id="${product.id}">
                    <div class="inventory-top">
                        <div class="p-thumb"><img src="${product.imageUrl}" alt="${product.name}" onerror="this.onerror=null;this.src='https://via.placeholder.com/60?text=P'"></div>
                        <div class="inventory-info">
                            <div class="p-name">${product.name}</div>
                            <div class="small">Cost: NGN${product.cost.toLocaleString()} | Price: NGN${product.price.toLocaleString()}</div>
                            <strong>Current Stock: ${product.qty}</strong>
                            <div class="bar"><div class="bar-inner" style="width: ${stockPercent}%; background-color: ${barColor};"></div></div>
                        </div>
                        <div class="inventory-actions">
                            <button class="btn btn-primary btn-small" data-action="edit" data-id="${product.id}">Edit</button>
                            <button class="btn btn-secondary btn-small" data-action="restock" data-id="${product.id}">Restock</button>
                            <button class="btn btn-danger btn-small" data-action="delete" data-id="${product.id}">Delete</button>
                        </div>
                    </div>
                </div>
            `;
        }
    },

    // Renders the Notes panel
    renderNotes() {
        const notesArray = Object.values(state.notes).sort((a, b) => b.timestamp - a.timestamp); // Newest first
        const notesListEl = document.getElementById('notesList');
        
        notesListEl.innerHTML = notesArray.map(n => `
            <div class="note-item card" data-id="${n.id}">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <h4 style="margin:0;">${n.title}</h4>
                    <button class="icon-btn" data-action="delete-note" data-id="${n.id}">🗑️</button>
                </div>
                <p class="small">${new Date(n.timestamp).toLocaleDateString()}</p>
                <p>${n.content}</p>
            </div>
        `).join('');

        if (notesArray.length === 0) {
            notesListEl.innerHTML = '<p class="small" style="text-align: center; margin-top: 20px;">No notes yet. Add one above.</p>';
        }
    },

    // Renders the dashboard statistics
    renderDashboard() {
        // Simple dashboard logic (can be expanded to pull from 'sales' in the future)
        const totalStockValue = Object.values(state.products).reduce((sum, p) => sum + (p.price * p.qty), 0);
        document.getElementById('dashRevenue').textContent = `~N${totalStockValue.toLocaleString()}`;
        document.getElementById('dashProfit').textContent = `~N${(totalStockValue / 2).toLocaleString()}`; // Placeholder profit
        document.getElementById('dashTop').textContent = Object.values(state.products).length > 0 ? Object.values(state.products).find(p => p.qty === Math.max(...Object.values(state.products).map(p => p.qty)))?.name || "N/A" : "N/A";

        // AI Insight Placeholder
        const insight = Object.values(state.products).some(p => p.qty <= state.lowStockThreshold) 
            ? `<p class="ai-suggestion">Action Alert: Some items are low in stock (e.g., ${Object.values(state.products).find(p => p.qty <= state.lowStockThreshold)?.name}). Time to restock!</p>`
            : '<p>Inventory looks healthy! Focus on marketing your top sellers.</p>';
        document.getElementById('aiContent').innerHTML = insight;
    },

    // Handles form visibility and state
    toggleAddForm(show) {
        const form = document.getElementById('addForm');
        form.style.display = show ? 'block' : 'none';
        
        // When hiding, ensure we clear and reset the state
        if (!show) {
            this.resetForm();
        }
    },

    // Clears the form and resets edit state
    resetForm() {
        document.getElementById('addForm').reset();
        document.getElementById('addProductBtn').textContent = "Save Product";
        document.getElementById('invImgPreview').style.display = 'none';
        state.isEditing = false;
        state.editProductId = null;
    },

    // --- Modal Handlers ---
    showModal(productId, title, stock) {
        const modal = document.getElementById('modalBackdrop');
        document.getElementById('modalTitle').textContent = title;
        document.getElementById('modalItem').textContent = `Current Stock: ${stock}`;
        document.getElementById('modalQty').value = 1;
        document.getElementById('modalConfirm').dataset.id = productId;
        modal.setAttribute('aria-hidden', 'false');
    },

    hideModal() {
        document.getElementById('modalBackdrop').setAttribute('aria-hidden', 'true');
        document.getElementById('modalConfirm').removeAttribute('data-id');
    },

    // --- Toast Handler ---
    showToast(message, type = 'info', duration = 3000) {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;

        container.appendChild(toast);

        // Show
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);

        // Hide and remove
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                container.removeChild(toast);
            }, 300);
        }, duration);
    }
};


// ===============================================
// 5. EVENT HANDLERS
// ===============================================

const HANDLERS = {
    // --- AUTHENTICATION HANDLERS ---
    async handleAuth(isSignup) {
        const emailEl = document.getElementById('loginEmail');
        const passEl = document.getElementById('loginPass');
        const feedbackEl = document.getElementById('authFeedback');
        const email = emailEl.value;
        const password = passEl.value;

        feedbackEl.textContent = "Processing...";

        if (!email || !password) {
            feedbackEl.textContent = "Please enter both email and password.";
            return;
        }

        try {
            if (isSignup) {
                await createUserWithEmailAndPassword(auth, email, password);
                feedbackEl.textContent = "Sign up successful. Logging in...";
            } else {
                await signInWithEmailAndPassword(auth, email, password);
                feedbackEl.textContent = "Login successful!";
            }
            // onAuthStateChanged will handle the UI update
        } catch (error) {
            console.error("Auth Error:", error);
            feedbackEl.textContent = `Error: ${error.code.replace('auth/', '').replace(/-/g, ' ')}`;
        }
    },

    handleLogout() {
        signOut(auth)
            .then(() => {
                // UI_RENDER.renderApp(false) is handled by onAuthStateChanged
                UI_RENDER.showToast("Logged out successfully.", 'info');
                state.userId = null;
            })
            .catch(error => console.error("Logout Error:", error));
    },

    // --- NAVIGATION HANDLER ---
    handleNavClick(e) {
        const target = e.target.closest('.nav-btn');
        if (!target) return;

        const view = target.dataset.view;
        state.currentView = view;

        // 1. Update active view button
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
            btn.setAttribute('aria-selected', 'false');
        });
        target.classList.add('active');
        target.setAttribute('aria-selected', 'true');

        // 2. Update active content panel
        document.querySelectorAll('.panel').forEach(panel => {
            panel.classList.remove('active');
        });
        document.getElementById(`${view}Panel`).classList.add('active');

        // Close settings panel if open
        document.getElementById('settingsPanel').classList.remove('active');
    },

    // --- FORM HANDLERS ---
    handleProductFormSubmit(e) {
        e.preventDefault();

        const name = document.getElementById('invName').value;
        const price = parseFloat(document.getElementById('invPrice').value);
        const cost = parseFloat(document.getElementById('invCost').value);
        const qty = parseInt(document.getElementById('invQty').value);
        const category = document.getElementById('invCategory').value;
        const fileInput = document.getElementById('invImg');
        const file = fileInput.files[0];
        const currentImageUrl = document.getElementById('invImgPreviewImg').src;

        if (!name || isNaN(price) || isNaN(cost) || isNaN(qty)) {
            UI_RENDER.showToast("Please fill all fields with valid numbers.", 'danger');
            return;
        }

        const productData = { name, price, cost, qty, category, imageUrl: currentImageUrl };
        DATA.saveProduct(productData, file);
    },

    handleNoteFormSubmit(e) {
        e.preventDefault();
        const title = document.getElementById('noteTitle').value.trim();
        const content = document.getElementById('noteContent').value.trim();
        if (content) {
            DATA.saveNote(title, content);
        }
    },
    
    // --- MAIN LIST CLICK HANDLER (Delegation) ---
    handleListClick(e) {
        const btn = e.target.closest('button[data-action]');
        if (!btn) return;
        
        const action = btn.dataset.action;
        const productId = btn.dataset.id;
        const product = state.products[productId];

        switch (action) {
            case 'sell':
                // Show modal for selling
                UI_RENDER.showModal(productId, `Sell ${product.name}`, product.qty);
                break;
            case 'edit':
                // Load product data into the form
                HANDLERS.loadProductForEdit(product);
                break;
            case 'restock':
                // Direct restock (simple +1 for demo)
                DATA.updateStock(productId, 1);
                break;
            case 'delete':
                if (confirm(`Are you sure you want to delete ${product.name}?`)) {
                    DATA.deleteProduct(productId);
                }
                break;
            case 'delete-note':
                const noteId = btn.dataset.id;
                DATA.deleteNote(noteId);
                break;
        }
    },

    // Loads product data into the form for editing
    loadProductForEdit(product) {
        state.isEditing = true;
        state.editProductId = product.id;
        
        document.getElementById('invName').value = product.name;
        document.getElementById('invPrice').value = product.price;
        document.getElementById('invCost').value = product.cost;
        document.getElementById('invQty').value = product.qty;
        document.getElementById('invCategory').value = product.category;
        
        document.getElementById('addProductBtn').textContent = "Update Product";
        
        const previewEl = document.getElementById('invImgPreview');
        const previewImg = document.getElementById('invImgPreviewImg');
        
        if (product.imageUrl) {
            previewImg.src = product.imageUrl;
            previewEl.style.display = 'block';
        } else {
            previewEl.style.display = 'none';
        }

        UI_RENDER.toggleAddForm(true); // Show the form
        // Switch to inventory panel if not already there
        HANDLERS.handleNavClick({ target: document.querySelector('.nav-btn[data-view="inventory"]') });
    },
    
    // --- MODAL HANDLERS ---
    handleModalConfirm() {
        const productId = document.getElementById('modalConfirm').dataset.id;
        const qty = parseInt(document.getElementById('modalQty').value);

        if (productId && qty > 0) {
            // Sell: delta is negative
            DATA.updateStock(productId, -qty);
        }
        UI_RENDER.hideModal();
    },

    handleImagePreview(e) {
        const file = e.target.files[0];
        const previewEl = document.getElementById('invImgPreview');
        const previewImg = document.getElementById('invImgPreviewImg');
        
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                previewImg.src = e.target.result;
                previewEl.style.display = 'block';
            };
            reader.readAsDataURL(file);
        } else {
            previewEl.style.display = 'none';
            previewImg.src = '';
        }
    }
};


// ===============================================
// 6. INITIALIZATION
// ===============================================

function init() {
    // --- 6.1 AUTH STATE LISTENER (The main switch) ---
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // User is signed in
            state.userId = user.uid;
            UI_RENDER.renderApp(true);
            
            // CRUCIAL: Start listening to database changes after user is logged in
            DATA.setupListeners(); 
        } else {
            // User is signed out
            state.userId = null;
            UI_RENDER.renderApp(false);
            document.getElementById('authFeedback').textContent = ""; // Clear login error
        }
    });

    // --- 6.2 AUTH BUTTONS ---
    document.getElementById('btnLogin').addEventListener('click', () => HANDLERS.handleAuth(false));
    document.getElementById('btnSignup').addEventListener('click', () => HANDLERS.handleAuth(true));
    document.getElementById('btnLogout').addEventListener('click', HANDLERS.handleLogout);
    document.getElementById('btnLogout2').addEventListener('click', HANDLERS.handleLogout); // Logout button in settings

    // --- 6.3 NAVIGATION ---
    document.querySelector('.bottom-nav').addEventListener('click', HANDLERS.handleNavClick);
    document.getElementById('btnSettings').addEventListener('click', () => {
        HANDLERS.handleNavClick({ target: document.querySelector('.nav-btn[data-view="settings"]') });
    });

    // --- 6.4 PRODUCT FORM / INVENTORY LISTENERS ---
    document.getElementById('toggleAddFormBtn').addEventListener('click', () => {
        UI_RENDER.toggleAddForm(true);
    });
    document.getElementById('formCancelBtn').addEventListener('click', () => {
        UI_RENDER.toggleAddForm(false);
    });
    document.getElementById('addForm').addEventListener('submit', HANDLERS.handleProductFormSubmit);
    document.getElementById('invImg').addEventListener('change', HANDLERS.handleImagePreview);
    document.getElementById('btnLoadDemo').addEventListener('click', DATA.loadDemoData);
    
    // --- 6.5 DELEGATED LIST LISTENERS (Handle product actions) ---
    // Note: We listen to the container, and the handler figures out which button was clicked
    document.getElementById('productList').addEventListener('click', HANDLERS.handleListClick);
    document.getElementById('inventoryList').addEventListener('click', HANDLERS.handleListClick);
    document.getElementById('notesList').addEventListener('click', HANDLERS.handleListClick);

    // --- 6.6 NOTES LISTENERS ---
    document.getElementById('noteForm').addEventListener('submit', HANDLERS.handleNoteFormSubmit);
    document.getElementById('noteCancelBtn').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('noteForm').reset();
    });

    // --- 6.7 MODAL LISTENERS ---
    document.getElementById('modalConfirm').addEventListener('click', HANDLERS.handleModalConfirm);
    document.getElementById('modalCancel').addEventListener('click', UI_RENDER.hideModal);
}

// Start the application
init();
