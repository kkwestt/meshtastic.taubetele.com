# Building fontend
FROM node:20-alpine AS build

COPY . /opt/app

WORKDIR /opt/app

RUN npm install --omit="dev"
RUN npm run build

# Serving static
FROM nginx:mainline-alpine

COPY --from=build /opt/app/dist /usr/share/nginx/html

EXPOSE 80

CMD nginx -g 'daemon off;'