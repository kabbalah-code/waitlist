# KABBALAH CODE - Supabase Waitlist Analytics (Existing Tables)

## 📊 СУЩЕСТВУЮЩАЯ ТАБЛИЦА WAITLIST

### **waitlist_registrations** (Основная таблица)
**Назначение:** Хранение данных пользователей, зарегистрировавшихся в waitlist

**Существующая структура:**
```sql
CREATE TABLE waitlist_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  wallet_address TEXT UNIQUE NOT NULL,
  twitter_handle TEXT,
  referral_code TEXT UNIQUE NOT NULL,
  referred_by TEXT REFERENCES waitlist_registrations(referral_code),
  referral_count INTEGER DEFAULT 0,
  bonus_kcode DECIMAL(20, 6) DEFAULT 0,
  position INTEGER,
  status TEXT DEFAULT 'pending', -- pending, approved, converted
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Ключевые поля:**
- `email` - email пользователя (уникальный)
- `wallet_address` - адрес кошелька (уникальный, обязательный)
- `twitter_handle` - Twitter аккаунт (опционально)
- `referral_code` - уникальный реферальный код
- `referred_by` - кто пригласил (реферальный код)
- `referral_count` - количество приглашенных
- `bonus_kcode` - бонусные токены за рефералы
- `position` - позиция в waitlist
- `status` - статус (pending, approved, converted)
- `metadata` - дополнительные данные (JSONB)
- `created_at` - дата регистрации
- `updated_at` - дата обновления

**Индексы:**
- `idx_waitlist_email` - быстрый поиск по email
- `idx_waitlist_wallet` - быстрый поиск по кошельку
- `idx_waitlist_referral_code` - поиск по реферальному коду
- `idx_waitlist_referred_by` - поиск рефералов
- `idx_waitlist_created_at` - сортировка по дате

---

## 📈 КЛЮЧЕВЫЕ МЕТРИКИ ДЛЯ АНАЛИЗА

### 1. **Метрики Роста**

```sql
-- Общее количество пользователей в waitlist
SELECT COUNT(*) as total_users 
FROM waitlist_registrations;

-- Новые пользователи за день
SELECT 
  DATE(created_at) as date,
  COUNT(*) as new_users
FROM waitlist_registrations
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Кумулятивный рост
SELECT 
  DATE(created_at) as date,
  COUNT(*) OVER (ORDER BY DATE(created_at)) as cumulative_users
FROM waitlist_registrations
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Рост по неделям
SELECT 
  DATE_TRUNC('week', created_at)::DATE as week,
  COUNT(*) as new_users,
  SUM(COUNT(*)) OVER (ORDER BY DATE_TRUNC('week', created_at)) as cumulative
FROM waitlist_registrations
GROUP BY DATE_TRUNC('week', created_at)
ORDER BY week DESC;
```

### 2. **Метрики Конверсии**

```sql
-- Процент пользователей с подключенным кошельком
SELECT 
  COUNT(*) as total,
  COUNT(CASE WHEN wallet_address IS NOT NULL THEN 1 END) as with_wallet,
  ROUND(COUNT(CASE WHEN wallet_address IS NOT NULL THEN 1 END)::FLOAT / COUNT(*) * 100, 2) as wallet_rate
FROM waitlist_registrations;

-- Процент пользователей с Twitter
SELECT 
  COUNT(*) as total,
  COUNT(CASE WHEN twitter_handle IS NOT NULL THEN 1 END) as with_twitter,
  ROUND(COUNT(CASE WHEN twitter_handle IS NOT NULL THEN 1 END)::FLOAT / COUNT(*) * 100, 2) as twitter_rate
FROM waitlist_registrations;

-- Распределение по статусам
SELECT 
  status,
  COUNT(*) as count,
  ROUND(COUNT(*)::FLOAT / (SELECT COUNT(*) FROM waitlist_registrations) * 100, 2) as percentage
FROM waitlist_registrations
GROUP BY status
ORDER BY count DESC;

-- Конверсия из pending в approved
SELECT 
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
  COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
  COUNT(CASE WHEN status = 'converted' THEN 1 END) as converted,
  ROUND(COUNT(CASE WHEN status = 'approved' THEN 1 END)::FLOAT / 
        COUNT(CASE WHEN status = 'pending' THEN 1 END) * 100, 2) as approval_rate
FROM waitlist_registrations;
```

### 3. **Метрики Реферальной Системы**

```sql
-- Топ 20 рефереров
SELECT 
  email,
  wallet_address,
  referral_code,
  referral_count,
  bonus_kcode,
  created_at
FROM waitlist_registrations
WHERE referral_count > 0
ORDER BY referral_count DESC
LIMIT 20;

-- Статистика реферальной программы
SELECT 
  COUNT(CASE WHEN referral_count > 0 THEN 1 END) as active_referrers,
  COUNT(CASE WHEN referred_by IS NOT NULL THEN 1 END) as referred_users,
  ROUND(AVG(referral_count), 2) as avg_referrals_per_user,
  MAX(referral_count) as max_referrals,
  SUM(bonus_kcode) as total_bonus_distributed
FROM waitlist_registrations;

-- Эффективность реферальной программы
SELECT 
  COUNT(DISTINCT referred_by) as unique_referrers,
  COUNT(*) as total_referrals,
  ROUND(COUNT(*)::FLOAT / COUNT(DISTINCT referred_by), 2) as avg_referrals_per_referrer,
  SUM(bonus_kcode) as total_rewards
FROM waitlist_registrations
WHERE referred_by IS NOT NULL;

-- Распределение пользователей по количеству рефералов
SELECT 
  CASE 
    WHEN referral_count = 0 THEN '0 referrals'
    WHEN referral_count BETWEEN 1 AND 5 THEN '1-5 referrals'
    WHEN referral_count BETWEEN 6 AND 10 THEN '6-10 referrals'
    WHEN referral_count BETWEEN 11 AND 20 THEN '11-20 referrals'
    ELSE '20+ referrals'
  END as referral_range,
  COUNT(*) as user_count,
  ROUND(COUNT(*)::FLOAT / (SELECT COUNT(*) FROM waitlist_registrations) * 100, 2) as percentage
FROM waitlist_registrations
GROUP BY referral_range
ORDER BY 
  CASE referral_range
    WHEN '0 referrals' THEN 1
    WHEN '1-5 referrals' THEN 2
    WHEN '6-10 referrals' THEN 3
    WHEN '11-20 referrals' THEN 4
    ELSE 5
  END;

-- Реферальная цепочка (кто кого пригласил)
WITH RECURSIVE referral_chain AS (
  -- Начальные пользователи (без рефералов)
  SELECT 
    id,
    email,
    referral_code,
    referred_by,
    1 as level
  FROM waitlist_registrations
  WHERE referred_by IS NULL
  
  UNION ALL
  
  -- Рекурсивно находим всех приглашенных
  SELECT 
    w.id,
    w.email,
    w.referral_code,
    w.referred_by,
    rc.level + 1
  FROM waitlist_registrations w
  INNER JOIN referral_chain rc ON w.referred_by = rc.referral_code
)
SELECT 
  level,
  COUNT(*) as users_at_level
FROM referral_chain
GROUP BY level
ORDER BY level;
```

### 4. **Метрики Временных Рядов**

```sql
-- Дневной рост с деталями
SELECT 
  DATE(created_at) as date,
  COUNT(*) as new_users,
  COUNT(CASE WHEN twitter_handle IS NOT NULL THEN 1 END) as with_twitter,
  COUNT(CASE WHEN referred_by IS NOT NULL THEN 1 END) as from_referrals,
  SUM(bonus_kcode) as bonus_distributed,
  ROUND(COUNT(CASE WHEN referred_by IS NOT NULL THEN 1 END)::FLOAT / COUNT(*) * 100, 2) as referral_rate
FROM waitlist_registrations
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Недельный тренд
SELECT 
  DATE_TRUNC('week', created_at)::DATE as week,
  COUNT(*) as new_users,
  COUNT(CASE WHEN twitter_handle IS NOT NULL THEN 1 END) as with_twitter,
  COUNT(CASE WHEN referred_by IS NOT NULL THEN 1 END) as from_referrals,
  SUM(bonus_kcode) as bonus_distributed
FROM waitlist_registrations
GROUP BY DATE_TRUNC('week', created_at)
ORDER BY week DESC;

-- Почасовая активность (лучшее время для постов)
SELECT 
  EXTRACT(HOUR FROM created_at) as hour,
  COUNT(*) as registrations,
  ROUND(COUNT(*)::FLOAT / (SELECT COUNT(*) FROM waitlist_registrations) * 100, 2) as percentage
FROM waitlist_registrations
GROUP BY EXTRACT(HOUR FROM created_at)
ORDER BY hour;

-- День недели активности
SELECT 
  TO_CHAR(created_at, 'Day') as day_of_week,
  COUNT(*) as registrations,
  ROUND(COUNT(*)::FLOAT / (SELECT COUNT(*) FROM waitlist_registrations) * 100, 2) as percentage
FROM waitlist_registrations
GROUP BY TO_CHAR(created_at, 'Day'), EXTRACT(DOW FROM created_at)
ORDER BY EXTRACT(DOW FROM created_at);
```

### 5. **Метрики Позиций в Waitlist**

```sql
-- Распределение по позициям
SELECT 
  CASE 
    WHEN position <= 100 THEN 'Top 100'
    WHEN position <= 500 THEN '101-500'
    WHEN position <= 1000 THEN '501-1000'
    WHEN position <= 5000 THEN '1001-5000'
    ELSE '5000+'
  END as position_range,
  COUNT(*) as user_count
FROM waitlist_registrations
GROUP BY position_range
ORDER BY 
  CASE position_range
    WHEN 'Top 100' THEN 1
    WHEN '101-500' THEN 2
    WHEN '501-1000' THEN 3
    WHEN '1001-5000' THEN 4
    ELSE 5
  END;

-- Средняя позиция по дате регистрации
SELECT 
  DATE(created_at) as date,
  AVG(position) as avg_position,
  MIN(position) as min_position,
  MAX(position) as max_position
FROM waitlist_registrations
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### 6. **Метрики Metadata (если используется)**

```sql
-- Анализ metadata (источники трафика, UTM параметры)
SELECT 
  metadata->>'source' as source,
  COUNT(*) as count
FROM waitlist_registrations
WHERE metadata->>'source' IS NOT NULL
GROUP BY metadata->>'source'
ORDER BY count DESC;

-- UTM кампании
SELECT 
  metadata->>'utm_campaign' as campaign,
  COUNT(*) as registrations,
  COUNT(CASE WHEN referred_by IS NOT NULL THEN 1 END) as with_referrals,
  SUM(bonus_kcode) as total_bonus
FROM waitlist_registrations
WHERE metadata->>'utm_campaign' IS NOT NULL
GROUP BY metadata->>'utm_campaign'
ORDER BY registrations DESC;

-- Страны (если сохраняется в metadata)
SELECT 
  metadata->>'country' as country,
  COUNT(*) as users,
  ROUND(COUNT(*)::FLOAT / (SELECT COUNT(*) FROM waitlist_registrations) * 100, 2) as percentage
FROM waitlist_registrations
WHERE metadata->>'country' IS NOT NULL
GROUP BY metadata->>'country'
ORDER BY users DESC
LIMIT 20;
```

---

## 🎯 DASHBOARD QUERIES (Для Metabase/Superset)

### Карточка 1: Общая статистика
```sql
SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN wallet_address IS NOT NULL THEN 1 END) as with_wallet,
  COUNT(CASE WHEN twitter_handle IS NOT NULL THEN 1 END) as with_twitter,
  COUNT(CASE WHEN referral_count > 0 THEN 1 END) as active_referrers,
  ROUND(AVG(referral_count), 2) as avg_referrals,
  SUM(bonus_kcode) as total_bonus_distributed
FROM waitlist_registrations;
```

### Карточка 2: Сегодняшний рост
```sql
SELECT 
  COUNT(*) as today_signups,
  COUNT(CASE WHEN twitter_handle IS NOT NULL THEN 1 END) as with_twitter,
  COUNT(CASE WHEN referred_by IS NOT NULL THEN 1 END) as from_referrals,
  SUM(bonus_kcode) as bonus_today
FROM waitlist_registrations
WHERE DATE(created_at) = CURRENT_DATE;
```

### Карточка 3: Топ рефереры
```sql
SELECT 
  email,
  referral_code,
  referral_count,
  bonus_kcode,
  created_at
FROM waitlist_registrations
WHERE referral_count > 0
ORDER BY referral_count DESC
LIMIT 10;
```

### Карточка 4: Статусы
```sql
SELECT 
  status,
  COUNT(*) as count,
  ROUND(COUNT(*)::FLOAT / (SELECT COUNT(*) FROM waitlist_registrations) * 100, 2) as percentage
FROM waitlist_registrations
GROUP BY status;
```

### Карточка 5: Недельный рост
```sql
SELECT 
  DATE_TRUNC('week', created_at)::DATE as week,
  COUNT(*) as new_users
FROM waitlist_registrations
WHERE created_at >= NOW() - INTERVAL '8 weeks'
GROUP BY DATE_TRUNC('week', created_at)
ORDER BY week DESC;
```

---

## 📊 VIEWS ДЛЯ БЫСТРОГО АНАЛИЗА

### View 1: Дневная статистика
```sql
CREATE OR REPLACE VIEW waitlist_daily_stats AS
SELECT 
  DATE(created_at) as date,
  COUNT(*) as new_users,
  COUNT(CASE WHEN twitter_handle IS NOT NULL THEN 1 END) as with_twitter,
  COUNT(CASE WHEN referred_by IS NOT NULL THEN 1 END) as from_referrals,
  SUM(bonus_kcode) as bonus_distributed,
  ROUND(COUNT(CASE WHEN referred_by IS NOT NULL THEN 1 END)::FLOAT / COUNT(*) * 100, 2) as referral_rate
FROM waitlist_registrations
GROUP BY DATE(created_at);
```

### View 2: Топ рефереры
```sql
CREATE OR REPLACE VIEW waitlist_top_referrers AS
SELECT 
  id,
  email,
  wallet_address,
  referral_code,
  referral_count,
  bonus_kcode,
  created_at,
  RANK() OVER (ORDER BY referral_count DESC) as rank
FROM waitlist_registrations
WHERE referral_count > 0;
```

### View 3: Реферальная статистика
```sql
CREATE OR REPLACE VIEW waitlist_referral_stats AS
SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN referral_count > 0 THEN 1 END) as active_referrers,
  COUNT(CASE WHEN referred_by IS NOT NULL THEN 1 END) as referred_users,
  ROUND(AVG(referral_count), 2) as avg_referrals,
  MAX(referral_count) as max_referrals,
  SUM(bonus_kcode) as total_bonus,
  ROUND(COUNT(CASE WHEN referral_count > 0 THEN 1 END)::FLOAT / COUNT(*) * 100, 2) as referrer_percentage
FROM waitlist_registrations;
```

---

## 🔍 АНАЛИЗ РЕЗУЛЬТАТОВ

### Что смотреть каждый день:

1. **Количество новых пользователей**
   ```sql
   SELECT COUNT(*) FROM waitlist_registrations 
   WHERE DATE(created_at) = CURRENT_DATE;
   ```
   - Целевой показатель: 100+ в день
   - Если < 50: усилить маркетинг

2. **Процент с Twitter**
   ```sql
   SELECT 
     ROUND(COUNT(CASE WHEN twitter_handle IS NOT NULL THEN 1 END)::FLOAT / COUNT(*) * 100, 2) as twitter_rate
   FROM waitlist_registrations
   WHERE DATE(created_at) = CURRENT_DATE;
   ```
   - Целевой показатель: > 40%
   - Если < 20%: улучшить призыв к действию

3. **Реферальная активность**
   ```sql
   SELECT 
     COUNT(CASE WHEN referred_by IS NOT NULL THEN 1 END) as referrals_today,
     SUM(bonus_kcode) as bonus_today
   FROM waitlist_registrations
   WHERE DATE(created_at) = CURRENT_DATE;
   ```
   - Целевой показатель: > 30% от рефералов
   - Если < 15%: улучшить реферальную программу

### Еженедельный анализ:

```sql
-- Еженедельный отчет
SELECT 
  DATE_TRUNC('week', created_at)::DATE as week,
  COUNT(*) as new_users,
  COUNT(CASE WHEN twitter_handle IS NOT NULL THEN 1 END) as with_twitter,
  COUNT(CASE WHEN referred_by IS NOT NULL THEN 1 END) as from_referrals,
  SUM(bonus_kcode) as bonus_distributed,
  MAX(referral_count) as max_referrals_by_user
FROM waitlist_registrations
GROUP BY DATE_TRUNC('week', created_at)
ORDER BY week DESC
LIMIT 8;
```

---

## 🚀 РЕКОМЕНДАЦИИ ПО ОПТИМИЗАЦИИ

### Если низкая реферальная активность:
```sql
-- Найти пользователей без рефералов для таргетированной кампании
SELECT email, wallet_address, referral_code, created_at
FROM waitlist_registrations
WHERE referral_count = 0
  AND created_at < NOW() - INTERVAL '7 days'
ORDER BY created_at DESC
LIMIT 100;
```

### Если низкий процент Twitter:
```sql
-- Найти пользователей без Twitter для напоминания
SELECT email, wallet_address, created_at
FROM waitlist_registrations
WHERE twitter_handle IS NULL
  AND created_at < NOW() - INTERVAL '3 days'
ORDER BY created_at DESC
LIMIT 100;
```

### Топ рефереры для награждения:
```sql
-- Топ 10 рефереров для специальных наград
SELECT 
  email,
  wallet_address,
  referral_code,
  referral_count,
  bonus_kcode,
  created_at
FROM waitlist_registrations
WHERE referral_count >= 10
ORDER BY referral_count DESC
LIMIT 10;
```

---

## 📱 ИНТЕГРАЦИЯ С GOOGLE ANALYTICS

Добавить в metadata при регистрации:

```javascript
// При регистрации в waitlist
const metadata = {
  source: 'twitter', // или 'telegram', 'direct', etc
  utm_source: utmParams.source,
  utm_medium: utmParams.medium,
  utm_campaign: utmParams.campaign,
  country: userCountry,
  browser: userAgent,
  referrer: document.referrer
};

// Отправить в Google Analytics
gtag('event', 'waitlist_signup', {
  email: userEmail,
  wallet: walletAddress,
  source: metadata.source,
  has_referral: !!referredBy
});
```

---

## 💡 ДОПОЛНИТЕЛЬНЫЕ ПОЛЕЗНЫЕ ЗАПРОСЫ

### Когортный анализ (retention)
```sql
-- Пользователи, которые вернулись и обновили данные
SELECT 
  DATE(created_at) as signup_date,
  COUNT(*) as signups,
  COUNT(CASE WHEN updated_at > created_at + INTERVAL '1 day' THEN 1 END) as returned_next_day,
  ROUND(COUNT(CASE WHEN updated_at > created_at + INTERVAL '1 day' THEN 1 END)::FLOAT / COUNT(*) * 100, 2) as retention_rate
FROM waitlist_registrations
GROUP BY DATE(created_at)
ORDER BY signup_date DESC;
```

### Скорость роста
```sql
-- Процент роста день к дню
WITH daily_counts AS (
  SELECT 
    DATE(created_at) as date,
    COUNT(*) as count
  FROM waitlist_registrations
  GROUP BY DATE(created_at)
)
SELECT 
  date,
  count,
  LAG(count) OVER (ORDER BY date) as prev_day_count,
  ROUND((count - LAG(count) OVER (ORDER BY date))::FLOAT / 
        LAG(count) OVER (ORDER BY date) * 100, 2) as growth_rate
FROM daily_counts
ORDER BY date DESC;
```

### Прогноз достижения целей
```sql
-- Прогноз когда достигнем 10,000 пользователей
WITH growth_rate AS (
  SELECT 
    AVG(daily_signups) as avg_daily_signups
  FROM (
    SELECT 
      DATE(created_at) as date,
      COUNT(*) as daily_signups
    FROM waitlist_registrations
    WHERE created_at >= NOW() - INTERVAL '7 days'
    GROUP BY DATE(created_at)
  ) recent
)
SELECT 
  (SELECT COUNT(*) FROM waitlist_registrations) as current_users,
  10000 as target,
  10000 - (SELECT COUNT(*) FROM waitlist_registrations) as users_needed,
  ROUND((10000 - (SELECT COUNT(*) FROM waitlist_registrations))::FLOAT / avg_daily_signups) as days_to_target,
  CURRENT_DATE + INTERVAL '1 day' * ROUND((10000 - (SELECT COUNT(*) FROM waitlist_registrations))::FLOAT / avg_daily_signups) as estimated_date
FROM growth_rate;
```



### 1. **waitlist_users** (Основная таблица)
**Назначение:** Хранение данных пользователей, зарегистрировавшихся в waitlist

**Структура:**
```sql
CREATE TABLE waitlist_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  wallet_address VARCHAR(255),
  referral_code VARCHAR(50) UNIQUE,
  referred_by UUID REFERENCES waitlist_users(id),
  position INT,
  status VARCHAR(50) DEFAULT 'pending', -- pending, verified, active, inactive
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  verified_at TIMESTAMP,
  joined_at TIMESTAMP,
  
  -- Дополнительные поля
  country VARCHAR(100),
  source VARCHAR(100), -- twitter, telegram, discord, direct, referral
  utm_source VARCHAR(100),
  utm_medium VARCHAR(100),
  utm_campaign VARCHAR(100),
  
  -- Взаимодействие
  email_verified BOOLEAN DEFAULT FALSE,
  wallet_verified BOOLEAN DEFAULT FALSE,
  social_verified BOOLEAN DEFAULT FALSE,
  
  -- Метаданные
  ip_address INET,
  user_agent TEXT,
  browser_fingerprint VARCHAR(255),
  
  -- Статистика
  referral_count INT DEFAULT 0,
  points INT DEFAULT 0,
  
  INDEX idx_email (email),
  INDEX idx_wallet (wallet_address),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at),
  INDEX idx_referral_code (referral_code)
);
```

**Ключевые поля для анализа:**
- `email` - контакт пользователя
- `status` - статус в waitlist
- `created_at` - дата регистрации
- `source` - источник трафика
- `referral_count` - количество рефералов
- `country` - геолокация

---

### 2. **waitlist_events** (События пользователей)
**Назначение:** Отслеживание действий пользователей

**Структура:**
```sql
CREATE TABLE waitlist_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES waitlist_users(id) ON DELETE CASCADE,
  event_type VARCHAR(100), -- signup, email_verified, wallet_connected, referral, share, click
  event_data JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  
  INDEX idx_user_id (user_id),
  INDEX idx_event_type (event_type),
  INDEX idx_created_at (created_at)
);
```

**Типы событий:**
- `signup` - регистрация в waitlist
- `email_verified` - подтверждение email
- `wallet_connected` - подключение кошелька
- `referral_sent` - отправка реферального кода
- `social_shared` - поделился в соцсетях
- `page_view` - просмотр страницы
- `button_click` - клик на кнопку

---

### 3. **waitlist_referrals** (Реферальная система)
**Назначение:** Отслеживание реферальных связей и вознаграждений

**Структура:**
```sql
CREATE TABLE waitlist_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID REFERENCES waitlist_users(id) ON DELETE CASCADE,
  referred_id UUID REFERENCES waitlist_users(id) ON DELETE CASCADE,
  referral_code VARCHAR(50),
  status VARCHAR(50) DEFAULT 'pending', -- pending, completed, rewarded
  reward_amount INT DEFAULT 100, -- в $KCODE токенах
  reward_given BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  
  UNIQUE(referrer_id, referred_id),
  INDEX idx_referrer_id (referrer_id),
  INDEX idx_referred_id (referred_id),
  INDEX idx_status (status)
);
```

---

### 4. **waitlist_analytics** (Агрегированная аналитика)
**Назначение:** Кешированные метрики для быстрого доступа

**Структура:**
```sql
CREATE TABLE waitlist_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE,
  metric_type VARCHAR(100), -- daily_signups, daily_active, conversion_rate, etc
  metric_value INT,
  metric_data JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(date, metric_type),
  INDEX idx_date (date),
  INDEX idx_metric_type (metric_type)
);
```

---

### 5. **waitlist_utm_tracking** (UTM параметры)
**Назначение:** Отслеживание источников трафика

**Структура:**
```sql
CREATE TABLE waitlist_utm_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES waitlist_users(id) ON DELETE CASCADE,
  utm_source VARCHAR(100),
  utm_medium VARCHAR(100),
  utm_campaign VARCHAR(100),
  utm_content VARCHAR(100),
  utm_term VARCHAR(100),
  referrer_url TEXT,
  landing_page VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_user_id (user_id),
  INDEX idx_utm_source (utm_source),
  INDEX idx_utm_campaign (utm_campaign)
);
```

---

### 6. **waitlist_segments** (Сегментация пользователей)
**Назначение:** Разделение пользователей на группы для анализа

**Структура:**
```sql
CREATE TABLE waitlist_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES waitlist_users(id) ON DELETE CASCADE,
  segment_name VARCHAR(100), -- early_adopter, referral_champion, social_sharer, etc
  segment_score INT,
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_user_id (user_id),
  INDEX idx_segment_name (segment_name)
);
```

---

## 📈 КЛЮЧЕВЫЕ МЕТРИКИ ДЛЯ АНАЛИЗА

### 1. **Метрики Роста**

```sql
-- Общее количество пользователей в waitlist
SELECT COUNT(*) as total_users FROM waitlist_users;

-- Новые пользователи за день
SELECT 
  DATE(created_at) as date,
  COUNT(*) as new_users
FROM waitlist_users
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Кумулятивный рост
SELECT 
  DATE(created_at) as date,
  COUNT(*) OVER (ORDER BY DATE(created_at)) as cumulative_users
FROM waitlist_users
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### 2. **Метрики Конверсии**

```sql
-- Процент верифицированных email
SELECT 
  COUNT(CASE WHEN email_verified = TRUE THEN 1 END)::FLOAT / COUNT(*) * 100 as email_verification_rate
FROM waitlist_users;

-- Процент подключивших кошельки
SELECT 
  COUNT(CASE WHEN wallet_verified = TRUE THEN 1 END)::FLOAT / COUNT(*) * 100 as wallet_connection_rate
FROM waitlist_users;

-- Процент с рефералами
SELECT 
  COUNT(CASE WHEN referral_count > 0 THEN 1 END)::FLOAT / COUNT(*) * 100 as referral_participation_rate
FROM waitlist_users;
```

### 3. **Метрики Источников Трафика**

```sql
-- Распределение пользователей по источникам
SELECT 
  source,
  COUNT(*) as user_count,
  ROUND(COUNT(*)::FLOAT / (SELECT COUNT(*) FROM waitlist_users) * 100, 2) as percentage
FROM waitlist_users
WHERE source IS NOT NULL
GROUP BY source
ORDER BY user_count DESC;

-- Качество трафика по источникам (конверсия в верифицированных)
SELECT 
  source,
  COUNT(*) as total,
  COUNT(CASE WHEN email_verified = TRUE THEN 1 END) as verified,
  ROUND(COUNT(CASE WHEN email_verified = TRUE THEN 1 END)::FLOAT / COUNT(*) * 100, 2) as verification_rate
FROM waitlist_users
GROUP BY source
ORDER BY verification_rate DESC;
```

### 4. **Метрики Реферальной Системы**

```sql
-- Топ рефереры
SELECT 
  wu.email,
  wu.referral_count,
  COUNT(wr.id) as successful_referrals,
  SUM(CASE WHEN wr.reward_given = TRUE THEN wr.reward_amount ELSE 0 END) as total_rewards
FROM waitlist_users wu
LEFT JOIN waitlist_referrals wr ON wu.id = wr.referrer_id
GROUP BY wu.id, wu.email, wu.referral_count
ORDER BY wu.referral_count DESC
LIMIT 20;

-- Эффективность реферальной программы
SELECT 
  COUNT(DISTINCT referrer_id) as referrers,
  COUNT(DISTINCT referred_id) as referred_users,
  COUNT(*) as total_referrals,
  ROUND(COUNT(DISTINCT referred_id)::FLOAT / COUNT(DISTINCT referrer_id), 2) as avg_referrals_per_person
FROM waitlist_referrals;

-- Стоимость привлечения через рефералы
SELECT 
  COUNT(*) as referral_signups,
  SUM(reward_amount) as total_rewards_spent,
  ROUND(SUM(reward_amount)::FLOAT / COUNT(*), 2) as cost_per_referral
FROM waitlist_referrals
WHERE reward_given = TRUE;
```

### 5. **Метрики Географии**

```sql
-- Распределение пользователей по странам
SELECT 
  country,
  COUNT(*) as user_count,
  ROUND(COUNT(*)::FLOAT / (SELECT COUNT(*) FROM waitlist_users) * 100, 2) as percentage
FROM waitlist_users
WHERE country IS NOT NULL
GROUP BY country
ORDER BY user_count DESC
LIMIT 20;

-- Качество трафика по странам
SELECT 
  country,
  COUNT(*) as total,
  COUNT(CASE WHEN email_verified = TRUE THEN 1 END) as verified,
  COUNT(CASE WHEN wallet_verified = TRUE THEN 1 END) as wallet_connected,
  ROUND(COUNT(CASE WHEN email_verified = TRUE THEN 1 END)::FLOAT / COUNT(*) * 100, 2) as verification_rate
FROM waitlist_users
WHERE country IS NOT NULL
GROUP BY country
ORDER BY total DESC
LIMIT 20;
```

### 6. **Метрики Активности**

```sql
-- Активность пользователей (события за день)
SELECT 
  DATE(created_at) as date,
  event_type,
  COUNT(*) as event_count
FROM waitlist_events
GROUP BY DATE(created_at), event_type
ORDER BY date DESC, event_count DESC;

-- Среднее количество событий на пользователя
SELECT 
  user_id,
  COUNT(*) as event_count,
  COUNT(DISTINCT event_type) as unique_event_types
FROM waitlist_events
GROUP BY user_id
ORDER BY event_count DESC
LIMIT 20;
```

### 7. **Метрики Временных Рядов**

```sql
-- Дневной рост с деталями
SELECT 
  DATE(created_at) as date,
  COUNT(*) as new_users,
  COUNT(CASE WHEN email_verified = TRUE THEN 1 END) as verified_same_day,
  COUNT(CASE WHEN referral_count > 0 THEN 1 END) as with_referrals,
  ROUND(COUNT(CASE WHEN email_verified = TRUE THEN 1 END)::FLOAT / COUNT(*) * 100, 2) as verification_rate
FROM waitlist_users
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Недельный тренд
SELECT 
  DATE_TRUNC('week', created_at)::DATE as week,
  COUNT(*) as new_users,
  COUNT(CASE WHEN email_verified = TRUE THEN 1 END) as verified,
  COUNT(CASE WHEN wallet_verified = TRUE THEN 1 END) as wallet_connected
FROM waitlist_users
GROUP BY DATE_TRUNC('week', created_at)
ORDER BY week DESC;
```

---

## 🎯 DASHBOARD QUERIES (Для Metabase/Superset)

### Карточка 1: Общая статистика
```sql
SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN email_verified = TRUE THEN 1 END) as verified_emails,
  COUNT(CASE WHEN wallet_verified = TRUE THEN 1 END) as connected_wallets,
  COUNT(CASE WHEN referral_count > 0 THEN 1 END) as users_with_referrals,
  ROUND(AVG(referral_count), 2) as avg_referrals_per_user
FROM waitlist_users;
```

### Карточка 2: Сегодняшний рост
```sql
SELECT 
  COUNT(*) as today_signups,
  COUNT(CASE WHEN email_verified = TRUE THEN 1 END) as today_verified,
  ROUND(COUNT(CASE WHEN email_verified = TRUE THEN 1 END)::FLOAT / COUNT(*) * 100, 2) as today_verification_rate
FROM waitlist_users
WHERE DATE(created_at) = CURRENT_DATE;
```

### Карточка 3: Топ источники трафика
```sql
SELECT 
  source,
  COUNT(*) as users,
  ROUND(COUNT(*)::FLOAT / (SELECT COUNT(*) FROM waitlist_users WHERE DATE(created_at) = CURRENT_DATE) * 100, 2) as percentage
FROM waitlist_users
WHERE DATE(created_at) = CURRENT_DATE
GROUP BY source
ORDER BY users DESC;
```

### Карточка 4: Реферальная активность
```sql
SELECT 
  COUNT(DISTINCT referrer_id) as active_referrers,
  COUNT(*) as total_referrals,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_referrals,
  SUM(CASE WHEN reward_given = TRUE THEN reward_amount ELSE 0 END) as total_rewards_given
FROM waitlist_referrals
WHERE DATE(created_at) = CURRENT_DATE;
```

---

## 📊 VIEWS ДЛЯ БЫСТРОГО АНАЛИЗА

### View 1: Пользователи с полной информацией
```sql
CREATE VIEW waitlist_users_full AS
SELECT 
  wu.id,
  wu.email,
  wu.wallet_address,
  wu.status,
  wu.created_at,
  wu.country,
  wu.source,
  wu.email_verified,
  wu.wallet_verified,
  wu.referral_count,
  wu.points,
  COUNT(wr.id) as successful_referrals,
  SUM(CASE WHEN wr.reward_given = TRUE THEN wr.reward_amount ELSE 0 END) as total_rewards
FROM waitlist_users wu
LEFT JOIN waitlist_referrals wr ON wu.id = wr.referrer_id
GROUP BY wu.id;
```

### View 2: Дневная статистика
```sql
CREATE VIEW waitlist_daily_stats AS
SELECT 
  DATE(created_at) as date,
  COUNT(*) as new_users,
  COUNT(CASE WHEN email_verified = TRUE THEN 1 END) as verified,
  COUNT(CASE WHEN wallet_verified = TRUE THEN 1 END) as wallet_connected,
  COUNT(CASE WHEN referral_count > 0 THEN 1 END) as with_referrals,
  ROUND(COUNT(CASE WHEN email_verified = TRUE THEN 1 END)::FLOAT / COUNT(*) * 100, 2) as verification_rate
FROM waitlist_users
GROUP BY DATE(created_at);
```

### View 3: Качество источников
```sql
CREATE VIEW waitlist_source_quality AS
SELECT 
  source,
  COUNT(*) as total_users,
  COUNT(CASE WHEN email_verified = TRUE THEN 1 END) as verified,
  COUNT(CASE WHEN wallet_verified = TRUE THEN 1 END) as wallet_connected,
  COUNT(CASE WHEN referral_count > 0 THEN 1 END) as with_referrals,
  ROUND(COUNT(CASE WHEN email_verified = TRUE THEN 1 END)::FLOAT / COUNT(*) * 100, 2) as verification_rate,
  ROUND(AVG(referral_count), 2) as avg_referrals
FROM waitlist_users
WHERE source IS NOT NULL
GROUP BY source;
```

---

## 🔍 АНАЛИЗ РЕЗУЛЬТАТОВ

### Что смотреть каждый день:

1. **Количество новых пользователей**
   - Целевой показатель: 100+ в день
   - Если < 50: проверить источники трафика, увеличить маркетинг

2. **Email Verification Rate**
   - Целевой показатель: > 60%
   - Если < 40%: улучшить email, добавить напоминания

3. **Wallet Connection Rate**
   - Целевой показатель: > 30%
   - Если < 20%: упростить процесс подключения

4. **Referral Participation**
   - Целевой показатель: > 20% пользователей с рефералами
   - Если < 10%: улучшить реферальную программу

5. **Лучший источник трафика**
   - Сосредоточить маркетинг на топ-3 источниках
   - Увеличить бюджет на работающие каналы

### Еженедельный анализ:

```sql
-- Еженедельный отчет
SELECT 
  DATE_TRUNC('week', created_at)::DATE as week,
  COUNT(*) as new_users,
  COUNT(CASE WHEN email_verified = TRUE THEN 1 END) as verified,
  ROUND(COUNT(CASE WHEN email_verified = TRUE THEN 1 END)::FLOAT / COUNT(*) * 100, 2) as verification_rate,
  COUNT(DISTINCT source) as unique_sources,
  MAX(referral_count) as max_referrals,
  ROUND(AVG(referral_count), 2) as avg_referrals
FROM waitlist_users
GROUP BY DATE_TRUNC('week', created_at)
ORDER BY week DESC;
```

---

## 🚀 РЕКОМЕНДАЦИИ ПО ОПТИМИЗАЦИИ

### Если низкая конверсия:
1. Проверить email шаблоны
2. Упростить процесс верификации
3. Добавить напоминания
4. Улучшить UX на странице

### Если низкая реферальная активность:
1. Увеличить награды за рефералы
2. Упростить процесс поделиться
3. Добавить социальные кнопки
4. Создать лидерборд

### Если неправильное распределение по странам:
1. Локализовать контент
2. Таргетировать рекламу по странам
3. Добавить поддержку языков
4. Адаптировать сообщения

---

## 📱 ИНТЕГРАЦИЯ С GOOGLE ANALYTICS

Связать Supabase события с Google Analytics:

```javascript
// В компоненте регистрации
gtag('event', 'waitlist_signup', {
  email: userEmail,
  source: source,
  country: country
});

// При верификации email
gtag('event', 'email_verified', {
  user_id: userId
});

// При подключении кошелька
gtag('event', 'wallet_connected', {
  user_id: userId,
  wallet_address: walletAddress
});

// При отправке реферального кода
gtag('event', 'referral_shared', {
  user_id: userId,
  referral_code: code
});
```

