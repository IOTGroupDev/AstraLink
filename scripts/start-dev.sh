#!/bin/bash

echo "🚀 Запуск dev окружения AstraLink..."

# Убиваем все процессы
echo "🔪 Убиваем процессы..."
pkill -f "node.*3000" || true
pkill -f "expo" || true
pkill -f "metro" || true
pkill -f "npm.*start" || true

# Ждем завершения
sleep 3

# Переходим в backend
cd /home/andreiya/CursorProjects/AstraLink/backend

# Применяем миграции
echo "📦 Применяем миграции..."
npx prisma migrate deploy

# Создаем тестового пользователя
echo "👤 Создаем тестового пользователя..."
npx prisma db seed

echo "✅ База готова!"

# Запускаем бэкенд
echo "🔧 Запускаем бэкенд..."
npm run start:dev &
BACKEND_PID=$!

# Ждем запуска бэкенда
sleep 5

# Переходим в frontend
cd /home/andreiya/CursorProjects/AstraLink/frontend

echo "🌐 Запускаем фронтенд..."
npm start &
FRONTEND_PID=$!

echo "✅ Оба сервиса запущены!"
echo "📱 Frontend: http://localhost:8081"
echo "🔧 Backend: http://localhost:3000"
echo "📚 API Docs: http://localhost:3000/api/docs"
echo ""
echo "👤 Тестовый пользователь:"
echo "   Email: test@test.com"
echo "   Password: password"

# Функция для корректного завершения
cleanup() {
    echo "🛑 Останавливаем сервисы..."
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    pkill -f "node.*3000" || true
    pkill -f "expo" || true
    exit 0
}

# Перехватываем Ctrl+C
trap cleanup SIGINT SIGTERM

# Ждем
wait

