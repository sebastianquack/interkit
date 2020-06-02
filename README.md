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
cd api && npm i && cd -
cd shared && npm i && cd -
cd author && npm i && cd -
cd admin && npm i && cd -
cd player && npm i && cd -
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
cd api && npm start
```

4. prepare configs
```sh
cd admin && npm start
# open http://localhost:3000
```
Log in with username `admin` and ADMIN_PASSWORD from api/.env and add this entry to `configs`:
key `fileServerURL`, value `http://localhost:9002/dreamshiplocal/`

5. run author
````sh
cd author && npm run dev
# open http://localhost:8080
````

6. run player
````sh
cd player && npm run dev
# open http://localhost:9000
````

7. more tools
- Mongo Express: `http://localhost:9001/`
- Minio: `http://localhost:9002/`
