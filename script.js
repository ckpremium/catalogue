const defaultProductData = [
    { sku: "TB-001", name: "แก้วเยติ 20 oz (กล่องสีนํ้าตาล ฟู๊ดเกรด)", material: "sus 201", capacity: "20 Oz", priceRetail: "290", priceWholesale: "85" },
    { sku: "TB-002", name: "แก้วเยติ 20 oz ( กล่องสีขาว )", material: "sus 304", capacity: "20 Oz", priceRetail: "290", priceWholesale: "85" }
];

// Load database from localStorage or fallback to default
let loadedDB = JSON.parse(localStorage.getItem('productDatabase'));
let productData = (loadedDB && loadedDB.length > 0) ? loadedDB : defaultProductData;

// App State
let allProducts = []; // Will hold the full list from Google Sheet
let displayedProducts = [];

// v32: Recommended logic now driven by Google Sheet column "Recommended" or "สินค้าแนะนำ"
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


// Render Recommended Products (Compact Row)
function renderRecommended() {
    const recContainer = document.getElementById('recommended-section');
    if (!recContainer) return;

    // Filter for products marked as recommended in Google Sheet
    const recommended = allProducts.filter(p => p.isRecommended).slice(0, 3);

    console.log('Detected Recommended Items:', recommended.length);

    if (recommended.length === 0) {
        recContainer.style.display = 'none';
        return;
    }

    recContainer.style.display = 'block';
    recContainer.innerHTML = `
        <div class="section-title-sm">⭐ สินค้าแนะนำ</div>
        <div class="recommended-row">
            ${recommended.map(product => {
        const imgUrl = `./extracted_images/${product.sku}.png`;
        return `
                    <div class="recommended-card" onclick="openModal('${imgUrl}', '${product.sku} - ${product.name}')">
                        <img src="${imgUrl}" onerror="this.src='./icon-512.png'">
                        <div class="rec-info">
                            <div class="rec-name">${product.name}</div>
                            <div class="rec-price">฿${product.priceRetail}</div>
                        </div>
                    </div>
                `;
    }).join('')}
        </div>
    `;
}

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
            <div class="product-image-container" onclick="openModal('${finalImageUrl}', '${product.sku} - ${product.name}')">
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
                <div class="zoom-hint">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        <line x1="11" y1="8" x2="11" y2="14"></line>
                        <line x1="8" y1="11" x2="14" y2="11"></line>
                    </svg>
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

                <div class="product-actions">
                    <button onclick="copyProductDetails('${product.sku}', '${product.name}')" class="copy-btn">
                         <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                        คัดลอกรายละเอียด
                    </button>
                    <button onclick="handleMessengerInquiry('${product.sku}', '${product.name}')" class="inquiry-btn">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C6.477 2 2 6.145 2 11.258c0 2.908 1.454 5.494 3.727 7.178V22l3.393-1.862c.846.235 1.743.36 2.68.36 5.523 0 10-4.145 10-9.258C21.8 6.145 17.523 2 12 2zm1.09 13l-2.433-2.603-4.75 2.603 5.225-5.552 2.493 2.603 4.69-2.603-5.225 5.552z"/>
                        </svg>
                        สอบถามรุ่นนี้
                    </button>
                </div>

                <div class="product-card-note">
                    * ราคาพร้อมเลเซอร์โลโก้ฟรี (ยังไม่รวมค่าจัดส่ง)
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

// Modal Logic
const modal = document.getElementById("imageModal");
const modalImg = document.getElementById("modalImg");
const captionText = document.getElementById("caption");
const closeModalBtn = document.getElementsByClassName("close-modal")[0];

function openModal(imgSrc, caption) {
    modal.style.display = "block";
    modalImg.src = imgSrc;
    captionText.innerHTML = caption;
    document.body.style.overflow = "hidden"; // Prevent scrolling

    // GA Tracking: View Image
    if (typeof gtag === 'function') {
        gtag('event', 'view_product_image', {
            'product_info': caption
        });
    }
}

if (closeModalBtn) {
    closeModalBtn.onclick = function () {
        modal.style.display = "none";
        document.body.style.overflow = "auto";
    }
}

window.onclick = function (event) {
    if (event.target == modal) {
        modal.style.display = "none";
        document.body.style.overflow = "auto";
    }
}

// Inquiry Logic v29 - Independent Buttons with GA Tracking
function copyProductDetails(sku, name) {
    const message = `สวัสดีครับ สนใจสินค้าชิ้นนี้ครับ\nรหัสสินค้า: ${sku}\nรุ่น: ${name}`;

    // GA Tracking: Copy Details
    if (typeof gtag === 'function') {
        gtag('event', 'copy_product_details', {
            'product_sku': sku,
            'product_name': name
        });
    }

    // Support Function: Robost Copy
    const textArea = document.createElement("textarea");
    textArea.value = message;
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showToast("คัดลอกรายละเอียดเรียบร้อย! ✅", "นำข้อมูลไปวางเพื่อสอบถามได้เลยครับ");
    } catch (err) {
        document.body.removeChild(textArea);
        showToast("คัดลอกไม่สำเร็จ ❌", "โปรดลองใหม่อีกครั้ง");
    }
}

function handleMessengerInquiry(sku, name) {
    // GA Tracking: Inquiry Click
    if (typeof gtag === 'function') {
        gtag('event', 'messenger_inquiry', {
            'product_sku': sku,
            'product_name': name
        });
    }
    window.open('https://m.me/ckprintingth', '_blank');
}

function showToast(title, subtitle) {
    const toast = document.getElementById("toast");
    if (!toast) return;

    toast.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 8px; font-size: 1.1rem; color: #fff;">${title}</div>
        <div style="font-size: 0.9rem; opacity: 0.9;">${subtitle}</div>
    `;
    toast.classList.add("show");

    setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
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

            console.log('Google Sheet Columns Found:', cols);

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

                const isHidden = visibility === "hide" || visibility === "ซ่อน" || visibility === "ไม่แสดง";

                const recVal = (findCol(["แนะนำ", "recommended", "special", "star", "top", "fav", "pick"]) || "").toLowerCase();
                const isRecommended = recVal === "yes" || recVal === "ใช่" || recVal === "true" || recVal === "1" || recVal === "⭐" || recVal === "star" || recVal === "แนะนำ";

                return {
                    sku: findCol(["รหัสสินค้า"]) || rowObj["sku"] || "-",
                    name: findCol(["ชื่อสินค้า"]) || rowObj["name"] || "-",
                    material: findCol(["วัสดุ"]) || "-",
                    capacity: findCol(["ความจุ"]) || "-",
                    size: findCol(["ขนาด"]) || "-",
                    priceRetail: findCol(["ปลีก"]) || "-",
                    priceWholesale: findCol(["ส่ง"]) || "-",
                    imageUrl: findCol(["URL"]) || rowObj["imageUrl"] || "",
                    hidden: isHidden,
                    isRecommended: isRecommended
                };
            }).filter(p => !p.hidden);

            allProducts = [...newData].reverse(); // Store all products
            productData = [...allProducts]; // productData is now the full list before filtering
            localStorage.setItem('productDatabase', JSON.stringify(productData));
            displayedProducts = [...productData]; // displayedProducts starts as the full list

            // v31: Render initial views
            renderRecommended();
            populateFilters(); // Renamed from setupFilters
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

// View Count API Integration
async function updateViewCount() {
    try {
        // Using counterapi.dev - a free and reliable hit counter API
        const response = await fetch('https://api.counterapi.dev/v1/ck-premium-catalog/visits/up');
        const data = await response.json();
        const element = document.getElementById('view-count-value');
        if (element && data.count) {
            element.innerText = data.count.toLocaleString() + " Views";
        }
    } catch (e) {
        console.error('Counter API error:', e);
        const element = document.getElementById('view-count-value');
        if (element) element.innerText = "Welcome";
    }
}
updateViewCount();
