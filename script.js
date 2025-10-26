/**
 * ZeSt Bot - Telegram WebApp для магазина напитков
 * 
 * Основные функции:
 * - Каталог товаров с поиском и фильтрацией
 * - Корзина покупок
 * - Избранное
 * - История заказов
 * - ZeSt Club подписка
 * - PWA функциональность
 * 
 * @version 2.0.0
 * @author ZeSt Team
 */

// Telegram WebApp initialization
const tg = window.Telegram.WebApp;

// Global state variables
let cart = [];                    // Корзина покупок
let wishlist = [];               // Список избранного
let user = null;                 // Данные пользователя
let products = [];               // Каталог товаров
let services = [];               // Дополнительные услуги
let currentPage = 'catalog';     // Текущая страница
let deliveryAddress = '';        // Адрес доставки
let currentProducts = [];        // Отфильтрованные товары
let orderHistory = [];           // История заказов

// Backend configuration
const BACKEND_URL = 'https://script.google.com/macros/s/AKfycbyFyHGh_ukTdyVFG7Z2duQ6K6qxtNiNpcLQ4mF3bvYmc_VAtYU9LuOkeDzNajcQk_2V/exec';

/**
 * Возвращает демо-данные товаров для тестирования
 * @function getDemoProducts
 * @returns {Array} Массив демо-товаров
 */
function getDemoProducts() {
    return [
        {
            id: 1,
            name: "Red Bull Energy Drink",
            price: 120,
            category: "energy",
            volume: "250мл",
            image: "",
            isNew: false,
            isSale: true,
            isPopular: true,
            rating: 4.5,
            description: "Классический энергетический напиток",
            tags: ["энергетик", "классика"]
        },
        {
            id: 2,
            name: "Monster Energy",
            price: 150,
            category: "energy",
            volume: "500мл",
            image: "",
            isNew: true,
            isSale: false,
            isPopular: true,
            rating: 4.3,
            description: "Мощный энергетический напиток",
            tags: ["энергетик", "мощный"]
        },
        {
            id: 3,
            name: "Coca-Cola",
            price: 80,
            category: "soft",
            volume: "330мл",
            image: "",
            isNew: false,
            isSale: false,
            isPopular: true,
            rating: 4.7,
            description: "Классическая газировка",
            tags: ["газировка", "классика"]
        },
        {
            id: 4,
            name: "Pepsi Cola",
            price: 75,
            category: "soft",
            volume: "330мл",
            image: "",
            isNew: false,
            isSale: true,
            isPopular: false,
            rating: 4.2,
            description: "Альтернатива Coca-Cola",
            tags: ["газировка", "альтернатива"]
        },
        {
            id: 5,
            name: "Aqua Minerale",
            price: 45,
            category: "water",
            volume: "500мл",
            image: "",
            isNew: false,
            isSale: false,
            isPopular: false,
            rating: 4.0,
            description: "Чистая питьевая вода",
            tags: ["вода", "чистая"]
        },
        {
            id: 6,
            name: "Burn Energy",
            price: 110,
            category: "energy",
            volume: "250мл",
            image: "",
            isNew: true,
            isSale: false,
            isPopular: false,
            rating: 4.1,
            description: "Энергетик с фруктовым вкусом",
            tags: ["энергетик", "фруктовый"]
        }
    ];
}

/**
 * Возвращает демо-данные сервисов для тестирования
 * @function getDemoServices
 * @returns {Array} Массив демо-сервисов
 */
function getDemoServices() {
    return [
        {
            id: 1,
            name: "Упаковка в подарочную коробку",
            price: 50
        },
        {
            id: 2,
            name: "Персональная открытка",
            price: 25
        },
        {
            id: 3,
            name: "Экспресс доставка (в течение часа)",
            price: 100
        }
    ];
}

/**
 * Инициализация приложения
 * Настраивает Telegram WebApp, загружает данные и устанавливает обработчики событий
 * @async
 * @function initApp
 */
async function initApp() {
    console.log('Initializing ZeSt app...');
    
    
    // Initialize Telegram WebApp
    if (tg) {
        try {
            tg.expand();
        } catch (e) {
            console.warn('Telegram expand failed:', e);
        }
        
        try {
            tg.enableClosingConfirmation();
        } catch (e) {
            console.warn('Telegram closing confirmation not supported:', e);
        }
        
        try {
            tg.setHeaderColor('#FF5A1F');
        } catch (e) {
            console.warn('Telegram header color not supported:', e);
        }
        
        try {
            tg.setBackgroundColor('#FFFFFF');
        } catch (e) {
            console.warn('Telegram background color not supported:', e);
        }
    }
    
    // Check if user is already authenticated
    const savedUser = localStorage.getItem('zest_user');
    if (savedUser) {
        try {
            user = JSON.parse(savedUser);
            updateUserProfile();
        } catch (e) {
            localStorage.removeItem('zest_user');
        }
    }
    
    // Check age verification
    const ageVerified = localStorage.getItem('ageVerified');
    if (ageVerified === 'true') {
        showMainApp();
    } else {
        showAgeVerification();
    }
    
    // Setup event listeners
    setupEventListeners();
    
    // Initialize cart and wishlist from localStorage
    loadCartFromStorage();
    loadWishlistFromStorage();
    loadOrderHistoryFromStorage();
    loadOfflineQueue();
    updateCartUI();
    updateWishlistUI();
    
    // Initialize offline functionality
    showOfflineIndicator();
    checkOnlineStatus();
    
    // Load products and services from Google Sheets
    await Promise.all([loadProducts(), loadServices()]);
    
    // Check subscription status
    checkSubscriptionStatus();
    
    // Request notification permission
    requestNotificationPermission();
    
    console.log('ZeSt app initialized successfully');
}

/**
 * Показывает экран проверки возраста
 * @function showAgeVerification
 */
function showAgeVerification() {
    const ageVerification = document.getElementById('age-verification');
    const app = document.getElementById('app');
    if (ageVerification) ageVerification.classList.remove('hidden');
    if (app) app.classList.add('hidden');
}

function showMainApp() {
    const ageVerification = document.getElementById('age-verification');
    const app = document.getElementById('app');
    if (ageVerification) ageVerification.classList.add('hidden');
    if (app) app.classList.remove('hidden');
}

// Loading overlay
function showLoading() {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) loadingOverlay.classList.remove('hidden');
}

function hideLoading() {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) loadingOverlay.classList.add('hidden');
}

// Event listeners setup
function setupEventListeners() {
    // Age verification
    const ageConfirm = document.getElementById('age-confirm');
    const ageDeny = document.getElementById('age-deny');
    
    if (ageConfirm) ageConfirm.addEventListener('click', () => {
        localStorage.setItem('ageVerified', 'true');
        showMainApp();
    });
    
    if (ageDeny) ageDeny.addEventListener('click', () => {
        alert('Извините, доступ к магазину разрешен только с 18 лет');
    });
    
    // Bottom Navigation
    document.querySelectorAll('.bottom-navigation .nav-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const page = this.getAttribute('data-page');
            switchPage(page);
        });
    });
    
    // Header cart button
    const cartIndicator = document.getElementById('cart-indicator');
    if (cartIndicator) cartIndicator.addEventListener('click', () => switchPage('cart'));
    
    // Header wishlist button
    const wishlistIndicator = document.getElementById('wishlist-indicator');
    if (wishlistIndicator) wishlistIndicator.addEventListener('click', () => {
        switchPage('profile');
        setTimeout(() => switchProfileTab('wishlist'), 100);
    });
    
    // Cart steps navigation
    const toStep2 = document.getElementById('to-step-2');
    const toStep3 = document.getElementById('to-step-3');
    const backToStep1 = document.getElementById('back-to-step-1');
    const backToStep2 = document.getElementById('back-to-step-2');
    
    if (toStep2) toStep2.addEventListener('click', () => switchCartStep(2));
    if (toStep3) toStep3.addEventListener('click', () => switchCartStep(3));
    if (backToStep1) backToStep1.addEventListener('click', () => switchCartStep(1));
    if (backToStep2) backToStep2.addEventListener('click', () => switchCartStep(2));
    
    // Telegram auth
    const telegramAuth = document.getElementById('telegram-auth');
    if (telegramAuth) telegramAuth.addEventListener('click', handleTelegramAuth);
    
    // Logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    
    // Order confirmation
    const confirmOrder = document.getElementById('confirm-order');
    if (confirmOrder) confirmOrder.addEventListener('click', confirmOrderHandler);
    
    // Modals
    const closeModal = document.getElementById('close-modal');
    const modalBackgrounds = document.querySelectorAll('.modal-background');
    
    if (closeModal) closeModal.addEventListener('click', closeModalHandler);
    
    modalBackgrounds.forEach(bg => {
        bg.addEventListener('click', function() {
            closeModalHandler();
        });
    });
    
    // Search and filters
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.addEventListener('input', debounce(filterProducts, 300));
    
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) sortSelect.addEventListener('change', filterProducts);
    
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.filter-btn').forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-selected', 'false');
            });
            this.classList.add('active');
            this.setAttribute('aria-selected', 'true');
            filterProducts();
        });
        
        // Add keyboard support for filter buttons
        btn.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.click();
            }
        });
    });
    
    // ZeSt Club subscription
    const subscribeBtn = document.getElementById('subscribe-btn');
    const manageSubscription = document.getElementById('manage-subscription');
    if (subscribeBtn) subscribeBtn.addEventListener('click', handleSubscription);
    if (manageSubscription) manageSubscription.addEventListener('click', handleSubscription);
    
    // Delivery options
    document.querySelectorAll('input[name="delivery"]').forEach(option => {
        option.addEventListener('change', handleDeliveryOptionChange);
    });
    
    // Exact time checkbox
    const exactTimeCheckbox = document.getElementById('exact-time');
    if (exactTimeCheckbox) exactTimeCheckbox.addEventListener('change', updateOrderSummary);
    
    // Address input
    const addressInput = document.getElementById('delivery-address');
    if (addressInput) addressInput.addEventListener('input', handleAddressChange);
    
    // Payment methods
    document.querySelectorAll('input[name="payment"]').forEach(option => {
        option.addEventListener('change', updateOrderSummary);
    });
    
    // Go to catalog from empty state
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('go-to-catalog')) {
            switchPage('catalog');
        }
    });
    
    // Profile tabs
    document.querySelectorAll('.profile-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            switchProfileTab(tabName);
        });
    });
    
    // Offline/Online event listeners
    window.addEventListener('online', checkOnlineStatus);
    window.addEventListener('offline', checkOnlineStatus);
    
    // Enhanced keyboard navigation
    document.addEventListener('keydown', function(e) {
        // Close modal with Escape
        if (e.key === 'Escape') {
            closeModalHandler();
        }
        
        // Navigation with arrow keys
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            const activeTab = document.querySelector('.filter-btn.active');
            if (activeTab) {
                const tabs = Array.from(document.querySelectorAll('.filter-btn'));
                const currentIndex = tabs.indexOf(activeTab);
                let newIndex;
                
                if (e.key === 'ArrowLeft') {
                    newIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
                } else {
                    newIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
                }
                
                tabs[newIndex].focus();
                tabs[newIndex].click();
                e.preventDefault();
            }
        }
        
        // Quick search with Ctrl+F
        if (e.ctrlKey && e.key === 'f') {
            e.preventDefault();
            const searchInput = document.getElementById('search-input');
            if (searchInput) {
                searchInput.focus();
                searchInput.select();
            }
        }
        
        // Quick cart with Ctrl+C
        if (e.ctrlKey && e.key === 'c') {
            e.preventDefault();
            switchPage('cart');
        }
        
        // Quick wishlist with Ctrl+W
        if (e.ctrlKey && e.key === 'w') {
            e.preventDefault();
            switchPage('profile');
            setTimeout(() => switchProfileTab('wishlist'), 100);
        }
    });
}

// Utility function for debouncing
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Delivery option change handler
function handleDeliveryOptionChange() {
    const selectedOption = document.querySelector('input[name="delivery"]:checked');
    const addressSection = document.getElementById('address-section');
    const toStep3Button = document.getElementById('to-step-3');
    
    if (selectedOption && selectedOption.value !== 'none') {
        addressSection.classList.remove('hidden');
        toStep3Button.disabled = !deliveryAddress;
    } else {
        addressSection.classList.add('hidden');
        toStep3Button.disabled = false;
    }
    updateOrderSummary();
}

// Address input change handler
function handleAddressChange() {
    const addressInput = document.getElementById('delivery-address');
    const toStep3Button = document.getElementById('to-step-3');
    
    if (addressInput) {
        deliveryAddress = addressInput.value.trim();
        const selectedOption = document.querySelector('input[name="delivery"]:checked');
        if (selectedOption && selectedOption.value !== 'none') {
            toStep3Button.disabled = !deliveryAddress;
        }
    }
}

// Page navigation
function switchPage(pageName) {
    currentPage = pageName;
    
    // Update bottom navigation
    document.querySelectorAll('.bottom-navigation .nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    const activeNavBtn = document.querySelector(`.bottom-navigation [data-page="${pageName}"]`);
    if (activeNavBtn) activeNavBtn.classList.add('active');
    
    // Update pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    const activePage = document.getElementById(`${pageName}-page`);
    if (activePage) activePage.classList.add('active');
    
    // Special handling for different pages
    if (pageName === 'cart') {
        switchCartStep(1);
    } else if (pageName === 'profile') {
        switchProfileTab('info');
        updateWishlistPage();
    } else if (pageName === 'catalog') {
        renderProducts();
    }
}

// Profile tabs
function switchProfileTab(tabName) {
    // Update tabs
    document.querySelectorAll('.profile-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    const activeTab = document.querySelector(`.profile-tab[data-tab="${tabName}"]`);
    if (activeTab) activeTab.classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active');
    });
    const activePane = document.getElementById(`tab-${tabName}`);
    if (activePane) activePane.classList.add('active');
    
    // Special handling for wishlist tab
    if (tabName === 'wishlist') {
        updateWishlistPage();
    }
}

/**
 * Загружает корзину из localStorage
 * @function loadCartFromStorage
 */
function loadCartFromStorage() {
    const savedCart = localStorage.getItem('zest_cart');
    if (savedCart) {
        try {
            cart = JSON.parse(savedCart);
        } catch (e) {
            cart = [];
        }
    }
}

function saveCartToStorage() {
    localStorage.setItem('zest_cart', JSON.stringify(cart));
}

/**
 * Добавляет товар в корзину
 * @param {string|number} productId - ID товара
 * @param {number} quantity - Количество (по умолчанию 1)
 * @function addToCart
 */
function addToCart(productId, quantity = 1) {
    const product = products.find(p => p.id.toString() === productId.toString());
    if (!product) {
        showNotification('Товар не найден', 'error');
        return;
    }
    
    const existingItem = cart.find(item => item.productId.toString() === productId.toString());
    
    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        cart.push({
            productId: productId,
            quantity: quantity,
            name: product.name,
            price: product.price,
            image: product.image,
            volume: product.volume || ''
        });
    }
    
    saveCartToStorage();
    updateCartUI();
    showNotification(`${product.name} добавлен в корзину`, 'success');
}

function updateCartItemQuantity(productId, newQuantity) {
    if (newQuantity <= 0) {
        removeFromCart(productId);
        return;
    }
    
    const item = cart.find(item => item.productId.toString() === productId.toString());
    if (item) {
        item.quantity = newQuantity;
        saveCartToStorage();
        updateCartUI();
        
        // Update product cards if we're on catalog page
        if (currentPage === 'catalog') {
            renderProducts();
        }
    }
}

function removeFromCart(productId) {
    const itemIndex = cart.findIndex(item => item.productId.toString() === productId.toString());
    if (itemIndex !== -1) {
        const item = cart[itemIndex];
        cart.splice(itemIndex, 1);
        saveCartToStorage();
        updateCartUI();
        
        // Update product cards if we're on catalog page
        if (currentPage === 'catalog') {
            renderProducts();
        }
        
        showNotification(`${item.name} удален из корзины`, 'info');
    }
}

function updateCartUI() {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const cartCount = document.getElementById('cart-count');
    const bottomCartCount = document.getElementById('bottom-cart-count');
    
    if (cartCount) cartCount.textContent = totalItems;
    if (bottomCartCount) bottomCartCount.textContent = totalItems;
    
    updateCartPage();
    
    const toStep2 = document.getElementById('to-step-2');
    if (toStep2) toStep2.disabled = totalItems === 0;
}

function updateCartPage() {
    const cartItemsContainer = document.getElementById('cart-items');
    const totalPriceElement = document.getElementById('cart-total-price');
    
    if (!cartItemsContainer || !totalPriceElement) return;
    
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
                    </svg>
                </span>
                <p>Корзина пуста</p>
                <button class="btn-secondary go-to-catalog">Перейти в каталог</button>
            </div>
        `;
        totalPriceElement.textContent = '0';
        return;
    }
    
    let totalPrice = 0;
    cartItemsContainer.innerHTML = '';
    
    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        totalPrice += itemTotal;
        
        const itemElement = document.createElement('div');
        itemElement.className = 'cart-item';
        itemElement.innerHTML = `
            <div class="cart-item-image">${item.image ? `<img src="${item.image}" alt="${item.name}">` : '🥤'}</div>
            <div class="cart-item-info">
                <div class="cart-item-name">${item.name}</div>
                ${item.volume ? `<div class="cart-item-volume">${item.volume}</div>` : ''}
                <div class="cart-item-price">${item.price}₽ × ${item.quantity} = ${itemTotal}₽</div>
            </div>
            <div class="cart-item-actions">
                <button class="quantity-btn" onclick="updateCartItemQuantity('${item.productId}', ${item.quantity - 1})">-</button>
                <span class="quantity-display">${item.quantity}</span>
                <button class="quantity-btn" onclick="updateCartItemQuantity('${item.productId}', ${item.quantity + 1})">+</button>
            </div>
        `;
        cartItemsContainer.appendChild(itemElement);
    });
    
    totalPriceElement.textContent = totalPrice;
}

// Wishlist functionality
function loadWishlistFromStorage() {
    const savedWishlist = localStorage.getItem('zest_wishlist');
    if (savedWishlist) {
        try {
            wishlist = JSON.parse(savedWishlist);
        } catch (e) {
            wishlist = [];
        }
    }
}

function saveWishlistToStorage() {
    localStorage.setItem('zest_wishlist', JSON.stringify(wishlist));
}

function toggleWishlist(productId) {
    const product = products.find(p => p.id.toString() === productId.toString());
    if (!product) return;
    
    const existingIndex = wishlist.findIndex(item => item.productId.toString() === productId.toString());
    
    if (existingIndex !== -1) {
        // Remove from wishlist
        wishlist.splice(existingIndex, 1);
        showNotification(`${product.name} удален из избранного`, 'info');
    } else {
        // Add to wishlist
        wishlist.push({
            productId: productId,
            name: product.name,
            price: product.price,
            image: product.image,
            volume: product.volume || ''
        });
        showNotification(`${product.name} добавлен в избранное`, 'success');
    }
    
    saveWishlistToStorage();
    updateWishlistUI();
    
    // Update product cards if we're on catalog page
    if (currentPage === 'catalog') {
        renderProducts();
    }
}

function updateWishlistUI() {
    const wishlistCount = document.getElementById('wishlist-count');
    if (wishlistCount) wishlistCount.textContent = wishlist.length;
}

function updateWishlistPage() {
    const wishlistContainer = document.getElementById('wishlist-items');
    if (!wishlistContainer) return;
    
    if (wishlist.length === 0) {
        wishlistContainer.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
                    </svg>
                </span>
                <p>В вашем списке желаний пока пусто</p>
                <button class="btn-secondary go-to-catalog">Перейти в каталог</button>
            </div>
        `;
        return;
    }
    
    wishlistContainer.innerHTML = '';
    
    wishlist.forEach(item => {
        const itemElement = document.createElement('div');
        itemElement.className = 'wishlist-item';
        itemElement.innerHTML = `
            <div class="wishlist-item-image">${item.image ? `<img src="${item.image}" alt="${item.name}">` : '🥤'}</div>
            <div class="wishlist-item-name">${item.name}</div>
            ${item.volume ? `<div class="wishlist-item-volume">${item.volume}</div>` : ''}
            <div class="wishlist-item-price">${item.price}₽</div>
            <div class="wishlist-item-actions">
                <button class="btn-primary" onclick="addToCart('${item.productId}', 1)">В корзину</button>
                <button class="wishlist-remove-btn" onclick="toggleWishlist('${item.productId}')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"/>
                    </svg>
                </button>
            </div>
        `;
        wishlistContainer.appendChild(itemElement);
    });
}

// Cart steps
function switchCartStep(step) {
    // Update steps indicator
    document.querySelectorAll('.step').forEach(stepEl => {
        stepEl.classList.remove('active');
    });
    const activeStep = document.querySelector(`[data-step="${step}"]`);
    if (activeStep) activeStep.classList.add('active');
    
    // Update step content
    document.querySelectorAll('.cart-step').forEach(stepContent => {
        stepContent.classList.remove('active');
    });
    const activeStepContent = document.getElementById(`cart-step-${step}`);
    if (activeStepContent) activeStepContent.classList.add('active');
    
    // Special handling for steps
    if (step === 2) handleDeliveryOptionChange();
    if (step === 3) updateOrderSummary();
}

function updateOrderSummary() {
    const orderSummary = document.getElementById('order-summary');
    const finalTotalElement = document.getElementById('final-total');
    
    if (!orderSummary || !finalTotalElement) return;
    
    let total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    let summaryHTML = '<div class="order-items">';
    
    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        summaryHTML += `
            <div class="order-item">
                <span>${item.name} ${item.volume ? `(${item.volume})` : ''} × ${item.quantity}</span>
                <span>${itemTotal}₽</span>
            </div>
        `;
    });
    
    summaryHTML += '</div>';
    
    // Add delivery cost
    const deliveryOption = document.querySelector('input[name="delivery"]:checked');
    let deliveryCost = 0;
    let deliveryMethod = 'Самовывоз';
    
    if (deliveryOption && deliveryOption.value !== 'none') {
        if (deliveryOption.value === 'iskateli') {
            deliveryCost = 15;
            deliveryMethod = 'рп. Искателей';
        }
        if (deliveryOption.value === 'naryan-mar') {
            deliveryCost = 50;
            deliveryMethod = 'Нарьян-Мар';
        }
        
        if (document.getElementById('exact-time').checked) {
            deliveryCost += 10;
        }
        
        total += deliveryCost;
        summaryHTML += `
            <div class="order-delivery">
                <span>Доставка (${deliveryMethod})</span>
                <span>${deliveryCost}₽</span>
            </div>
        `;
        
        if (deliveryAddress) {
            summaryHTML += `
                <div class="order-address">
                    <span>Адрес доставки:</span>
                    <span class="address-text">${deliveryAddress}</span>
                </div>
            `;
        }
    } else {
        summaryHTML += `
            <div class="order-delivery">
                <span>Самовывоз</span>
                <span>0₽</span>
            </div>
        `;
    }
    
    // Add services cost
    const selectedServices = getSelectedServices();
    if (selectedServices.length > 0) {
        summaryHTML += '<div class="order-services">';
        selectedServices.forEach(service => {
            total += service.price;
            summaryHTML += `
                <div class="order-service">
                    <span>${service.name}</span>
                    <span>${service.price}₽</span>
                </div>
            `;
        });
        summaryHTML += '</div>';
    }
    
    // Add payment method
    const paymentMethod = document.querySelector('input[name="payment"]:checked');
    if (paymentMethod) {
        const paymentText = paymentMethod.value === 'cash' ? 'Наличные при получении' : 'Перевод по СБП при получении';
        summaryHTML += `
            <div class="order-payment">
                <span>Способ оплаты:</span>
                <span>${paymentText}</span>
            </div>
        `;
    }
    
    finalTotalElement.textContent = total;
    orderSummary.innerHTML = summaryHTML;
}

// Product management from Google Sheets with caching
async function loadProducts() {
    // Check cache first
    const cacheKey = 'zest_products_cache';
    const cacheExpiry = 'zest_products_cache_expiry';
    const cacheTime = 5 * 60 * 1000; // 5 minutes
    
    const cachedData = localStorage.getItem(cacheKey);
    const cacheTimestamp = localStorage.getItem(cacheExpiry);
    
    if (cachedData && cacheTimestamp && (Date.now() - parseInt(cacheTimestamp)) < cacheTime) {
        try {
            products = JSON.parse(cachedData);
            currentProducts = [...products];
            renderProducts();
            return;
        } catch (e) {
            console.warn('Failed to parse cached products, loading fresh data');
        }
    }
    
    showLoading();
    try {
        console.log('Attempting to load products from:', BACKEND_URL);
        
        const response = await fetch(`${BACKEND_URL}?action=getProducts`, {
            headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        });
        
        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);
        
        if (response.ok) {
            const data = await response.json();
            console.log('Products loaded successfully:', data.length, 'items');
            
            // Validate data structure
            if (Array.isArray(data) && data.length > 0) {
                products = data;
                currentProducts = [...products];
                
                // Cache the data
                localStorage.setItem(cacheKey, JSON.stringify(products));
                localStorage.setItem(cacheExpiry, Date.now().toString());
                
                renderProducts();
            } else {
                throw new Error('Invalid data format received from server');
            }
        } else {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
    } catch (error) {
        console.error('Error loading products:', error);
        
        // Try to use cached data as fallback
        if (cachedData) {
            try {
                products = JSON.parse(cachedData);
                currentProducts = [...products];
                renderProducts();
                showNotification('Загружены кэшированные данные', 'warning');
                return;
            } catch (e) {
                console.warn('Failed to use cached data as fallback');
            }
        }
        
        // Check if it's a CORS error (common when opening as file://)
        if (error.message.includes('CORS') || error.message.includes('Failed to fetch')) {
            console.log('CORS error detected, loading demo data automatically');
            products = getDemoProducts();
            currentProducts = [...products];
            showNotification('Загружены демо-товары (CORS ошибка)', 'warning');
        } else {
            showNotification('Ошибка загрузки товаров', 'error');
            
            // Fallback to demo data if no cached data available
            if (!cachedData) {
                products = getDemoProducts();
                currentProducts = [...products];
                showNotification('Загружены демо-товары', 'warning');
            }
        }
        
        // Show error details in console
        console.error('Backend URL:', BACKEND_URL);
        console.error('Error details:', error.message);
        
        renderProducts();
    } finally {
        hideLoading();
    }
}

function filterProducts() {
    const searchInput = document.getElementById('search-input');
    const sortSelect = document.getElementById('sort-select');
    
    if (!searchInput || !sortSelect) return;
    
    const searchTerm = searchInput.value.toLowerCase().trim();
    const activeFilter = document.querySelector('.filter-btn.active');
    const activeCategory = activeFilter ? activeFilter.dataset.category : 'all';
    const sortValue = sortSelect.value;
    
    let filteredProducts = products.filter(product => {
        // Enhanced search - includes name, volume, description, and tags
        const searchFields = [
            product.name,
            product.volume || '',
            product.description || '',
            product.tags ? product.tags.join(' ') : ''
        ];
        
        const matchesSearch = searchTerm === '' || searchFields.some(field => 
            field.toLowerCase().includes(searchTerm)
        );
        
        // Enhanced category filtering
        const matchesCategory = activeCategory === 'all' || 
                               product.category === activeCategory ||
                               (activeCategory === 'sale' && product.isSale) ||
                               (activeCategory === 'new' && product.isNew) ||
                               (activeCategory === 'popular' && product.isPopular);
        
        return matchesSearch && matchesCategory;
    });
    
    // Apply sorting with enhanced options
    switch(sortValue) {
        case 'price_asc':
            filteredProducts.sort((a, b) => a.price - b.price);
            break;
        case 'price_desc':
            filteredProducts.sort((a, b) => b.price - a.price);
            break;
        case 'name_asc':
            filteredProducts.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
            break;
        case 'name_desc':
            filteredProducts.sort((a, b) => b.name.localeCompare(a.name, 'ru'));
            break;
        case 'popular':
            filteredProducts.sort((a, b) => {
                const aPopular = a.isPopular ? 1 : 0;
                const bPopular = b.isPopular ? 1 : 0;
                return bPopular - aPopular;
            });
            break;
        case 'new':
            filteredProducts.sort((a, b) => {
                const aNew = a.isNew ? 1 : 0;
                const bNew = b.isNew ? 1 : 0;
                return bNew - aNew;
            });
            break;
        case 'rating':
            filteredProducts.sort((a, b) => (b.rating || 0) - (a.rating || 0));
            break;
        default:
            // Default sorting - keep as is
            break;
    }
    
    currentProducts = filteredProducts;
    renderProducts();
    
    // Update search results count
    updateSearchResultsCount(filteredProducts.length, products.length);
}

// New function to show search results count
function updateSearchResultsCount(filtered, total) {
    const searchInput = document.getElementById('search-input');
    if (!searchInput) return;
    
    // Remove existing count if any
    const existingCount = document.querySelector('.search-results-count');
    if (existingCount) {
        existingCount.remove();
    }
    
    if (filtered !== total) {
        const countElement = document.createElement('div');
        countElement.className = 'search-results-count';
        countElement.textContent = `Найдено: ${filtered} из ${total}`;
        countElement.style.cssText = `
            font-size: 0.8rem;
            color: var(--text-muted);
            margin-top: 0.5rem;
            text-align: center;
        `;
        searchInput.parentNode.appendChild(countElement);
    }
}

function renderProducts() {
    const grid = document.getElementById('products-grid');
    if (!grid) return;
    
    if (currentProducts.length === 0) {
        grid.innerHTML = `
            <div class="loading">
                <p>Товары не найдены</p>
                <div style="display: flex; gap: 0.5rem; margin-top: 1rem; flex-wrap: wrap;">
                    <button class="btn-secondary" onclick="loadDemoData()">
                        Загрузить демо-данные
                    </button>
                    <button class="btn-secondary" onclick="testBackendConnection()">
                        Тест подключения
                    </button>
                </div>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = '';
    
    currentProducts.forEach(product => {
        const cartItem = cart.find(item => item.productId.toString() === product.id.toString());
        const quantity = cartItem ? cartItem.quantity : 0;
        const isInWishlist = wishlist.some(item => item.productId.toString() === product.id.toString());
        
        const productElement = document.createElement('div');
        productElement.className = 'product-card';
        productElement.innerHTML = `
            ${product.isNew ? '<div class="product-badges"><span class="product-badge badge-new">Новинка</span></div>' : ''}
            ${product.isSale ? '<div class="product-badges"><span class="product-badge badge-sale">Акция</span></div>' : ''}
            ${product.isPopular ? '<div class="product-badges"><span class="product-badge badge-popular">Популярный</span></div>' : ''}
            <button class="wishlist-btn ${isInWishlist ? 'active' : ''}" onclick="toggleWishlist('${product.id}')" aria-label="${isInWishlist ? 'Удалить из избранного' : 'Добавить в избранное'}">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="${isInWishlist ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                    <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
                </svg>
            </button>
            <div class="product-image">
                ${product.image ? `<img src="${product.image}" alt="${product.name}" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">` : ''}
                <div class="product-image-fallback" style="${product.image ? 'display: none;' : ''}">🥤</div>
            </div>
            <div class="product-name">${product.name}</div>
            ${product.volume ? `<div class="product-volume">${product.volume}</div>` : ''}
            <div class="product-price">${product.price}₽</div>
            <div class="product-actions">
                ${quantity === 0 ? 
                    `<button class="btn-primary" onclick="addToCart('${product.id}', 1)" aria-label="Добавить ${product.name} в корзину">
                        <span class="btn-glow"></span>
                        В корзину
                    </button>` :
                    `<div class="quantity-controls">
                        <button class="quantity-btn" onclick="updateCartItemQuantity('${product.id}', ${quantity - 1})" aria-label="Уменьшить количество">-</button>
                        <span class="quantity-display">${quantity}</span>
                        <button class="quantity-btn" onclick="updateCartItemQuantity('${product.id}', ${quantity + 1})" aria-label="Увеличить количество">+</button>
                    </div>`
                }
            </div>
        `;
        grid.appendChild(productElement);
    });
}

// Services management from Google Sheets with caching
async function loadServices() {
    // Check cache first
    const cacheKey = 'zest_services_cache';
    const cacheExpiry = 'zest_services_cache_expiry';
    const cacheTime = 10 * 60 * 1000; // 10 minutes
    
    const cachedData = localStorage.getItem(cacheKey);
    const cacheTimestamp = localStorage.getItem(cacheExpiry);
    
    if (cachedData && cacheTimestamp && (Date.now() - parseInt(cacheTimestamp)) < cacheTime) {
        try {
            services = JSON.parse(cachedData);
            renderServices();
            return;
        } catch (e) {
            console.warn('Failed to parse cached services, loading fresh data');
        }
    }
    
    try {
        const response = await fetch(`${BACKEND_URL}?action=getServices`, {
            headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            services = data;
            
            // Cache the data
            localStorage.setItem(cacheKey, JSON.stringify(services));
            localStorage.setItem(cacheExpiry, Date.now().toString());
            
            renderServices();
        } else {
            throw new Error(`HTTP ${response.status}: Failed to load services`);
        }
    } catch (error) {
        console.error('Error loading services:', error);
        
        // Try to use cached data as fallback
        if (cachedData) {
            try {
                services = JSON.parse(cachedData);
                renderServices();
                return;
            } catch (e) {
                console.warn('Failed to use cached services as fallback');
            }
        }
        
        // Check if it's a CORS error
        if (error.message.includes('CORS') || error.message.includes('Failed to fetch')) {
            console.log('CORS error detected for services, loading demo data automatically');
            services = getDemoServices();
            showNotification('Загружены демо-сервисы (CORS ошибка)', 'warning');
        } else {
            // Fallback to demo services
            services = getDemoServices();
        }
        renderServices();
    }
}

function renderServices() {
    const servicesList = document.getElementById('services-list');
    if (!servicesList) return;
    
    servicesList.innerHTML = '';
    
    if (services.length === 0) {
        servicesList.innerHTML = '<div class="empty-state">Услуги временно недоступны</div>';
        return;
    }
    
    services.forEach(service => {
        const serviceElement = document.createElement('div');
        serviceElement.className = 'time-option';
        serviceElement.innerHTML = `
            <input type="checkbox" id="service-${service.id}" value="${service.id}">
            <label for="service-${service.id}">
                <div class="option-content">
                    <strong>${service.name}</strong>
                    <span>${service.price}₽</span>
                </div>
                <div class="checkbox-check"></div>
            </label>
        `;
        servicesList.appendChild(serviceElement);
        
        // Add event listener to update order summary when service is selected
        const checkbox = serviceElement.querySelector('input');
        if (checkbox) {
            checkbox.addEventListener('change', updateOrderSummary);
        }
    });
}

// Order submission to Google Sheets
async function submitOrder(orderData) {
    showLoading();
    try {
        const response = await fetch(`${BACKEND_URL}?action=createOrder`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(orderData)
        });

        if (!response.ok) {
            throw new Error('Network error');
        }

        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Error submitting order:', error);
        return { 
            success: false, 
            error: error.message
        };
    } finally {
        hideLoading();
    }
}

function calculateDeliveryCost() {
    const deliveryOption = document.querySelector('input[name="delivery"]:checked');
    let cost = 0;
    
    if (deliveryOption && deliveryOption.value === 'iskateli') cost = 15;
    if (deliveryOption && deliveryOption.value === 'naryan-mar') cost = 50;
    if (document.getElementById('exact-time').checked) cost += 10;
    
    return cost;
}

function getSelectedServices() {
    const selectedServices = [];
    services.forEach(service => {
        const checkbox = document.getElementById(`service-${service.id}`);
        if (checkbox && checkbox.checked) {
            selectedServices.push({
                id: service.id,
                name: service.name,
                price: service.price
            });
        }
    });
    return selectedServices;
}

// Telegram authentication
function handleTelegramAuth() {
    if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) {
        user = tg.initDataUnsafe.user;
        saveUserToStorage();
        updateUserProfile();
        showNotification(`Добро пожаловать, ${user.first_name || 'пользователь'}!`, 'success');
    } else {
        showNotification('Ошибка авторизации', 'error');
    }
}

function saveUserToStorage() {
    localStorage.setItem('zest_user', JSON.stringify(user));
}

function handleLogout() {
    user = null;
    localStorage.removeItem('zest_user');
    updateUserProfile();
    showNotification('Вы вышли из аккаунта', 'info');
}

function updateUserProfile() {
    const authSection = document.getElementById('auth-section');
    const profileContent = document.getElementById('profile-content');
    const userName = document.getElementById('user-name');
    const userPhone = document.getElementById('user-phone');
    const profileName = document.getElementById('profile-name');
    const profilePhone = document.getElementById('profile-phone');
    const profileUsername = document.getElementById('profile-username');
    const profileId = document.getElementById('profile-id');
    
    if (!authSection || !profileContent) return;
    
    if (user) {
        authSection.classList.add('hidden');
        profileContent.classList.remove('hidden');
        
        if (userName) userName.textContent = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Пользователь';
        if (userPhone) userPhone.textContent = user.phone_number || 'Телефон не указан';
        if (profileName) profileName.textContent = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Не указано';
        if (profilePhone) profilePhone.textContent = user.phone_number || 'Не указан';
        if (profileUsername) profileUsername.textContent = user.username ? `@${user.username}` : 'Не указан';
        if (profileId) profileId.textContent = user.id || 'Не доступен';
        
        const userAvatar = document.getElementById('user-avatar');
        if (userAvatar && user.photo_url) {
            userAvatar.innerHTML = `<img src="${user.photo_url}" alt="Аватар" class="user-avatar-img">`;
        }
    } else {
        authSection.classList.remove('hidden');
        profileContent.classList.add('hidden');
        
        if (userName) userName.textContent = 'Гость';
        if (userPhone) userPhone.textContent = 'Войдите через Telegram';
        const userAvatar = document.getElementById('user-avatar');
        if (userAvatar) {
            userAvatar.innerHTML = `
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                </svg>
            `;
        }
    }
}

// ZeSt Club subscription
function handleSubscription() {
    if (!user) {
        showNotification('Для оформления подписки необходимо войти в аккаунт', 'error');
        switchPage('profile');
        return;
    }
    
    if (confirm('Оформить премиум подписку за 350₽/месяц?')) {
        activateSubscription();
    }
}

function activateSubscription() {
    const expiryDate = getNextMonthDate();
    
    const clubStatus = document.getElementById('club-status');
    const profileClubStatus = document.getElementById('profile-club-status');
    
    if (clubStatus) {
        clubStatus.innerHTML = `<span class="status-text">Статус: Активен до ${expiryDate}</span>`;
        clubStatus.className = 'club-status active';
    }
    
    if (profileClubStatus) {
        profileClubStatus.className = 'club-status-badge active';
        profileClubStatus.innerHTML = `
            <span class="status-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
            </span>
            <span class="status-text">Активен до ${expiryDate}</span>
        `;
    }
    
    localStorage.setItem('zest_club_subscription', JSON.stringify({
        active: true,
        expiry: expiryDate
    }));
    
    showNotification('Премиум подписка активирована!', 'success');
}

function getNextMonthDate() {
    const date = new Date();
    date.setMonth(date.getMonth() + 1);
    return date.toLocaleDateString('ru-RU');
}

function checkSubscriptionStatus() {
    const subscription = localStorage.getItem('zest_club_subscription');
    if (subscription) {
        try {
            const subData = JSON.parse(subscription);
            if (subData.active && new Date(subData.expiry) > new Date()) {
                const clubStatus = document.getElementById('club-status');
                const profileClubStatus = document.getElementById('profile-club-status');
                
                if (clubStatus) {
                    clubStatus.innerHTML = `<span class="status-text">Статус: Активен до ${subData.expiry}</span>`;
                    clubStatus.className = 'club-status active';
                }
                
                if (profileClubStatus) {
                    profileClubStatus.className = 'club-status-badge active';
                    profileClubStatus.innerHTML = `
                        <span class="status-icon">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                            </svg>
                        </span>
                        <span class="status-text">Активен до ${subData.expiry}</span>
                    `;
                }
            }
        } catch (e) {
            console.error('Error parsing subscription data:', e);
        }
    }
}

// Order confirmation
async function confirmOrderHandler() {
    if (cart.length === 0) {
        showNotification('Корзина пуста', 'error');
        return;
    }

    const paymentMethod = document.querySelector('input[name="payment"]:checked');
    if (!paymentMethod) {
        showNotification('Пожалуйста, выберите способ оплаты', 'error');
        return;
    }

    const paymentMethodText = paymentMethod.value === 'cash' ? 'Наличные' : 'Перевод по СБП';
    
    // Validate address for delivery options
    const deliveryOption = document.querySelector('input[name="delivery"]:checked');
    if (deliveryOption && deliveryOption.value !== 'none' && !deliveryAddress) {
        showNotification('Пожалуйста, укажите адрес доставки', 'error');
        switchCartStep(2);
        return;
    }
    
    const confirmButton = document.getElementById('confirm-order');
    const originalText = confirmButton.innerHTML;
    confirmButton.innerHTML = '⌛ Отправка заказа...';
    confirmButton.disabled = true;
    
    try {
        const orderData = {
            userId: user ? user.id : 'guest',
            userName: user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : 'Гость',
            userPhone: user ? user.phone_number : '',
            items: cart,
            deliveryOption: deliveryOption ? deliveryOption.value : 'none',
            deliveryAddress: deliveryAddress,
            deliveryCost: calculateDeliveryCost(),
            paymentMethod: paymentMethodText,
            totalAmount: document.getElementById('final-total').textContent,
            services: getSelectedServices(),
            exactTime: document.getElementById('exact-time').checked,
            exactTimeCost: document.getElementById('exact-time').checked ? 10 : 0,
            timestamp: new Date().toISOString()
        };

        let result;
        
        if (isOnline) {
            result = await submitOrder(orderData);
        } else {
            // В офлайн режиме добавляем в очередь
            addToOfflineQueue({
                type: 'order',
                data: orderData
            });
            result = { success: true, orderId: 'offline-' + Date.now() };
        }
        
        if (result.success) {
            if (isOnline) {
                showNotification(`✅ Заказ #${result.orderId} успешно создан!`, 'success');
            } else {
                showNotification(`📱 Заказ сохранен для отправки при подключении к интернету`, 'info');
            }
            
            // Add to order history
            addToOrderHistory(orderData);
            
            // Clear cart after successful order
            cart = [];
            deliveryAddress = '';
            saveCartToStorage();
            updateCartUI();
            switchPage('catalog');
            
            // Reset form
            const addressInput = document.getElementById('delivery-address');
            if (addressInput) addressInput.value = '';
            
            const selfPickup = document.getElementById('delivery-none');
            if (selfPickup) selfPickup.checked = true;
            
            // Reset services checkboxes
            services.forEach(service => {
                const checkbox = document.getElementById(`service-${service.id}`);
                if (checkbox) checkbox.checked = false;
            });
            
        } else {
            showNotification('❌ Ошибка при создании заказа: ' + result.error, 'error');
        }
    } catch (error) {
        showNotification('❌ Неожиданная ошибка: ' + error.message, 'error');
    } finally {
        confirmButton.innerHTML = originalText;
        confirmButton.disabled = false;
    }
}

// Modal functions
function closeModalHandler() {
    const modal = document.getElementById('product-modal');
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }
}

// Toast notifications
function showNotification(message, type = 'info') {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    // Add to container
    const container = document.getElementById('toast-container');
    if (container) {
        container.appendChild(toast);
        
        // Remove after 3 seconds
        setTimeout(() => {
            toast.style.animation = 'slideInDown 0.3s ease-out reverse';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }
    
    // Also show in Telegram if available
    if (tg && tg.showPopup) {
        tg.showPopup({
            title: type === 'success' ? 'Успешно!' : 
                   type === 'error' ? 'Ошибка' : 'Информация',
            message: message,
            buttons: [{ type: 'ok' }]
        });
    }
}

// Notification permission request
async function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        try {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                console.log('Notification permission granted');
            }
        } catch (error) {
            console.error('Error requesting notification permission:', error);
        }
    }
}

// Send notification
function sendNotification(title, options = {}) {
    if ('Notification' in window && Notification.permission === 'granted') {
        const notification = new Notification(title, {
            icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23FF5A1F"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>',
            badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23FF5A1F"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>',
            ...options
        });
        
        // Auto close after 5 seconds
        setTimeout(() => {
            notification.close();
        }, 5000);
        
        return notification;
    }
}

// Offline functionality
let isOnline = navigator.onLine;
let offlineQueue = [];

/**
 * Проверяет статус подключения к интернету
 * @function checkOnlineStatus
 */
function checkOnlineStatus() {
    isOnline = navigator.onLine;
    updateOfflineIndicator();
    
    if (isOnline && offlineQueue.length > 0) {
        processOfflineQueue();
    }
}

/**
 * Обновляет индикатор офлайн режима
 * @function updateOfflineIndicator
 */
function updateOfflineIndicator() {
    const indicator = document.getElementById('offline-indicator');
    if (!indicator) return;
    
    if (isOnline) {
        indicator.classList.add('hidden');
    } else {
        indicator.classList.remove('hidden');
    }
}

/**
 * Добавляет действие в очередь офлайн режима
 * @param {Object} action - Действие для выполнения
 * @function addToOfflineQueue
 */
function addToOfflineQueue(action) {
    offlineQueue.push({
        ...action,
        timestamp: Date.now()
    });
    
    // Сохраняем в localStorage
    localStorage.setItem('zest_offline_queue', JSON.stringify(offlineQueue));
}

/**
 * Обрабатывает очередь офлайн действий
 * @async
 * @function processOfflineQueue
 */
async function processOfflineQueue() {
    if (!isOnline || offlineQueue.length === 0) return;
    
    showNotification('Синхронизация данных...', 'info');
    
    const queue = [...offlineQueue];
    offlineQueue = [];
    
    for (const action of queue) {
        try {
            if (action.type === 'order') {
                const result = await submitOrder(action.data);
                if (result.success) {
                    addToOrderHistory(action.data);
                }
            }
        } catch (error) {
            console.error('Error processing offline action:', error);
            // Возвращаем в очередь при ошибке
            offlineQueue.push(action);
        }
    }
    
    // Сохраняем обновленную очередь
    localStorage.setItem('zest_offline_queue', JSON.stringify(offlineQueue));
    
    if (offlineQueue.length === 0) {
        showNotification('Данные синхронизированы', 'success');
    }
}

/**
 * Загружает очередь офлайн действий из localStorage
 * @function loadOfflineQueue
 */
function loadOfflineQueue() {
    const savedQueue = localStorage.getItem('zest_offline_queue');
    if (savedQueue) {
        try {
            offlineQueue = JSON.parse(savedQueue);
        } catch (e) {
            offlineQueue = [];
        }
    }
}

/**
 * Показывает индикатор офлайн режима
 * @function showOfflineIndicator
 */
function showOfflineIndicator() {
    // Создаем индикатор если его нет
    let indicator = document.getElementById('offline-indicator');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'offline-indicator';
        indicator.className = 'offline-indicator hidden';
        indicator.innerHTML = `
            <div class="offline-content">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18.364 5.636l-12.728 12.728m0-12.728l12.728 12.728"/>
                </svg>
                <span>Нет подключения к интернету</span>
            </div>
        `;
        document.body.appendChild(indicator);
    }
    
    updateOfflineIndicator();
}

// Order History Management
function loadOrderHistoryFromStorage() {
    const savedHistory = localStorage.getItem('zest_order_history');
    if (savedHistory) {
        try {
            orderHistory = JSON.parse(savedHistory);
        } catch (e) {
            orderHistory = [];
        }
    }
}

function saveOrderHistoryToStorage() {
    localStorage.setItem('zest_order_history', JSON.stringify(orderHistory));
}

function addToOrderHistory(orderData) {
    const order = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        status: 'pending',
        ...orderData
    };
    
    orderHistory.unshift(order); // Add to beginning
    saveOrderHistoryToStorage();
    updateOrdersPage();
}

function updateOrdersPage() {
    const ordersList = document.getElementById('orders-list');
    if (!ordersList) return;
    
    if (orderHistory.length === 0) {
        ordersList.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
                    </svg>
                </span>
                <p>У вас пока нет заказов</p>
                <button class="btn-secondary go-to-catalog">Перейти в каталог</button>
            </div>
        `;
        return;
    }
    
    ordersList.innerHTML = '';
    
    orderHistory.forEach(order => {
        const orderElement = document.createElement('div');
        orderElement.className = 'order-item-card';
        orderElement.innerHTML = `
            <div class="order-header">
                <div class="order-info">
                    <h4>Заказ #${order.id.slice(-6)}</h4>
                    <p class="order-date">${new Date(order.timestamp).toLocaleDateString('ru-RU')}</p>
                </div>
                <div class="order-status ${order.status}">
                    ${getStatusText(order.status)}
                </div>
            </div>
            <div class="order-items-preview">
                ${order.items.slice(0, 2).map(item => `
                    <div class="order-item-preview">
                        <span>${item.name}</span>
                        <span>×${item.quantity}</span>
                    </div>
                `).join('')}
                ${order.items.length > 2 ? `<div class="order-more-items">+${order.items.length - 2} товаров</div>` : ''}
            </div>
            <div class="order-total">
                <span>Итого:</span>
                <span class="order-amount">${order.totalAmount}₽</span>
            </div>
            <div class="order-actions">
                <button class="btn-secondary" onclick="viewOrderDetails('${order.id}')">Подробнее</button>
                ${order.status === 'pending' ? `<button class="btn-primary" onclick="repeatOrder('${order.id}')">Повторить заказ</button>` : ''}
            </div>
        `;
        ordersList.appendChild(orderElement);
    });
}

function getStatusText(status) {
    const statusMap = {
        'pending': 'В обработке',
        'confirmed': 'Подтвержден',
        'preparing': 'Готовится',
        'ready': 'Готов к выдаче',
        'delivered': 'Доставлен',
        'cancelled': 'Отменен'
    };
    return statusMap[status] || 'Неизвестно';
}

function viewOrderDetails(orderId) {
    const order = orderHistory.find(o => o.id === orderId);
    if (!order) return;
    
    const modal = document.getElementById('product-modal');
    const modalContent = document.getElementById('modal-product-content');
    
    if (modal && modalContent) {
        modalContent.innerHTML = `
            <div class="order-details">
                <h3>Заказ #${order.id.slice(-6)}</h3>
                <div class="order-detail-section">
                    <h4>Информация о заказе</h4>
                    <div class="detail-item">
                        <span>Дата:</span>
                        <span>${new Date(order.timestamp).toLocaleString('ru-RU')}</span>
                    </div>
                    <div class="detail-item">
                        <span>Статус:</span>
                        <span class="order-status ${order.status}">${getStatusText(order.status)}</span>
                    </div>
                    <div class="detail-item">
                        <span>Способ оплаты:</span>
                        <span>${order.paymentMethod}</span>
                    </div>
                    ${order.deliveryAddress ? `
                        <div class="detail-item">
                            <span>Адрес доставки:</span>
                            <span>${order.deliveryAddress}</span>
                        </div>
                    ` : ''}
                </div>
                
                <div class="order-detail-section">
                    <h4>Товары</h4>
                    ${order.items.map(item => `
                        <div class="order-item-detail">
                            <span>${item.name} ${item.volume ? `(${item.volume})` : ''}</span>
                            <span>${item.quantity} × ${item.price}₽ = ${item.quantity * item.price}₽</span>
                        </div>
                    `).join('')}
                </div>
                
                ${order.services && order.services.length > 0 ? `
                    <div class="order-detail-section">
                        <h4>Дополнительные услуги</h4>
                        ${order.services.map(service => `
                            <div class="order-service-detail">
                                <span>${service.name}</span>
                                <span>${service.price}₽</span>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
                
                <div class="order-detail-section">
                    <div class="order-total-detail">
                        <span>Итого:</span>
                        <span class="order-amount">${order.totalAmount}₽</span>
                    </div>
                </div>
            </div>
        `;
        
        modal.classList.remove('hidden');
    }
}

function repeatOrder(orderId) {
    const order = orderHistory.find(o => o.id === orderId);
    if (!order) return;
    
    // Clear current cart
    cart = [];
    
    // Add items from the order to cart
    order.items.forEach(item => {
        addToCart(item.productId, item.quantity);
    });
    
    // Switch to cart page
    switchPage('cart');
    showNotification('Товары добавлены в корзину', 'success');
}

/**
 * Загружает демо-данные для тестирования
 * @function loadDemoData
 */
function loadDemoData() {
    products = getDemoProducts();
    services = getDemoServices();
    currentProducts = [...products];
    
    // Очищаем кэш, чтобы загрузить свежие данные
    localStorage.removeItem('zest_products_cache');
    localStorage.removeItem('zest_services_cache');
    
    renderProducts();
    renderServices();
    showNotification('Демо-данные загружены', 'success');
}

/**
 * Тестирует подключение к бэкенду
 * @async
 * @function testBackendConnection
 */
async function testBackendConnection() {
    try {
        showNotification('Тестирование подключения...', 'info');
        
        const response = await fetch(`${BACKEND_URL}?action=test`, {
            method: 'GET',
            headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        });
        
        if (response.ok) {
            const data = await response.text();
            showNotification('✅ Подключение к бэкенду работает!', 'success');
            console.log('Backend test response:', data);
        } else {
            showNotification(`❌ Ошибка подключения: ${response.status}`, 'error');
        }
    } catch (error) {
        showNotification(`❌ Ошибка подключения: ${error.message}`, 'error');
        console.error('Backend connection test failed:', error);
    }
}

// Make functions available globally
window.addToCart = addToCart;
window.updateCartItemQuantity = updateCartItemQuantity;
window.removeFromCart = removeFromCart;
window.toggleWishlist = toggleWishlist;
window.closeModal = closeModalHandler;
window.switchPage = switchPage;
window.loadDemoData = loadDemoData;
window.testBackendConnection = testBackendConnection;

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initApp();
});