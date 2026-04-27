# GTA RP Core - Majestic RP Clone (alt:V)

Полноценный клон Majestic RP на alt:V с backend API, CEF UI и всеми RP системами.

## 📦 Структура проекта

- `packages/server` — Backend API (Express + PostgreSQL)
- `packages/shared` — Общие TypeScript типы
- `packages/client` — Клиентские скрипты alt:V (машины, WebView)
- `packages/altv-server` — alt:V server bridge (синхронизация с API)
- `packages/launcher` — Лаунчер (патчер + запуск игры)

## 🎯 Реализованные системы

### Backend API
- ✅ Авторизация и регистрация (JWT)
- ✅ Система персонажей с кастомизацией
- ✅ Полноценный инвентарь (вес, слоты, категории)
- ✅ Система чата (глобальный, локальный, /me, /do, /try)
- ✅ 13 фракций (LSPD, FIB, EMS, SWAT, Sang, 5 ОПГ, 4 мафии)
- ✅ 20 работ (таксист, дальнобойщик, инкассатор и др.)
- ✅ Система оружия (патроны, износ, конфискация)
- ✅ Система банков (переводы, карты, история)
- ✅ Античит (валидация, логирование)
- ✅ Модерация (репорты, баны, спектейт)
- ✅ Система лицензий (права, оружие, бизнес, охота, рыбалка)
- ✅ Система домов (покупка, интерьеры, мебель)
- ✅ Система бизнесов (покупка, доход, товары)
- ✅ NPC магазины (24/7, одежда, оружие, автосалоны)
- ✅ Система гаражей (парковка, сохранение авто)
- ✅ Система анимаций и взаимодействия
- ✅ Телефон (звонки, СМС, контакты)
- ✅ Семья (создание, управление, иерархия, казна)
- ✅ Планшет (управление семьей, фракцией, домом, бизнесом)
- ✅ Маркетплейс (покупка/продажа предметов, авто, недвижимости)
- ✅ 100+ машин в каталоге

### CEF UI
- ✅ Экран авторизации и регистрации
- ✅ Выбор и создание персонажей
- ✅ HUD (деньги, здоровье, броня, работа, фракция)
- ✅ Инвентарь (сетка, использование, выброс)
- ✅ Меню взаимодействия (руки вверх, планшет, телефон)
- ✅ Планшет с приложениями

### Клиентская интеграция alt:V
- ✅ Система машин (спавн, деспавн, двигатель, замок, ключи)
- ✅ WebView интеграция (CEF UI ↔ alt:V)
- ✅ Серверный мост (API ↔ alt:V server)

---

## 🚀 Полное руководство по запуску

### Вариант 1: Деплой на Railway (облачный)

#### Шаг 1: Подготовка репозитория

1. Загрузи проект на GitHub
2. Создай новый проект на [Railway](https://railway.app)
3. Подключи GitHub репозиторий к Railway

#### Шаг 2: Настройка PostgreSQL

1. В Railway проекте нажми "New Project" → "Database" → "Add PostgreSQL"
2. Railway автоматически создаст базу данных
3. Скопируй `DATABASE_URL` из переменных окружения PostgreSQL

#### Шаг 3: Настройка Backend Service

1. В Railway проекте нажми "New Project" → "Deploy from GitHub repo"
2. Выбери свой репозиторий
3. Railway автоматически использует `railway.json` для сборки

4. Добавь переменные окружения в Backend service:
   ```
   DATABASE_URL = ${{Postgres.DATABASE_URL}}
   JWT_SECRET = твой_длинный_секретный_ключ_минимум_32_символов
   ADMIN_TOKEN = твой_админ_токен
   CORS_ORIGINS = *
   PORT = 3000
   ```

#### Шаг 4: Деплой

1. Railway автоматически начнет сборку и деплой
2. После завершения получишь URL: `https://your-service.up.railway.app`
3. Проверь работу:
   - `GET https://your-service.up.railway.app/health` — должен вернуть `{"ok": true}`
   - `GET https://your-service.up.railway.app/ready` — должен вернуть `{"ok": true}`

#### Шаг 5: Инициализация базы данных

1. После первого деплоя база данных автоматически создаст все таблицы
2. Инициализируются фракции, территории и ранги
3. Сервер готов к работе

---

### Вариант 2: Локальный запуск через Docker

#### Требования
- Docker Desktop (установлен и запущен)
- Docker Compose

#### Шаг 1: Клонирование и установка

```bash
git clone <твой-репозиторий>
cd gta-rp-core
npm install
```

#### Шаг 2: Запуск через Docker Compose

```bash
npm run docker:up
```

Это запустит:
- PostgreSQL на порту 5432
- Backend API на порту 3000

#### Шаг 3: Проверка работы

```bash
curl http://localhost:3000/health
```

Должно вернуть: `{"ok": true}`

#### Шаг 4: Просмотр логов

```bash
npm run docker:logs
```

#### Шаг 5: Остановка

```bash
npm run docker:down
```

---

### Вариант 3: Локальный запуск без Docker

#### Требования
- Node.js 20+
- PostgreSQL 16

#### Шаг 1: Установка PostgreSQL

**Windows:**
1. Скачай PostgreSQL с [официального сайта](https://www.postgresql.org/download/windows/)
2. Установи с паролем `gta_password`
3. Создай базу данных `gta_rp`

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo -u postgres psql
CREATE DATABASE gta_rp;
CREATE USER gta_user WITH PASSWORD 'gta_password';
GRANT ALL PRIVILEGES ON DATABASE gta_rp TO gta_user;
\q
```

#### Шаг 2: Клонирование и установка

```bash
git clone <твой-репозиторий>
cd gta-rp-core
npm install
```

#### Шаг 3: Настройка .env

Создай файл `packages/server/.env`:
```env
DATABASE_URL=postgresql://gta_user:gta_password@localhost:5432/gta_rp
PORT=3000
JWT_SECRET=твой_длинный_секретный_ключ_минимум_32_символов
ADMIN_TOKEN=твой_админ_токен
CORS_ORIGINS=*
```

#### Шаг 4: Сборка проекта

```bash
npm run build
```

#### Шаг 5: Запуск сервера

```bash
npm run dev:server
```

Сервер запустится на `http://localhost:3000`

---

## 🎮 Запуск alt:V сервера

### Шаг 1: Установка alt:V Server

1. Скачай alt:V Server с [официального сайта](https://altv.mp/)
2. Распакуй в папку, например `C:\altv-server`

### Шаг 2: Настройка alt:V Server Bridge

Создай файл `packages/altv-server/.env`:
```env
API_BASE_URL=http://localhost:3000
# Если Railway:
# API_BASE_URL=https://your-service.up.railway.app
```

### Шаг 3: Сборка клиентских скриптов

```bash
npm run build
```

### Шаг 4: Синхронизация с alt:V

Скопируй собранные файлы в alt:V resources:
```bash
# Windows (PowerShell)
Copy-Item -Recurse -Force "packages\client\dist\*" "C:\altv-server\resources\gta-rp-core\client\"
Copy-Item -Recurse -Force "packages\altv-server\dist\*" "C:\altv-server\resources\gta-rp-core\server\"
Copy-Item -Recurse -Force "packages\client\src\ui" "C:\altv-server\resources\gta-rp-core\ui\"
```

### Шаг 5: Настройка resource.toml

Создай `C:\altv-server\resources\gta-rp-core\resource.toml`:
```toml
type: "js"
client: "client/index.js"
server: "server/index.js"
main: "server/index.js"
```

### Шаг 6: Настройка server.toml

Отредактируй `C:\altv-server\server.toml`:
```toml
name: "GTA RP Server"
host: "0.0.0.0"
port: 7788
players: 128
password: ""
announce: false
token: ""
language: "ru"
debug: false
```

Добавь в секцию `resources`:
```toml
resources: [
  "gta-rp-core"
]
```

### Шаг 7: Запуск alt:V Server

Запусти `altv-server.exe`

### Шаг 8: Подключение к серверу

1. Открой alt:V Multiplayer
2. В адресной строке введи: `connect localhost`
3. Создай аккаунт и персонажа

---

## 📱 API Endpoints

### Авторизация
- `POST /auth/register` — Регистрация
- `POST /auth/login` — Вход

### Персонажи
- `GET /characters` — Список персонажей
- `POST /characters` — Создать персонажа
- `POST /characters/select` — Выбрать персонажа

### Экономика
- `POST /economy/salary` — Выплата зарплаты

### Инвентарь
- `GET /inventory-full/me` — Мой инвентарь
- `POST /inventory/use` — Использовать предмет

### Машины
- `GET /vehicles/catalog` — Каталог машин
- `GET /vehicles/me` — Мои машины
- `POST /vehicles/buy` — Купить машину
- `POST /vehicles/spawn` — Заспавнить
- `POST /vehicles/despawn` — Убрать
- `POST /vehicles/keys/give` — Передать ключи
- `POST /vehicles/impound` — Штрафстоянка
- `POST /vehicles/tuning/insurance` — Страховка

### Фракции
- `GET /factions/me` — Моя фракция
- `POST /factions/join` — Вступить в фракцию
- `POST /factions/duty` — Выйти/войти на дежурство

### И другие системы...
- Чат, дома, бизнесы, NPC магазины, гаражи, анимации, телефон, семья, планшет, маркетплейс и т.д.

---

## 🔧 Управление через CEF UI

### Горячие клавиши
- `F1` — Меню взаимодействия
- `I` — Инвентарь
- `F2` — Меню взаимодействия
- `T` — Планшет
- `ESC` — Закрыть UI

### Управление машиной
- `J` — Включить/выключить двигатель
- `L` — Открыть/закрыть машину

---

## 📝 Полный список систем

**Правительственные фракции:**
- LSPD (Полиция Лос-Сантоса)
- FIB (Федеральное бюро расследований)
- EMS (Скорая помощь)
- SWAT (Спецназ)

**ОПГ:**
- Балласы
- Вагос
- Фамилиас
- Ацтекас
- Мара Salvatrucha
- Sang

**Мафии:**
- Русская мафия
- Итальянская мафия
- Картель
- Якудза

**Работы:**
- Курьер, Шахтер, Таксист, Медик, Механик, Эвакуатор, Дальнобойщик, Инкассатор, Мусорщик, Автобусник, Почтальон, Фермер, Рыбак, Лесоруб, Доставка пиццы, Официант, Бармен, Кладовщик, Строитель, Развозчик топлива, Дворник

---

## 🆘 Поддержка

Для проблем с запуском проверь:
1. PostgreSQL запущен и доступен
2. Все зависимости установлены (`npm install`)
3. .env файлы настроены правильно
4. Порты не заняты (3000, 5432, 7788)

---

## 📄 Лицензия

MIT License
