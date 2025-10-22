// script.js
// Telegram WebApp initialization
const tg = window.Telegram.WebApp;
let cart = [];
let user = null;
let products = [];
let services = [];
let currentPage = 'catalog';
let deliveryAddress = '';

// Google Apps Script URL - ЗАМЕНИТЕ НА ВАШ URL
const BACKEND_URL = 'https://script.google.com/macros/s/AKfycbyFyHGh_ukTdyVFG7Z2duQ6K6qxtNiNpcLQ4mF3bvYmc_VAtYU9LuOkeDzNajcQk_2V/exec';

// Initialize the app
async function initApp() {
    console.log('Initializing ZeSt app...');
    
    // Initialize Telegram WebApp
    if (tg) {
        tg.expand();
        tg.enableClosingConfirmation();
        tg.setHeaderColor('#FF5A1F');
        tg.setBackgroundColor('#FFFFFF');
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
    
    // Load products and services from Google Sheets
    await loadProducts();
    await loadServices();
    
    // Setup event listeners
    setupEventListeners();
    
    // Initialize cart from localStorage
    loadCartFromStorage();
    updateCartUI();
    
    // Check subscription status
    checkSubscriptionStatus();
}

// Age verification
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
    
    // Modal
    const closeModal = document.getElementById('close-modal');
    if (closeModal) closeModal.addEventListener('click', closeModalHandler);
    
    // Search and filters
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.addEventListener('input', filterProducts);
    
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            filterProducts();
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
    
    // Address input
    const addressInput = document.getElementById('delivery-address');
    if (addressInput) addressInput.addEventListener('input', handleAddressChange);
}

// Delivery option change handler
function handleDeliveryOptionChange() {
    const selectedOption = document.querySelector('input[name="delivery"]:checked');
    const addressSection = document.getElementById('address-section');
    const toStep3Button = document.getElementById('to-step-3');
    
    if (selectedOption && selectedOption.value !== 'none') {
        addressSection.classList.remove('hidden');
        toStep3Button.disabled = true;
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
            cart = [];
        }
    }
}

function saveCartToStorage() {
    localStorage.setItem('zest_cart', JSON.stringify(cart));
}

function addToCart(productId, quantity = 1) {
    const product = products.find(p => p.id == productId);
    if (!product) return;
    
    const existingItem = cart.find(item => item.productId == productId);
    
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
    showNotification(`${product.name} добавлен в корзину`, 'success');
}

function updateCartItemQuantity(productId, newQuantity) {
    if (newQuantity <= 0) {
        removeFromCart(productId);
        return;
    }
    
    const item = cart.find(item => item.productId == productId);
    if (item) {
        item.quantity = newQuantity;
        saveCartToStorage();
        updateCartUI();
    }
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.productId != productId);
    saveCartToStorage();
    updateCartUI();
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
    document.querySelectorAll('.step').forEach(stepEl => {
        stepEl.classList.remove('active');
    });
    const activeStep = document.querySelector(`[data-step="${step}"]`);
    if (activeStep) activeStep.classList.add('active');
    
    document.querySelectorAll('.cart-step').forEach(stepContent => {
        stepContent.classList.remove('active');
    });
    const activeStepContent = document.getElementById(`cart-step-${step}`);
    if (activeStepContent) activeStepContent.classList.add('active');
    
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

// Product management from Google Sheets
async function loadProducts() {
    try {
        const response = await fetch(`${BACKEND_URL}?action=getProducts`);
        if (response.ok) {
            const data = await response.json();
            products = data;
            renderProducts();
        } else {
            throw new Error('Failed to load products');
        }
    } catch (error) {
        console.error('Error loading products:', error);
        showNotification('Ошибка загрузки товаров', 'error');
        // Fallback to empty array
        products = [];
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
        const cartItem = cart.find(item => item.productId == product.id);
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

// Services management from Google Sheets
async function loadServices() {
    try {
        const response = await fetch(`${BACKEND_URL}?action=getServices`);
        if (response.ok) {
            const data = await response.json();
            services = data;
            renderServices();
        } else {
            throw new Error('Failed to load services');
        }
    } catch (error) {
        console.error('Error loading services:', error);
        // Fallback to empty array
        services = [];
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

// Order submission to Google Sheets
async function submitOrder(orderData) {
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
            deliveryOption: deliveryOption.value,
            deliveryAddress: deliveryAddress,
            deliveryCost: calculateDeliveryCost(),
            paymentMethod: paymentMethodText,
            totalAmount: document.getElementById('final-total').textContent,
            services: getSelectedServices(),
            exactTime: document.getElementById('exact-time').checked,
            exactTimeCost: document.getElementById('exact-time').checked ? 10 : 0
        };

        const result = await submitOrder(orderData);
        
        if (result.success) {
            showNotification(`✅ Заказ #${result.orderId} успешно создан!`, 'success');
            
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

function showNotification(message, type = 'info') {
    if (tg && tg.showPopup) {
        tg.showPopup({
            title: type === 'success' ? 'Успешно!' : 
                   type === 'error' ? 'Ошибка' : 'Информация',
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

// Make functions available globally
window.addToCart = addToCart;
window.updateCartItemQuantity = updateCartItemQuantity;
window.removeFromCart = removeFromCart;
window.openModal = openModal;
window.closeModal = closeModalHandler;
window.switchPage = switchPage;

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initApp();
});
