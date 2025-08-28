#!/bin/bash

set -e

echo "🚀 Деплой Meshtastic Frontend на порт 82..."

# Загружаем переменные окружения из .env файла
if [ -f .env ]; then
    echo "📋 Загрузка переменных окружения из .env..."
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "⚠️  Файл .env не найден! Создайте его с VITE_YANDEX_MAPS_API_KEY"
    exit 1
fi

# Проверяем наличие обязательной переменной
if [ -z "$VITE_YANDEX_MAPS_API_KEY" ]; then
    echo "❌ VITE_YANDEX_MAPS_API_KEY не установлен в .env файле!"
    exit 1
fi

echo "✅ API ключ найден: ${VITE_YANDEX_MAPS_API_KEY:0:10}..."

# Останавливаем если запущен
echo "⏹️  Остановка контейнера..."
docker-compose down 2>/dev/null || true

# Удаляем конкретный контейнер если существует
echo "🗑️  Удаление старого контейнера..."
docker rm -f meshtastic_taubetele_com_82 2>/dev/null || true

# Очистка неиспользуемых образов
echo "🧹 Очистка неиспользуемых образов..."
docker image prune -f

# Сборка
echo "🔨 Сборка образа..."
docker-compose build --no-cache

# Запуск
echo "▶️  Запуск..."
docker-compose up -d

# Проверка
echo "⏳ Проверка запуска..."
sleep 5

if docker ps | grep -q "meshtastic_taubetele_com_82"; then
    echo "✅ Контейнер meshtastic_taubetele_com_82 запущен"
    echo "🌐 Приложение доступно на порту 82"
else
    echo "❌ Ошибка запуска"
    docker-compose logs
    exit 1
fi

echo "🎉 Деплой завершен!"
