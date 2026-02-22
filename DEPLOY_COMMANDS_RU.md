# Команды для деплоя (из backup директории)

## Текущая ситуация
✅ Вы в правильной директории: `_github_ready_backup`
✅ Все файлы фиксов созданы и обновлены

## Выполните эти команды по порядку:

### 1. Проверьте статус
```bash
git status
```

### 2. Добавьте файлы фиксов
```bash
git add next.config.mjs .vercelignore vercel.json .npmrc VERCEL_BUILD_FIX.md DEPLOY_COMMANDS_RU.md
```

### 3. Закоммитьте изменения
```bash
git commit -m "fix: resolve Vercel build errors with WalletConnect test files"
```

### 4. Запушьте на GitHub
```bash
git push origin main
```

## Что делают эти файлы

### `next.config.mjs` (обновлен)
- Исключает тестовые файлы из пакетов WalletConnect
- Добавляет dev зависимости в serverExternalPackages
- Настраивает webpack fallbacks

### `.vercelignore` (создан)
- Предотвращает загрузку тестовых файлов на Vercel
- Исключает benchmark и dev файлы

### `vercel.json` (уже был)
- Настройки билда
- Таймауты для API функций
- Security headers

### `.npmrc` (уже был)
- Оптимизация установки пакетов

## Ожидаемый результат

После пуша Vercel автоматически:
1. ✅ Обнаружит новый коммит
2. ✅ Запустит новый билд
3. ✅ Пропустит тестовые файлы
4. ✅ Успешно завершит сборку

## Если билд все еще падает

1. Зайдите в Vercel Dashboard
2. Settings → Build & Development Settings
3. Нажмите "Clear Cache"
4. Запустите новый деплой

## Мониторинг билда

Следите за билдом: https://vercel.com/dashboard
