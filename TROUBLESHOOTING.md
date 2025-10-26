# Диагностика ошибок ZeSt Bot

## 🔧 Решение проблемы "Ошибка загрузки товаров"

### 1. Автоматическое решение CORS ошибок

Приложение автоматически загружает демо-данные при CORS ошибках (когда открывается как `file://`).

### 2. Проверка подключения к бэкенду

Откройте консоль браузера (F12) и выполните:
```javascript
testBackendConnection()
```

### 3. Проверка URL бэкенда

В консоли проверьте:
```javascript
console.log('Backend URL:', BACKEND_URL);
```

### 4. Загрузка демо-данных

Если бэкенд недоступен, используйте демо-данные:
```javascript
loadDemoData()
```

### 5. Очистка кэша

Очистите кэш приложения:
```javascript
localStorage.clear();
location.reload();
```

## 🚨 Частые проблемы

### Проблема: CORS ошибка
**Решение:** Убедитесь, что Google Apps Script настроен для CORS

### Проблема: 404 Not Found
**Решение:** Проверьте правильность URL в `BACKEND_URL`

### Проблема: 500 Internal Server Error
**Решение:** Проверьте код Google Apps Script

### Проблема: Таймаут запроса
**Решение:** Увеличьте таймаут или используйте демо-данные

## 📊 Диагностические команды

```javascript
// Проверить статус кэша
console.log('Products cache:', localStorage.getItem('zest_products_cache'));
console.log('Cache expiry:', localStorage.getItem('zest_products_cache_expiry'));

// Проверить текущие товары
console.log('Current products:', products);
console.log('Current products count:', products.length);

// Принудительно перезагрузить товары
loadProducts();

// Очистить кэш и перезагрузить
localStorage.removeItem('zest_products_cache');
localStorage.removeItem('zest_products_cache_expiry');
loadProducts();
```

## 🔍 Логи для отладки

В консоли браузера будут видны:
- URL запроса к бэкенду
- Статус ответа
- Количество загруженных товаров
- Детали ошибок

## 📱 Тестирование в Telegram

1. Откройте приложение в Telegram
2. Проверьте консоль (если доступна)
3. Используйте кнопки "Загрузить демо-данные" или "Тест подключения"

## 🛠 Настройка Google Apps Script

Убедитесь, что ваш скрипт возвращает данные в формате:
```javascript
[
  {
    "id": 1,
    "name": "Название товара",
    "price": 100,
    "category": "energy",
    "volume": "250мл",
    "image": "url",
    "isNew": false,
    "isSale": true,
    "isPopular": true,
    "rating": 4.5,
    "description": "Описание",
    "tags": ["тег1", "тег2"]
  }
]
```

## 📞 Поддержка

Если проблема не решается:
1. Проверьте логи в консоли
2. Убедитесь в правильности URL бэкенда
3. Используйте демо-данные для тестирования
4. Проверьте настройки CORS в Google Apps Script
