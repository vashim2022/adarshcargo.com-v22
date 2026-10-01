# Adarsh Cargo — Production-ready Angular + Node.js + MongoDB

A fresh full-stack cargo website for **adarshcargo.com**. It includes a premium responsive customer website, shipment tracking, quote/contact forms, REST API, MongoDB persistence, health checks, Docker deployment, and Nginx reverse proxy.

## Stack
- Angular 20 standalone frontend + SCSS
- Node.js 22 + Express 5
- MongoDB 8
- Docker / Docker Compose
- Nginx

## Local development
1. Install Node.js 22+ and MongoDB, or use Docker.
2. Backend:
   ```bash
   cd backend
   cp .env.example .env
   npm install
   npm run dev
   ```
3. Frontend:
   ```bash
   cd frontend
   npm install
   npm start
   ```
4. Open `http://localhost:4200`.

## Docker deployment
```bash
docker compose up -d --build
```
Open `http://SERVER_IP`.

For `adarshcargo.com`, point DNS A records for `@` and `www` to the server IP, then configure TLS. The included Nginx config proxies `/api` to Node and serves the Angular SPA.

## Production environment
Copy `.env.example` to `.env` and set a strong JWT secret and MongoDB credentials. Do not commit `.env`.

## API
- `GET /api/health`
- `GET /api/content/home`
- `GET /api/services`
- `GET /api/shipments/track/:awb`
- `POST /api/quotes`
- `POST /api/enquiries`
- `POST /api/shipments` (admin-protected)
- `PATCH /api/shipments/:id/status` (admin-protected)

The seed script creates demo services, content, and a sample shipment. Run:
```bash
cd backend
npm run seed
```

## Admin
This starter keeps the customer-facing application production-oriented while exposing protected shipment-management endpoints. A dedicated admin UI can be added against the same API without changing the data model.

## Authentication & Admin

Routes:
- `/login` — customer/admin sign in
- `/register` — customer registration
- `/admin` — protected admin dashboard

Run the seed script once after the API is running to create the demo admin and demo shipment:

```bash
docker compose exec api npm run seed
```

Default local admin:
- Email: `admin@adarshcargo.com`
- Password: `Admin@12345`

Change these before production using `ADMIN_EMAIL` and `ADMIN_PASSWORD` environment variables, and set a strong `JWT_SECRET`.

## Mongo Express (database web UI)

After `docker compose up --build -d`, open **http://localhost:8081** to inspect the MongoDB database in a browser.

Default local Mongo Express login:
- Username: `admin`
- Password: `change-me-too`

For a safer local setup, create a `.env` file beside `docker-compose.yml` and set:

```env
MONGO_ROOT_USERNAME=adarsh
MONGO_ROOT_PASSWORD=your-mongodb-root-password
MONGO_EXPRESS_USERNAME=admin
MONGO_EXPRESS_PASSWORD=your-mongo-express-password
```

Keep the `.env` file out of Git. The existing `mongo_data` Docker volume is retained unless you explicitly run `docker compose down -v`.
