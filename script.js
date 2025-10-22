// script.js
// Telegram WebApp initialization
const tg = window.Telegram.WebApp;
let cart = [];
let user = null;
let products = [];
let services = [];
let currentPage = 'catalog';
let deliveryAddress = '';

// Backend configuration - ЗАМЕНИТЕ НА ВАШ РЕАЛЬНЫЙ URL
const BACKEND_URL = 'https://script.google.com/macros/s/AKfycbwzA-ihgC3jTm4PK0oHFWvMrAFedsD6rDWTqe8Asy5vsHcY0-RE72SAT6kF_LQ6i_DL/exec';

// Initialize the app
async function initApp() {
    console.log('Initializing ZeSt app...');
    
    // Initialize Telegram WebApp
    if (tg) {
        tg.expand();
        tg.enableClosingConfirmation();
        tg.setHeaderColor('#FF5A1F');
        tg.setBackgroundColor('#FFFFFF');
    } else {
        console.warn('Telegram WebApp not available');
    }
    
    // Check if user is already authenticated
    const savedUser = localStorage.getItem('zest_user');
    if (savedUser) {
        try {
            user = JSON.parse(savedUser);
            updateUserProfile();
        } catch (e) {
            console.error('Error parsing user data:', e);
            localStorage.removeItem('zest_user');
        }
    }
    
    // Check age verification
    const ageVerified = localStorage.getItem('ageVerified');
    console.log('Age verification status:', ageVerified);
    
    if (ageVerified === 'true') {
        showMainApp();
    } else {
        showAgeVerification();
    }
    
    // Test backend connection first
    const isBackendConnected = await testBackendConnection();
    if (!isBackendConnected) {
        console.warn('Backend is not available, using demo mode');
        if (tg && tg.showPopup) {
            tg.showPopup({
                title: 'Демо-режим',
                message: 'Сервер временно недоступен. Приложение работает в демо-режиме.',
                buttons: [{ type: 'ok' }]
            });
        }
    }
    
    // Load products and services
    loadProducts();
    loadServices();
    
    // Setup event listeners
    setupEventListeners();
    
    // Initialize cart from localStorage
    loadCartFromStorage();
    updateCartUI();
    
    // Check subscription status
    checkSubscriptionStatus();
    
    console.log('ZeSt app initialized successfully');
}

// Test backend connection
async function testBackendConnection() {
    try {
        console.log('Testing connection to:', BACKEND_URL);
        
        // Если URL не настроен, сразу возвращаем false
        if (BACKEND_URL.includes('YOUR_SCRIPT_ID')) {
            console.log('Backend URL not configured, using demo mode');
            return false;
        }
        
        const response = await fetch(`${BACKEND_URL}?action=getProducts`);
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Backend connection successful');
            return true;
        } else {
            console.log('❌ Backend connection failed:', response.status);
            return false;
        }
    } catch (error) {
        console.log('❌ Backend connection error:', error.message);
        return false;
    }
}

// Age verification
function showAgeVerification() {
    console.log('Showing age verification');
    const ageVerification = document.getElementById('age-verification');
    const app = document.getElementById('app');
    
    if (ageVerification) ageVerification.classList.remove('hidden');
    if (app) app.classList.add('hidden');
}

function showMainApp() {
    console.log('Showing main app');
    const ageVerification = document.getElementById('age-verification');
    const app = document.getElementById('app');
    
    if (ageVerification) ageVerification.classList.add('hidden');
    if (app) app.classList.remove('hidden');
}

// Event listeners setup
function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    // Age verification
    const ageConfirm = document.getElementById('age-confirm');
    const ageDeny = document.getElementById('age-deny');
    
    if (ageConfirm) {
        ageConfirm.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Age confirmed');
            localStorage.setItem('ageVerified', 'true');
            showMainApp();
        });
    } else {
        console.error('Age confirm button not found');
    }
    
    if (ageDeny) {
        ageDeny.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Age denied');
            if (tg && tg.showPopup) {
                tg.showPopup({
                    title: 'Доступ запрещен',
                    message: 'Извините, доступ к магазину разрешен только с 18 лет',
                    buttons: [{ type: 'close' }]
                });
            } else {
                alert('Извините, доступ к магазину разрешен только с 18 лет');
            }
        });
    } else {
        console.error('Age deny button not found');
    }
    
    // Bottom Navigation
    const navButtons = document.querySelectorAll('.bottom-navigation .nav-btn');
    navButtons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const page = this.getAttribute('data-page');
            console.log('Navigation to:', page);
            switchPage(page);
        });
    });
    
    // Header cart button
    const cartIndicator = document.getElementById('cart-indicator');
    if (cartIndicator) {
        cartIndicator.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Cart indicator clicked');
            switchPage('cart');
        });
    }
    
    // Go to catalog buttons
    const goToCatalogButtons = document.querySelectorAll('.go-to-catalog');
    goToCatalogButtons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            switchPage('catalog');
        });
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
    if (telegramAuth) {
        telegramAuth.addEventListener('click', handleTelegramAuth);
    }
    
    // Logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // Order confirmation
    const confirmOrder = document.getElementById('confirm-order');
    if (confirmOrder) {
        confirmOrder.addEventListener('click', confirmOrderHandler);
    }
    
    // Modal
    const closeModal = document.getElementById('close-modal');
    if (closeModal) {
        closeModal.addEventListener('click', closeModalHandler);
    }
    
    // Search functionality
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', filterProducts);
    }
    
    // Filter buttons
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            filterButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            filterProducts();
        });
    });
    
    // ZeSt Club subscription
    const subscribeBtn = document.getElementById('subscribe-btn');
    const manageSubscription = document.getElementById('manage-subscription');
    
    if (subscribeBtn) subscribeBtn.addEventListener('click', handleSubscription);
    if (manageSubscription) manageSubscription.addEventListener('click', handleSubscription);
    
    // Delivery options change
    const deliveryOptions = document.querySelectorAll('input[name="delivery"]');
    deliveryOptions.forEach(option => {
        option.addEventListener('change', handleDeliveryOptionChange);
    });
    
    // Address input change
    const addressInput = document.getElementById('delivery-address');
    if (addressInput) {
        addressInput.addEventListener('input', handleAddressChange);
    }
    
    console.log('Event listeners setup completed');
}

// Delivery option change handler
function handleDeliveryOptionChange() {
    const selectedOption = document.querySelector('input[name="delivery"]:checked');
    const addressSection = document.getElementById('address-section');
    const toStep3Button = document.getElementById('to-step-3');
    
    if (selectedOption && selectedOption.value !== 'none') {
        // Show address section for delivery options
        addressSection.classList.remove('hidden');
        // Disable proceed button until address is filled
        toStep3Button.disabled = true;
    } else {
        // Hide address section for self-pickup
        addressSection.classList.add('hidden');
        // Enable proceed button for self-pickup
        toStep3Button.disabled = false;
    }
    
    // Update order summary preview
    updateOrderSummary();
}

// Address input change handler
function handleAddressChange() {
    const addressInput = document.getElementById('delivery-address');
    const toStep3Button = document.getElementById('to-step-3');
    
    if (addressInput) {
        deliveryAddress = addressInput.value.trim();
        // Enable/disable proceed button based on address input
        const selectedOption = document.querySelector('input[name="delivery"]:checked');
        if (selectedOption && selectedOption.value !== 'none') {
            toStep3Button.disabled = !deliveryAddress;
        }
    }
}

// Page navigation
function switchPage(pageName) {
    console.log('Switching to page:', pageName);
    currentPage = pageName;
    
    // Update bottom navigation
    document.querySelectorAll('.bottom-navigation .nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const activeNavBtn = document.querySelector(`.bottom-navigation [data-page="${pageName}"]`);
    if (activeNavBtn) {
        activeNavBtn.classList.add('active');
    }
    
    // Update pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    const activePage = document.getElementById(`${pageName}-page`);
    if (activePage) {
        activePage.classList.add('active');
    }
    
    // Special handling for cart page
    if (pageName === 'cart') {
        switchCartStep(1);
    }
}

// Cart functionality
function loadCartFromStorage() {
    const savedCart = localStorage.getItem('zest_cart');
    if (savedCart) {
        try {
            cart = JSON.parse(savedCart);
        } catch (e) {
            console.error('Error parsing cart data:', e);
            cart = [];
        }
    }
}

function saveCartToStorage() {
    localStorage.setItem('zest_cart', JSON.stringify(cart));
}

function addToCart(productId, quantity = 1) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    const existingItem = cart.find(item => item.productId === productId);
    
    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        cart.push({
            productId: productId,
            quantity: quantity,
            name: product.name,
            price: product.price,
            image: product.image
        });
    }
    
    saveCartToStorage();
    updateCartUI();
    
    if (tg && tg.showPopup) {
        tg.showPopup({
            title: 'Добавлено в корзину',
            message: `${product.name} добавлен в корзину`,
            buttons: [{ type: 'ok' }]
        });
    }
}

function updateCartItemQuantity(productId, newQuantity) {
    if (newQuantity <= 0) {
        removeFromCart(productId);
        return;
    }
    
    const item = cart.find(item => item.productId === productId);
    if (item) {
        item.quantity = newQuantity;
        saveCartToStorage();
        updateCartUI();
    }
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.productId !== productId);
    saveCartToStorage();
    updateCartUI();
}

function updateCartUI() {
    // Update cart count in header
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const cartCount = document.getElementById('cart-count');
    const bottomCartCount = document.getElementById('bottom-cart-count');
    
    if (cartCount) cartCount.textContent = totalItems;
    if (bottomCartCount) bottomCartCount.textContent = totalItems;
    
    // Update cart page
    updateCartPage();
    
    // Enable/disable proceed button
    const toStep2 = document.getElementById('to-step-2');
    if (toStep2) toStep2.disabled = totalItems === 0;
}

function updateCartPage() {
    const cartItemsContainer = document.getElementById('cart-items');
    const totalPriceElement = document.getElementById('cart-total-price');
    
    if (!cartItemsContainer || !totalPriceElement) return;
    
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<div class="empty-state"><span class="empty-icon">🛒</span><p>Корзина пуста</p></div>';
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
            <div class="cart-item-image">${item.image || '🥤'}</div>
            <div class="cart-item-info">
                <div class="cart-item-name">${item.name}</div>
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

// Cart steps
function switchCartStep(step) {
    // Update steps indicator
    document.querySelectorAll('.step').forEach(stepEl => {
        stepEl.classList.remove('active');
    });
    const activeStep = document.querySelector(`[data-step="${step}"]`);
    if (activeStep) activeStep.classList.add('active');
    
    // Update steps content
    document.querySelectorAll('.cart-step').forEach(stepContent => {
        stepContent.classList.remove('active');
    });
    const activeStepContent = document.getElementById(`cart-step-${step}`);
    if (activeStepContent) activeStepContent.classList.add('active');
    
    // Reset address validation when going back to step 2
    if (step === 2) {
        handleDeliveryOptionChange();
    }
    
    // Update order summary for step 3
    if (step === 3) {
        updateOrderSummary();
    }
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
                <span>${item.name} × ${item.quantity}</span>
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
        
        // Add exact time cost
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
        
        // Add address to summary if provided
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
    
    // Add payment method to summary
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

// Product management - UPDATED FOR GOOGLE SHEETS
async function loadProducts() {
    try {
        console.log('Loading products from:', `${BACKEND_URL}?action=getProducts`);
        
        // Если URL не настроен, используем мок данные
        if (BACKEND_URL.includes('YOUR_SCRIPT_ID')) {
            throw new Error('Backend URL not configured');
        }
        
        const response = await fetch(`${BACKEND_URL}?action=getProducts`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Проверяем, если пришла ошибка
        if (data.error) {
            throw new Error(data.error);
        }
        
        products = data;
        console.log('Products loaded:', products.length);
        renderProducts();
    } catch (error) {
        console.error('Error loading products:', error);
        // Fallback mock data
        products = getMockProducts();
        renderProducts();
    }
}

function filterProducts() {
    const searchInput = document.getElementById('search-input');
    if (!searchInput) return;
    
    const searchTerm = searchInput.value.toLowerCase();
    const activeFilter = document.querySelector('.filter-btn.active');
    const activeCategory = activeFilter ? activeFilter.dataset.category : 'all';
    
    const filteredProducts = products.filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(searchTerm);
        const matchesCategory = activeCategory === 'all' || product.category === activeCategory;
        return matchesSearch && matchesCategory;
    });
    
    renderProducts(filteredProducts);
}

function renderProducts(productsToRender = products) {
    const grid = document.getElementById('products-grid');
    if (!grid) return;
    
    if (productsToRender.length === 0) {
        grid.innerHTML = '<div class="loading">Товары не найдены</div>';
        return;
    }
    
    grid.innerHTML = '';
    
    productsToRender.forEach(product => {
        const cartItem = cart.find(item => item.productId === product.id);
        const quantity = cartItem ? cartItem.quantity : 0;
        
        const productElement = document.createElement('div');
        productElement.className = 'product-card';
        productElement.innerHTML = `
            <div class="product-image">${product.image || '🥤'}</div>
            <div class="product-name">${product.name}</div>
            <div class="product-price">${product.price}₽</div>
            <div class="product-actions">
                ${quantity === 0 ? 
                    `<button class="btn-primary" onclick="addToCart('${product.id}', 1)">
                        <span class="btn-glow"></span>
                        В корзину
                    </button>` :
                    `<div class="quantity-controls">
                        <button class="quantity-btn" onclick="updateCartItemQuantity('${product.id}', ${quantity - 1})">-</button>
                        <span class="quantity-display">${quantity}</span>
                        <button class="quantity-btn" onclick="updateCartItemQuantity('${product.id}', ${quantity + 1})">+</button>
                    </div>`
                }
            </div>
        `;
        grid.appendChild(productElement);
    });
}

// Services management - UPDATED FOR GOOGLE SHEETS
async function loadServices() {
    try {
        console.log('Loading services from:', `${BACKEND_URL}?action=getServices`);
        
        // Если URL не настроен, используем мок данные
        if (BACKEND_URL.includes('YOUR_SCRIPT_ID')) {
            throw new Error('Backend URL not configured');
        }
        
        const response = await fetch(`${BACKEND_URL}?action=getServices`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Проверяем, если пришла ошибка
        if (data.error) {
            throw new Error(data.error);
        }
        
        services = data;
        console.log('Services loaded:', services.length);
        renderServices();
    } catch (error) {
        console.error('Error loading services:', error);
        // Fallback mock data
        services = getMockServices();
        renderServices();
    }
}

function renderServices() {
    const servicesList = document.getElementById('services-list');
    if (!servicesList) return;
    
    servicesList.innerHTML = '';
    
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
    });
}

// Fallback order submission for demo
function submitOrderDemo(orderData) {
    return new Promise((resolve) => {
        setTimeout(() => {
            const orderId = 'DEMO_' + Date.now();
            console.log('📦 Demo order created:', orderId, orderData);
            resolve({
                success: true,
                orderId: orderId,
                message: 'Заказ создан в демо-режиме'
            });
        }, 1000);
    });
}

// Order submission - IMPROVED ERROR HANDLING
async function submitOrder(orderData) {
    // Если BACKEND_URL не настроен, используем демо-режим
    if (BACKEND_URL.includes('YOUR_SCRIPT_ID')) {
        console.log('🔄 Using demo mode (BACKEND_URL not configured)');
        return await submitOrderDemo(orderData);
    }
    
    try {
        console.log('🔄 Submitting order to:', BACKEND_URL);
        console.log('Order data:', orderData);

        // Добавляем таймаут для запроса
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 секунд таймаут

        const response = await fetch(`${BACKEND_URL}?action=createOrder`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(orderData),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);

        if (!response.ok) {
            let errorText = 'Network error';
            try {
                errorText = await response.text();
            } catch (e) {
                errorText = `HTTP ${response.status}: ${response.statusText}`;
            }
            throw new Error(errorText);
        }

        const result = await response.json();
        console.log('Order submission result:', result);

        if (result.error) {
            throw new Error(result.error);
        }

        return result;
    } catch (error) {
        console.error('❌ Error submitting order:', error);
        
        if (error.name === 'AbortError') {
            return { 
                success: false, 
                error: 'Request timeout: Server took too long to respond',
                orderId: 'DEMO_' + Date.now()
            };
        }
        
        if (error.message.includes('Failed to fetch')) {
            return { 
                success: false, 
                error: 'Network error: Cannot connect to server. Please check your internet connection and try again.',
                orderId: 'DEMO_' + Date.now()
            };
        }
        
        return { 
            success: false, 
            error: error.message,
            orderId: 'DEMO_' + Date.now()
        };
    }
}

function calculateDeliveryCost() {
    const deliveryOption = document.querySelector('input[name="delivery"]:checked');
    let cost = 0;
    
    if (deliveryOption.value === 'iskateli') cost = 15;
    if (deliveryOption.value === 'naryan-mar') cost = 50;
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
        
        if (tg.showPopup) {
            tg.showPopup({
                title: 'Успешная авторизация!',
                message: `Добро пожаловать, ${user.first_name || 'пользователь'}!`,
                buttons: [{ type: 'ok' }]
            });
        }
    } else {
        if (tg && tg.showPopup) {
            tg.showPopup({
                title: 'Ошибка авторизации',
                message: 'Не удалось получить данные пользователя. Пожалуйста, попробуйте еще раз.',
                buttons: [{ type: 'close' }]
            });
        }
    }
}

function saveUserToStorage() {
    localStorage.setItem('zest_user', JSON.stringify(user));
}

function handleLogout() {
    if (tg && tg.showPopup) {
        tg.showPopup({
            title: 'Выход из аккаунта',
            message: 'Вы уверены, что хотите выйти?',
            buttons: [
                {
                    type: 'destructive',
                    text: 'Выйти',
                    id: 'logout'
                },
                {
                    type: 'cancel',
                    id: 'cancel'
                }
            ]
        });
        
        tg.onEvent('popupClosed', (data) => {
            if (data.button_id === 'logout') {
                user = null;
                localStorage.removeItem('zest_user');
                updateUserProfile();
                
                if (tg.showPopup) {
                    tg.showPopup({
                        title: 'Вы вышли из аккаунта',
                        message: 'Для доступа к персональным функциям войдите снова',
                        buttons: [{ type: 'ok' }]
                    });
                }
            }
        });
    } else {
        user = null;
        localStorage.removeItem('zest_user');
        updateUserProfile();
        alert('Вы вышли из аккаунта');
    }
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
        // User is logged in
        authSection.classList.add('hidden');
        profileContent.classList.remove('hidden');
        
        // Update user info
        if (userName) userName.textContent = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Пользователь';
        if (userPhone) userPhone.textContent = user.phone_number || 'Телефон не указан';
        
        // Update profile details
        if (profileName) profileName.textContent = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Не указано';
        if (profilePhone) profilePhone.textContent = user.phone_number || 'Не указан';
        if (profileUsername) profileUsername.textContent = user.username ? `@${user.username}` : 'Не указан';
        if (profileId) profileId.textContent = user.id || 'Не доступен';
        
        // Update avatar with user photo if available
        const userAvatar = document.getElementById('user-avatar');
        if (userAvatar && user.photo_url) {
            userAvatar.innerHTML = `<img src="${user.photo_url}" alt="Аватар" class="user-avatar-img">`;
        }
    } else {
        // User is not logged in
        authSection.classList.remove('hidden');
        profileContent.classList.add('hidden');
        
        // Reset user info
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
        if (tg && tg.showPopup) {
            tg.showPopup({
                title: 'Требуется авторизация',
                message: 'Для оформления подписки необходимо войти в аккаунт',
                buttons: [{ type: 'ok' }]
            });
        }
        switchPage('profile');
        return;
    }
    
    if (tg && tg.showPopup) {
        tg.showPopup({
            title: 'ZeSt Club',
            message: 'Оформление премиум подписки за 350₽/месяц',
            buttons: [
                {
                    type: 'default',
                    text: 'Оформить',
                    id: 'subscribe'
                },
                {
                    type: 'cancel',
                    id: 'cancel'
                }
            ]
        });
        
        tg.onEvent('popupClosed', (data) => {
            if (data.button_id === 'subscribe') {
                activateSubscription();
            }
        });
    } else {
        if (confirm('Оформить премиум подписку за 350₽/месяц?')) {
            activateSubscription();
        }
    }
}

function activateSubscription() {
    const expiryDate = getNextMonthDate();
    
    // Update club status
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
    
    // Save subscription status
    localStorage.setItem('zest_club_subscription', JSON.stringify({
        active: true,
        expiry: expiryDate
    }));
    
    if (tg && tg.showPopup) {
        tg.showPopup({
            title: 'Успешно!',
            message: 'Премиум подписка активирована',
            buttons: [{ type: 'ok' }]
        });
    }
}

function getNextMonthDate() {
    const date = new Date();
    date.setMonth(date.getMonth() + 1);
    return date.toLocaleDateString('ru-RU');
}

// Check subscription status on app load
function checkSubscriptionStatus() {
    const subscription = localStorage.getItem('zest_club_subscription');
    if (subscription) {
        try {
            const subData = JSON.parse(subscription);
            if (subData.active && new Date(subData.expiry) > new Date()) {
                // Subscription is active
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

// Order confirmation - IMPROVED WITH BETTER ERROR HANDLING
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
    
    // Показываем индикатор загрузки
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
            deliveryOption: deliveryOption.value,
            deliveryAddress: deliveryAddress,
            deliveryCost: calculateDeliveryCost(),
            paymentMethod: paymentMethodText,
            totalAmount: document.getElementById('final-total').textContent,
            services: getSelectedServices(),
            exactTime: document.getElementById('exact-time').checked,
            exactTimeCost: document.getElementById('exact-time').checked ? 10 : 0
        };

        console.log('📦 Sending order data:', orderData);
        const result = await submitOrder(orderData);
        
        if (result.success) {
            showNotification(`✅ Заказ #${result.orderId} успешно создан! Способ оплаты: ${paymentMethodText}`, 'success');
            
            // Clear cart after successful order
            cart = [];
            deliveryAddress = '';
            saveCartToStorage();
            updateCartUI();
            switchPage('catalog');
            
            // Reset address field
            const addressInput = document.getElementById('delivery-address');
            if (addressInput) {
                addressInput.value = '';
            }
            
            // Reset delivery option
            const selfPickup = document.getElementById('delivery-none');
            if (selfPickup) {
                selfPickup.checked = true;
            }
            
        } else {
            // Если заказ не отправился, но у нас есть demo orderId, все равно очищаем корзину
            if (result.orderId && result.orderId.startsWith('DEMO_')) {
                showNotification(`⚠️ Заказ #${result.orderId} создан в демо-режиме. ${result.error}`, 'warning');
                
                // Clear cart anyway for demo mode
                cart = [];
                deliveryAddress = '';
                saveCartToStorage();
                updateCartUI();
                switchPage('catalog');
                
                // Reset form
                const addressInput = document.getElementById('delivery-address');
                if (addressInput) {
                    addressInput.value = '';
                }
            } else {
                showNotification('❌ Ошибка при создании заказа: ' + result.error, 'error');
            }
        }
    } catch (error) {
        console.error('Unexpected error in confirmOrderHandler:', error);
        showNotification('❌ Неожиданная ошибка: ' + error.message, 'error');
    } finally {
        // Восстанавливаем кнопку в любом случае
        confirmButton.innerHTML = originalText;
        confirmButton.disabled = false;
    }
}

function showNotification(message, type = 'info') {
    if (tg && tg.showPopup) {
        tg.showPopup({
            title: type === 'success' ? 'Успешно!' : 
                   type === 'error' ? 'Ошибка' : 
                   type === 'warning' ? 'Внимание' : 'Информация',
            message: message,
            buttons: [{ type: 'ok' }]
        });
    } else {
        alert(message);
    }
}

// Modal functions
function openModal(content) {
    const modal = document.getElementById('product-modal');
    const modalContent = document.getElementById('modal-product-content');
    if (modal && modalContent) {
        modalContent.innerHTML = content;
        modal.classList.remove('hidden');
    }
}

function closeModalHandler() {
    const modal = document.getElementById('product-modal');
    if (modal) modal.classList.add('hidden');
}

// Mock data (for development)
function getMockProducts() {
    return [
        {
            id: '1',
            name: 'Red Bull',
            price: 150,
            image: '🔴',
            category: 'energy'
        },
        {
            id: '2',
            name: 'Burn',
            price: 120,
            image: '🔥',
            category: 'energy'
        },
        {
            id: '3',
            name: 'Coca-Cola',
            price: 80,
            image: '🥤',
            category: 'soft'
        },
        {
            id: '4',
            name: 'Adrenaline Rush',
            price: 130,
            image: '⚡',
            category: 'energy'
        },
        {
            id: '5',
            name: 'Aqua Minerale',
            price: 50,
            image: '💧',
            category: 'water'
        },
        {
            id: '6',
            name: 'Monster',
            price: 160,
            image: '👹',
            category: 'energy'
        }
    ];
}

function getMockServices() {
    return [
        {
            id: '1',
            name: 'Холодная доставка',
            price: 20,
            type: 'delivery'
        },
        {
            id: '2',
            name: 'Подарочная упаковка',
            price: 30,
            type: 'packaging'
        },
        {
            id: '3',
            name: 'Срочная доставка',
            price: 50,
            type: 'delivery'
        }
    ];
}

// Make functions available globally for onclick handlers
window.addToCart = addToCart;
window.updateCartItemQuantity = updateCartItemQuantity;
window.removeFromCart = removeFromCart;
window.openModal = openModal;
window.closeModal = closeModalHandler;
window.switchPage = switchPage;

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded, initializing app...');
    initApp();
});





