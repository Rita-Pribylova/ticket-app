# Система учёта внутренних заявок (Fullstack)

Fullstack-разработка (FastAPI + React)

## Стек технологий
- **Backend:** Python 3, FastAPI, SQLAlchemy, SQLite, Pydantic, Uvicorn
- **Frontend:** React, TypeScript, Vite, Lucide React, CSS

## Как запустить бэкенд

1. Перейдите в папку бэкенда:
   ```bash
   cd backend
   ```
2. Создайте и активируйте виртуальное окружение:
   ```bash
   python -m venv .venv
   # Для Windows:
   .venv\Scripts\activate
   # Для macOS/Linux:
   source .venv/bin/activate
   ```
3. Установите зависимости:
   ```bash
   pip install fastapi uvicorn pydantic sqlalchemy
   ```
4. Запустите сервер разработки:
   ```bash
   uvicorn main:app --reload
   ```
   Бэкенд будет доступен по адресу: `http://127.0.0.1:8000`
   Интерактивная документация Swagger: `http://127.0.0`

## Как запустить фронтенд

1. Откройте новое окно терминала и перейдите в папку фронтенда:
   ```bash
   cd frontend
   ```
2. Установите зависимости Node.js:
   ```bash
   npm install
   ```
3. Запустите клиент:
   ```bash
   npm run dev
   ```
   Приложение откроется по адресу: `http://localhost:5173`

## Данные для авторизации администратора
- **Логин:** `admin`
- **Пароль:** `admin`
*(Администратор требуется для удаления заявок, не находящихся в статусе `done`).*
