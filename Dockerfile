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
RUN cd player && bin/build_and_copy
RUN cd author && bin/build_and_copy
RUN cd admin  && bin/build_and_copy

FROM node:12-alpine

COPY --from=builder /app/api /app/api
WORKDIR /app/api

RUN ls -l public/*

EXPOSE 9000
ENV PORT=9000
CMD ["npm", "migrate+start" ]