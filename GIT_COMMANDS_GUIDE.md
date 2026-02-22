# 📦 GIT COMMANDS GUIDE
## How to Commit Only Needed Files - February 22, 2026

---

## 🎯 ПРОБЛЕМА

В `_github_ready_backup/` есть `node_modules/` и другие ненужные файлы.

Нужно закоммитить только исходный код, без:
- node_modules/
- .next/
- .env файлов
- IDE настроек

---

## ✅ РЕШЕНИЕ

### Вариант 1: Использовать .gitignore (рекомендуется)

Создан файл `_github_ready_backup/.gitignore` который исключает:
- node_modules/
- .next/
- .env файлы
- IDE настройки
- Логи и кэши

**Команды:**

```bash
cd _github_ready_backup

# Инициализировать git (если еще не сделано)
git init

# .gitignore уже создан, git автоматически его использует

# Добавить все файлы (кроме тех что в .gitignore)
git add .

# Создать commit
git commit -m "🔒 Security Update: Fix Critical Vulnerabilities & Supabase Linter Errors

## Critical Security Fixes

- Emergency API Removed
- XSS Vulnerability Fixed
- CORS Wildcard Fixed
- Admin Rate Limiting Added
- Security Event Logging Implemented
- Admin Endpoints Protected
- Database Security Tables Created
- Security Definer Views Fixed

## SEO Improvements

- Sitemap Updated

## UI Updates

- Logo Placement Optimized

## Documentation

- Marketing Package Created
- Documentation Links Added

## Impact

Security Score: 7/10 → 9.5/10
SEO Score: 8/10 → 8.5/10
Critical Vulnerabilities: 3 → 0
Supabase Linter Errors: 8 → 0

KABBALAH CODE - Security Hardened & Production Ready
Date: February 22, 2026
Version: 2.0 (Security Enhanced)"

# Добавить remote (замени на свой URL)
git remote add origin https://github.com/YOUR_USERNAME/kabbalah-code.git

# Запушить на GitHub
git push -u origin main
```

---

### Вариант 2: Добавить файлы выборочно

Если не хочешь использовать .gitignore, можно добавлять файлы вручную:

```bash
cd _github_ready_backup

git init

# Добавить только нужные директории
git add app/
git add components/
git add lib/
git add public/
git add styles/
git add types/
git add utils/

# Добавить конфигурационные файлы
git add package.json
git add package-lock.json
git add tsconfig.json
git add next.config.js
git add tailwind.config.ts
git add postcss.config.js

# Добавить документацию
git add README.md
git add _marketing_docs/
git add *.md

# Добавить SQL миграции
git add *.sql

# Создать commit
git commit -m "Initial commit"

# Добавить remote и push
git remote add origin https://github.com/YOUR_USERNAME/kabbalah-code.git
git push -u origin main
```

---

### Вариант 3: Использовать git add с исключениями

```bash
cd _github_ready_backup

git init

# Добавить все файлы
git add .

# Удалить из staging ненужные файлы
git reset node_modules/
git reset .next/
git reset .env*
git reset .vscode/

# Создать commit
git commit -m "Initial commit"

# Push
git remote add origin https://github.com/YOUR_USERNAME/kabbalah-code.git
git push -u origin main
```

---

## 📋 ПРОВЕРКА ПЕРЕД COMMIT

### Посмотреть что будет закоммичено:

```bash
# Список файлов в staging
git status

# Детальный список
git diff --cached --name-only

# Проверить размер
git count-objects -vH
```

### Убедиться что нет секретов:

```bash
# Поиск секретов в staged files
git diff --cached | grep -i "secret\|key\|token\|password\|api_key"

# Проверить .env файлы
git status | grep ".env"
```

---

## ⚠️ ВАЖНО

### НЕ коммитить:

- ❌ node_modules/ (большой размер, устанавливается через npm install)
- ❌ .next/ (build артефакты, генерируются автоматически)
- ❌ .env файлы (содержат секреты)
- ❌ .vscode/ (личные настройки IDE)
- ❌ *.log (логи)

### Коммитить:

- ✅ app/ (исходный код)
- ✅ components/ (компоненты)
- ✅ lib/ (библиотеки)
- ✅ public/ (статические файлы)
- ✅ package.json (зависимости)
- ✅ tsconfig.json (конфигурация TypeScript)
- ✅ *.md (документация)
- ✅ *.sql (миграции)

---

## 🚀 БЫСТРЫЙ СТАРТ

**Самый простой способ (с .gitignore):**

```bash
cd _github_ready_backup
git init
git add .
git commit -F GIT_COMMIT_MESSAGE.txt
git remote add origin https://github.com/YOUR_USERNAME/kabbalah-code.git
git push -u origin main
```

**.gitignore уже создан**, он автоматически исключит:
- node_modules/
- .next/
- .env файлы
- IDE настройки

---

## 📊 РАЗМЕР РЕПОЗИТОРИЯ

### Без node_modules:
```
Примерно: 5-10 MB
Файлов: ~200-300
```

### С node_modules:
```
Примерно: 200-500 MB
Файлов: ~10,000+
```

**Вывод:** Всегда используй .gitignore! ✅

---

## 🔍 ПРОВЕРКА ПОСЛЕ PUSH

```bash
# Клонировать репозиторий в другую директорию
git clone https://github.com/YOUR_USERNAME/kabbalah-code.git test-clone
cd test-clone

# Проверить что node_modules нет
ls -la

# Установить зависимости
npm install

# Запустить проект
npm run dev
```

Если все работает - значит закоммитили правильно! ✅

---

## 💡 ПОЛЕЗНЫЕ КОМАНДЫ

### Посмотреть историю:
```bash
git log --oneline
```

### Посмотреть изменения:
```bash
git diff
```

### Отменить последний commit (если ошибся):
```bash
git reset --soft HEAD~1
```

### Удалить файл из git (но оставить локально):
```bash
git rm --cached filename
```

### Очистить git cache (если добавил что-то лишнее):
```bash
git rm -r --cached .
git add .
git commit -m "Clean cache"
```

---

*KABBALAH CODE - Git Ready*

**Status**: ✅ .gitignore created  
**Date**: February 22, 2026  
**Recommendation**: Use Variant 1 (with .gitignore)

---

*"Simplicity is the ultimate sophistication."* - Leonardo da Vinci

**Используй .gitignore. Коммить станет проще.** 🚀

