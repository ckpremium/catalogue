const defaultProductData = [
    { sku: "TB-001", name: "แก้วเยติ 20 oz (กล่องสีนํ้าตาล ฟู๊ดเกรด)", material: "sus 201", capacity: "20 Oz", priceRetail: "290", priceWholesale: "85" },
    { sku: "TB-002", name: "แก้วเยติ 20 oz ( กล่องสีขาว )", material: "sus 304", capacity: "20 Oz", priceRetail: "290", priceWholesale: "85" }
];

// Load database from localStorage or fallback to default
let loadedDB = JSON.parse(localStorage.getItem('productDatabase'));
let productData = (loadedDB && loadedDB.length > 0) ? loadedDB : defaultProductData;

// App State
let displayedProducts = [...productData];
let currentEditingSku = null;

// DOM Elements
const container = document.getElementById('product-container');
const searchInput = document.getElementById('searchInput');
const totalItemsEl = document.getElementById('totalItems');
const gridBtn = document.getElementById('grid-view-btn');
const listBtn = document.getElementById('list-view-btn');

// Filter Elements
const capacityMultiselect = document.getElementById('capacityMultiselect');
const capacityOptions = document.getElementById('capacityOptions');
const retailMultiselect = document.getElementById('retailMultiselect');
const retailOptions = document.getElementById('retailOptions');
const wholesaleMultiselect = document.getElementById('wholesaleMultiselect');
const wholesaleOptions = document.getElementById('wholesaleOptions');

let selectedCapacities = [];
let selectedRetailRanges = [];
let selectedWholesaleRanges = [];


// Render Products
function renderProducts() {
    container.innerHTML = '';
    totalItemsEl.textContent = displayedProducts.length;

    displayedProducts.forEach(product => {
        const automaticImageUrl = `./extracted_images/${product.sku}.png`;
        const finalImageUrl = (product.imageUrl && product.imageUrl.startsWith('http')) ? product.imageUrl : automaticImageUrl;
        const sizeInfo = product.size || "-";

        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <div class="product-image-container">
                <img src="${finalImageUrl}" class="product-image" alt="${product.name}" 
                     onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                <div class="image-placeholder-icon" style="display: none;">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                        <polyline points="21 15 16 10 5 21"></polyline>
                    </svg>
                    <span>ไม่มีรูปภาพ</span>
                </div>
            </div>
            <div class="product-info">
                <div class="product-sku">${product.sku}</div>
                <h3 class="product-title">${product.name}</h3>
                
                <div class="product-meta">
                    <div class="meta-item">
                        <span class="meta-label">วัสดุ</span>
                        <span class="meta-value">${product.material}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">ความจุ</span>
                        <span class="meta-value">${product.capacity}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">ขนาด</span>
                        <span class="meta-value">${sizeInfo}</span>
                    </div>
                </div>

                <div class="product-prices">
                    <div class="price-box retail">
                        <span class="price-label">ปลีก (1 ใบ)</span>
                        <span class="price-value">฿${product.priceRetail}</span>
                    </div>
                    <div class="price-box wholesale">
                        <span class="price-label">ส่ง (100+)</span>
                        <span class="price-value wholesale">฿${product.priceWholesale}</span>
                    </div>
                </div>

                <div class="product-card-note">
                    * ราคาพร้อมเลเซอร์โลโก้ฟรี (ยังไม่รวมค่าจัดส่ง)
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

// Search and Filter Logic
const RETAIL_RANGES = [
    { label: "ต่ำกว่า 280 บาท", min: 0, max: 279.99 },
    { label: "280 - 300 บาท", min: 280, max: 300 },
    { label: "301 - 325 บาท", min: 301, max: 325 },
    { label: "326 - 350 บาท", min: 326, max: 350 },
    { label: "350 บาทขึ้นไป", min: 350.01, max: 999999 }
];

const WHOLESALE_RANGES = [
    { label: "ต่ำกว่า 70 บาท", min: 0, max: 69.99 },
    { label: "70 - 90 บาท", min: 70, max: 90 },
    { label: "91 - 110 บาท", min: 91, max: 110 },
    { label: "111 - 130 บาท", min: 111, max: 130 },
    { label: "130 บาทขึ้นไป", min: 130.01, max: 999999 }
];

function populateFilters() {
    // Capacity
    const capacities = [...new Set(productData.map(p => p.capacity))].filter(Boolean).sort();
    initMultiselect(capacityMultiselect, capacityOptions, capacities, selectedCapacities, "ความจุทั้งหมด", "ความจุ", (vals) => {
        selectedCapacities = vals;
        applyFilters();
    });

    // Retail
    initMultiselect(retailMultiselect, retailOptions, RETAIL_RANGES.map(r => r.label), selectedRetailRanges, "ราคาปลีกทั้งหมด", "ราคาปลีก", (vals) => {
        selectedRetailRanges = vals;
        applyFilters();
    });

    // Wholesale
    initMultiselect(wholesaleMultiselect, wholesaleOptions, WHOLESALE_RANGES.map(r => r.label), selectedWholesaleRanges, "ราคาส่งทั้งหมด (100 ใบ+)", "ราคาส่ง (100 ใบ+)", (vals) => {
        selectedWholesaleRanges = vals;
        applyFilters();
    });
}

function initMultiselect(container, optionsEl, values, selectedArray, defaultText, prefix, onChange) {
    const triggerSpan = container.querySelector('.multiselect-trigger span');

    // Update Trigger UI
    const updateUI = () => {
        if (selectedArray.length === 0) triggerSpan.textContent = defaultText;
        else triggerSpan.textContent = `${prefix} (${selectedArray.length})`;
    };
    updateUI();

    // Clear and Fill Options
    optionsEl.innerHTML = '';
    values.forEach(val => {
        const item = document.createElement('label');
        item.className = 'option-item';
        const isChecked = selectedArray.includes(val);
        item.innerHTML = `<input type="checkbox" value="${val}" ${isChecked ? 'checked' : ''}> ${val}`;

        item.querySelector('input').addEventListener('change', (e) => {
            if (e.target.checked) {
                if (!selectedArray.includes(val)) selectedArray.push(val);
            } else {
                const idx = selectedArray.indexOf(val);
                if (idx > -1) selectedArray.splice(idx, 1);
            }
            updateUI();
            onChange(selectedArray);
        });
        optionsEl.appendChild(item);
    });

    // Toggle Logic
    if (!container.dataset.init) {
        container.querySelector('.multiselect-trigger').addEventListener('click', (e) => {
            document.querySelectorAll('.custom-multiselect').forEach(c => {
                if (c !== container) c.classList.remove('open');
            });
            container.classList.toggle('open');
            e.stopPropagation();
        });
        container.dataset.init = "true";
    }
}

// Global click to close dropdowns
document.addEventListener('click', () => {
    document.querySelectorAll('.custom-multiselect').forEach(c => c.classList.remove('open'));
});

// Stop propagation on option clicks
[capacityOptions, retailOptions, wholesaleOptions].forEach(el => {
    el.addEventListener('click', (e) => e.stopPropagation());
});

function updateDropdown(el, values, defaultText) {
    if (!el) return;
    const currentVal = el.value;
    el.innerHTML = `<option value="">${defaultText}</option>`;
    values.forEach(v => {
        const opt = document.createElement('option');
        opt.value = v;
        opt.textContent = v;
        el.appendChild(opt);
    });
    el.value = values.includes(currentVal) ? currentVal : "";
}

function isInRange(price, rangeLabels, config) {
    if (rangeLabels.length === 0) return true;

    const cleanPrice = String(price).replace(/[^\d.]/g, '');
    const p = parseFloat(cleanPrice);
    if (isNaN(p)) return false;

    return rangeLabels.some(label => {
        const range = config.find(r => r.label === label);
        if (!range) return false;
        return p >= range.min && p <= range.max;
    });
}

function applyFilters() {
    const searchTerm = searchInput.value.toLowerCase();

    displayedProducts = productData.filter(product => {
        const matchesSearch = product.sku.toLowerCase().includes(searchTerm) ||
            product.name.toLowerCase().includes(searchTerm);

        const matchesCap = selectedCapacities.length === 0 || selectedCapacities.includes(product.capacity);
        const matchesRetail = isInRange(product.priceRetail, selectedRetailRanges, RETAIL_RANGES);
        const matchesWholesale = isInRange(product.priceWholesale, selectedWholesaleRanges, WHOLESALE_RANGES);

        return matchesSearch && matchesCap && matchesRetail && matchesWholesale;
    });

    renderProducts();
}

searchInput.addEventListener('input', applyFilters);

const clearFiltersBtn = document.getElementById('clearFiltersBtn');
clearFiltersBtn.addEventListener('click', () => {
    selectedCapacities = [];
    selectedRetailRanges = [];
    selectedWholesaleRanges = [];
    searchInput.value = '';
    populateFilters();
    applyFilters();
});
// filterRetail/Wholesale standard listeners are no longer needed as they are now custom divs

// View Toggles
gridBtn.addEventListener('click', () => {
    container.classList.remove('list-view');
    gridBtn.classList.add('active');
    listBtn.classList.remove('active');
});

listBtn.addEventListener('click', () => {
    container.classList.add('list-view');
    listBtn.classList.add('active');
    gridBtn.classList.remove('active');
});


// Google Sheet Integration (JSONP)
const SHEET_ID = '1rjKhc3mdidpe-kQpADVdVAUtcaakPaWHyGZffYvPG5w';

function syncGoogleSheet(isAuto = false) {
    window.processGoogleSheetData = (data) => {
        try {
            if (data.status === 'error') throw new Error('Google API Error');
            const cols = data.table.cols.map(c => c.label);
            const rows = data.table.rows;

            if (rows.length === 0) return;

            const newData = rows.map(r => {
                let rowObj = {};
                cols.forEach((col, i) => {
                    rowObj[col] = (r.c && r.c[i] && r.c[i].v != null) ? String(r.c[i].v) : "";
                });

                // Helper to find column by keyword
                const findCol = (keywords) => {
                    const foundKey = Object.keys(rowObj).find(k => keywords.some(kw => k.toLowerCase().includes(kw.toLowerCase())));
                    return foundKey ? rowObj[foundKey] : null;
                };

                const visibility = (findCol(["สถานะ", "status", "ซ่อน", "hide"]) || "").toLowerCase();
                const isHidden = visibility === "hide" || visibility === "ซ่อน" || visibility === "ไม่แสดง";

                return {
                    sku: findCol(["รหัสสินค้า"]) || rowObj["sku"] || "-",
                    name: findCol(["ชื่อสินค้า"]) || rowObj["name"] || "-",
                    material: findCol(["วัสดุ"]) || "-",
                    capacity: findCol(["ความจุ"]) || "-",
                    size: findCol(["ขนาด"]) || "-",
                    priceRetail: findCol(["ปลีก"]) || "-",
                    priceWholesale: findCol(["ส่ง"]) || "-",
                    imageUrl: findCol(["URL"]) || rowObj["imageUrl"] || "",
                    hidden: isHidden
                };
            }).filter(p => !p.hidden);

            productData = [...newData].reverse();
            localStorage.setItem('productDatabase', JSON.stringify(productData));
            displayedProducts = [...productData];
            populateFilters();
            renderProducts();
        } catch (e) {
            console.error('Error parsing sheet data', e);
        } finally {
            delete window.processGoogleSheetData;
        }
    };

    const script = document.createElement('script');
    script.src = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json;responseHandler:processGoogleSheetData`;
    script.onerror = () => {
        console.error('Failed to connect to Google Sheet');
    };
    document.body.appendChild(script);
    script.onload = () => document.body.removeChild(script);
}

// Init
populateFilters();
renderProducts();
// Auto-sync on load
syncGoogleSheet(true);
