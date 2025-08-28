FROM node:20-alpine AS build

WORKDIR /opt/app

RUN apk add --no-cache git
RUN git clone https://github.com/kkwestt/meshtastic.taubetele.com.git .

RUN npm install --omit="dev"
RUN npm run build

FROM nginx:mainline-alpine

COPY --from=build /opt/app/dist /usr/share/nginx/html

EXPOSE 80

CMD nginx -g 'daemon off;'