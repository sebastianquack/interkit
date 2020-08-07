FROM node:12 as builder

# copy all package.json
COPY shared/package*.json /app/shared/
COPY api/package*.json    /app/api/
COPY player/package*.json /app/player/
COPY author/package*.json /app/author/
COPY admin/package*.json  /app/admin/
COPY package*.json /app/

WORKDIR /app

# npm install 
RUN npm run install:all

COPY ./ /app

# build 
RUN npm run build:all

FROM node:12-alpine

COPY --from=builder /app/api /app/api
WORKDIR /app/api

RUN ls -l public/*

EXPOSE 9000
ENV PORT=9000
CMD ["npm", "run", "migrate+start" ]