FROM node:20-alpine AS build

# Добавляем аргумент для API ключа
ARG VITE_YANDEX_MAPS_API_KEY

WORKDIR /opt/app

RUN apk add --no-cache git
RUN git clone https://github.com/kkwestt/meshtastic.taubetele.com.git .

# Устанавливаем переменную окружения для сборки
ENV VITE_YANDEX_MAPS_API_KEY=$VITE_YANDEX_MAPS_API_KEY

RUN npm install --omit="dev"
RUN npm run build

FROM nginx:mainline-alpine

COPY --from=build /opt/app/dist /usr/share/nginx/html

EXPOSE 80

CMD nginx -g 'daemon off;'