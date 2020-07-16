# ... APP

## dev setup

1. create .env file
```sh
cd api
cp .env.example .env
cd -
```

2. npm install
```sh
cd api && npm i; cd -
cd shared && npm i; cd -
cd author && npm i; cd -
cd admin && npm i; cd -
cd player && npm i; cd -
```

2. run local minio (S3 service) and mongodb
```sh
cd services
docker-compose up -d
cd -
```
(takes about 30 sec to start)

3. run api (and keep running)
```sh
cd api && npm run dev
```

4. run author
````sh
cd author && npm run dev
# open http://localhost:8080
````

5. run player
````sh
cd player && npm run dev
# open http://localhost:8081
````

5. run admin
````sh
cd admin && npm start
# open http://localhost:3000
````

6. more tools
- Mongo Express: `http://localhost:9001/`
- Minio: `http://localhost:9002/`
- Swagger API documentation: `http://localhost:9000/api`

## migrations

based on https://github.com/tj/node-migrate

create migration: 
- `npm run migrate:create some-description` and edit the new file in `migrations/`

run migrations:
- `npm run migrate:up` migrate up to latest
- `npm run migrate:down` migrate all the way down
- `npm run migrate:up -- 1594365150587-files-refactor.js` migrate up to a certain migration
- `npm run migrate:down -- 1594365150587-files-refactor.js` migrate down to a certain migration

