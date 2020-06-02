# ... APP

## dev setup

1. create .env file
````
cd api
cp .env.example .env
cd -
````

2. npm install
````
cd api && npm i && cd -
cd shared && npm i && cd -
cd author && npm i && cd -
cd admin && npm i && cd -
cd player && npm i && cd -
````

2. run local minio (S3 service) and mongodb
````
cd services
docker-compose up -d
cd -
````

3. run api (and keep running)
````
cd api && npm start
````

4. prepare configs
````
cd admin && npm start
````
Go to `http://localhost:3000` and add this entry to `configs`:
`fileServerURL` -> `http://localhost:9002/dreamshiplocal/`

5. run the rest
````
cd author && npm run dev
````
````
cd player && npm run dev
````
