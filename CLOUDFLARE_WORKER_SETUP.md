# Cloudflare Worker Setup для Google Analytics

## Что изменилось

Обновлён Cloudflare Worker для поддержки Google Analytics:

1. ✅ Добавлен `script-src-elem` для загрузки внешних скриптов
2. ✅ Добавлены все Google Analytics домены:
   - `https://www.googletagmanager.com`
   - `https://www.google-analytics.com`
   - `https://ssl.google-analytics.com`
   - `https://analytics.google.com`
   - `https://stats.g.doubleclick.net`
   - `https://region1.google-analytics.com`
3. ✅ Добавлены дополнительные security headers

## Установка Worker в Cloudflare

### Шаг 1: Откройте Cloudflare Dashboard
1. Зайдите на https://dash.cloudflare.com
2. Выберите ваш домен `kabbalahcode.space`

### Шаг 2: Создайте Worker
1. В левом меню выберите **Workers & Pages**
2. Нажмите **Create Application**
3. Выберите **Create Worker**
4. Назовите worker: `kabbalah-security-headers`
5. Нажмите **Deploy**

### Шаг 3: Замените код Worker
1. После создания нажмите **Edit Code**
2. Удалите весь существующий код
3. Скопируйте содержимое файла `cloudflare-worker.js`
4. Вставьте в редактор
5. Нажмите **Save and Deploy**

### Шаг 4: Привяжите Worker к домену
1. Вернитесь в **Workers & Pages**
2. Выберите созданный worker `kabbalah-security-headers`
3. Перейдите на вкладку **Triggers**
4. В разделе **Routes** нажмите **Add Route**
5. Введите: `kabbalahcode.space/*`
6. Выберите зону: `kabbalahcode.space`
7. Нажмите **Save**

### Шаг 5: Проверьте работу
1. Откройте https://kabbalahcode.space
2. Откройте DevTools (F12) → Console
3. Не должно быть ошибок CSP
4. Проверьте: `window.dataLayer` - должен быть массив
5. Network tab → найдите `gtag/js?id=G-GGX8M2NM82` - статус 200

## Важные настройки Cloudflare

### Отключите конфликтующие функции:

1. **Security → Settings**
   - Bot Fight Mode: **OFF** (может блокировать GA)
   
2. **Speed → Optimization**
   - Rocket Loader: **OFF** (конфликтует с GA)
   - Auto Minify: можно оставить включенным
   
3. **Caching → Configuration**
   - Browser Cache TTL: рекомендуется 4 hours
   - После обновления worker очистите кэш: **Purge Everything**

## Альтернатива: Cloudflare Zaraz

Если Worker не помогает, используйте Cloudflare Zaraz:

1. **Third-Party Tools → Zaraz**
2. Нажмите **Add Tool**
3. Выберите **Google Analytics**
4. Введите Measurement ID: `G-GGX8M2NM82`
5. Настройте триггеры: **Pageview** на всех страницах
6. Нажмите **Save**

Zaraz работает на edge и обходит все блокировки.

## Проверка CSP заголовков

Проверьте что Worker применяется:

```bash
curl -I https://kabbalahcode.space
```

Должен быть заголовок:
```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.googletagmanager.com ...
```

## Troubleshooting

### GA всё ещё не работает?

1. **Очистите кэш Cloudflare**: Dashboard → Caching → Purge Everything
2. **Очистите кэш браузера**: Ctrl+Shift+Delete
3. **Проверьте в режиме инкогнито**
4. **Подождите 5-10 минут** после обновления worker
5. **Проверьте Bot Fight Mode** - должен быть выключен

### Проверка в консоли браузера:

```javascript
// Должно вернуть массив
console.log(window.dataLayer);

// Должно вернуть функцию
console.log(typeof window.gtag);

// Отправить тестовое событие
gtag('event', 'test_event', { 'event_category': 'test' });
```

## Контакты

Если возникли проблемы, проверьте:
- Cloudflare Worker активен и привязан к домену
- Bot Fight Mode выключен
- Rocket Loader выключен
- Кэш очищен
