FROM node:20.11.0 as build-stage

WORKDIR /app

RUN apt-get update

COPY package.json .

RUN npm install --save-dev

COPY . .

RUN npm run build

CMD ["echo", "Build success!"]

FROM node:20.11.0

WORKDIR /app  

COPY --from=build-stage /app/dist ./dist
COPY --from=build-stage /app/package.json . 
COPY --from=build-stage /app/node_modules ./node_modules
COPY --from=build-stage /app/.env .

EXPOSE 8000

CMD ["npm", "start"]