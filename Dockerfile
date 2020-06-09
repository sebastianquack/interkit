FROM node:12 as builder

# copy all package.json
COPY shared/package*.json /app/shared/
COPY api/package*.json    /app/api/
COPY player/package*.json /app/player/
COPY author/package*.json /app/author/
COPY admin/package*.json  /app/admin/

WORKDIR /app

# npm install 
RUN cd shared && npm i
RUN cd api    && npm i
RUN cd player && npm i
RUN cd author && npm i
RUN cd admin  && npm i

COPY ./ /app

# build 
RUN mkdir api/public
RUN cd player && npm run build && mv public ../api/public/player
RUN cd author && npm run build && mv public ../api/public/author
RUN cd admin  && npm run build && mv build  ../api/public/admin

FROM node:12-alpine

COPY --from=builder /app/api /app/api
WORKDIR /app/api

RUN ls -l public/*

EXPOSE 8000
ENV PORT=8000
CMD ["npm", "start" ]