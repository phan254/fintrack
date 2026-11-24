# FinTrack by Finnet Technologies

FinTrack is a portfolio and investment transaction tracking application built with Laravel and React. It enables users to manage investment portfolios, record financial transactions, monitor investment holdings, and review portfolio performance.

**Project:** Finnet Technologies Software Developer Technical Assessment
**Repository:** https://github.com/phan254/fintrack
**Status:** Assessment project

## Features

### Authentication
- User registration and login.
- Laravel Sanctum bearer-token authentication.
- Protected API endpoints.
- Password hashing and authenticated user access.

### Portfolio Management
- Create, view, update, and delete portfolios.
- Support for KES and USD currencies.
- Track initial portfolio balances.
- Restrict portfolio access to the authenticated owner.

### Investment Transactions
- Record BUY and SELL transactions.
- Support for the following investment instruments:
  - SCOM – Safaricom PLC
  - KCB – KCB Group
  - EQTY – Equity Group
  - T-BILL-91 – 91-Day Treasury Bill
- Record investment quantities, unit prices, and trade dates.
- Validate available holdings before processing sales.
- Record income and expense transactions.
- Delete transactions with automatic holding recalculation.
- Prevent deletion of an investment transaction when the remaining trade history would result in an invalid sale.

### Holdings and Portfolio Summary
- Track investment holdings and quantities.
- Calculate weighted average purchase costs.
- Calculate current holding values and unrealized gains or losses.
- View cash balance and total portfolio value.
- View asset allocation by asset type.

### API Documentation
- OpenAPI specification.
- Interactive Swagger UI.
- Documented authentication and protected API endpoints.

## Technology Stack

### Backend
- PHP 8.4
- Laravel 13
- Laravel Sanctum
- MySQL
- PHPUnit
- L5-Swagger / OpenAPI

### Frontend
- React
- Vite
- JavaScript
- Axios
- CSS

## Architecture

FinTrack uses a client-server architecture.

- **Frontend:** React single-page application built with Vite. It provides the user interface for authentication, portfolio management, transactions, holdings, and portfolio summaries.
- **Backend:** Laravel REST API responsible for authentication, validation, business logic, transaction processing, and investment calculations.
- **Database:** MySQL stores user accounts, portfolios, transactions, and holdings.
- **Authentication:** Laravel Sanctum provides bearer-token authentication for protected API routes.
- **API documentation:** OpenAPI annotations generate interactive Swagger documentation.

The frontend communicates with the backend through HTTP requests using Axios. Financial calculations and transaction validation are handled by the backend to maintain consistent business rules.

## Technology Choices

- **Laravel:** Provides API development tools, database migrations, Eloquent ORM, request validation, and authentication support.
- **React:** Supports reusable interface components and a responsive single-page application.
- **MySQL:** Provides relational storage for financial and investment records.
- **Laravel Sanctum:** Provides authentication for protected API endpoints.
- **OpenAPI / Swagger:** Makes the API easier to understand, test, and integrate with.
- **Vite:** Provides frontend development and production build tooling.

## Project Structure

```text
fintrack/
├── backend/
│   ├── app/
│   │   ├── Http/Controllers/Api/
│   │   └── Models/
│   ├── database/
│   │   ├── migrations/
│   │   └── seeders/
│   ├── routes/
│   ├── tests/
│   └── ...
├── frontend/
│   ├── public/
│   ├── src/
│   └── ...
└── README.md
```

## Requirements

Install the following before setting up the project:

- PHP 8.4 or a compatible version.
- Composer.
- Node.js and npm.
- MySQL.
- Git.
- A modern web browser.

## Installation and Setup

### 1. Clone the repository

```bash
git clone https://github.com/phan254/fintrack.git
cd fintrack
```

### 2. Set up the Laravel backend

```bash
cd backend
composer install
```

Create the environment file:

```bash
copy .env.example .env
```

Generate the application key:

```bash
php artisan key:generate
```

Configure the database connection in `backend/.env`:

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=fintrack_db
DB_USERNAME=root
DB_PASSWORD=
```

Create a MySQL database named `fintrack_db`, then run:

```bash
php artisan migrate
```

Start the backend development server:

```bash
php artisan serve
```

The backend will be available at:

`http://127.0.0.1:8000`

### 3. Set up the React frontend

Open another terminal from the project root:

```bash
cd frontend
npm install
```

Create or configure the frontend environment file using the API base URL expected by the frontend configuration.

For local development, the API base URL is:

`https://fintrack-production-e3993c19.up.railway.app/api`

Start the frontend:

```bash
npm run dev
```

The frontend will be available at:

`https://fintrack-jikx.onrender.com`

### 4. Run backend tests

From the backend directory:

```bash
php artisan test
```

### 5. Check frontend quality

From the frontend directory:

```bash
npm run lint
npm run build
```

## API Documentation


Start the Laravel backend and visit:

`https://fintrack-production-e3993c19.up.railway.app/api/documentation`

Swagger UI provides interactive documentation for authentication, portfolio, transaction, and holdings endpoints.

Protected endpoints require a valid Laravel Sanctum bearer token.

To regenerate the Swagger documentation:

```bash
php artisan l5-swagger:generate
```

## Main API Endpoints

All endpoints are prefixed with `/api`.

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | Register a user |
| POST | `/auth/login` | Authenticate a user |
| GET | `/auth/me` | Get authenticated user |
| POST | `/auth/logout` | Log out |

### Portfolios

| Method | Endpoint | Description |
|---|---|---|
| GET | `/portfolios` | List portfolios |
| POST | `/portfolios` | Create portfolio |
| GET | `/portfolios/{portfolio}` | View portfolio |
| PUT/PATCH | `/portfolios/{portfolio}` | Update portfolio |
| DELETE | `/portfolios/{portfolio}` | Delete portfolio |
| GET | `/portfolios/{portfolio}/summary` | View portfolio summary |
| GET | `/portfolios/{portfolio}/transactions` | List portfolio transactions |
| POST | `/portfolios/{portfolio}/transactions` | Create portfolio transaction |

### Transactions

| Method | Endpoint | Description |
|---|---|---|
| GET | `/transactions` | List transactions |
| POST | `/transactions` | Create transaction |
| GET | `/transactions/{transaction}` | View transaction |
| PUT/PATCH | `/transactions/{transaction}` | Update income or expense transaction |
| DELETE | `/transactions/{transaction}` | Delete transaction |

Investment BUY and SELL transactions cannot be edited directly. Deleting an investment transaction recalculates the associated holding from the remaining trade history.

### Holdings

| Method | Endpoint | Description |
|---|---|---|
| GET | `/holdings` | List holdings |
| POST | `/holdings` | Create holding |
| GET | `/holdings/{holding}` | View holding |
| PUT/PATCH | `/holdings/{holding}` | Update holding |
| DELETE | `/holdings/{holding}` | Delete holding |

See Swagger UI for request parameters, validation rules, and response details.

## Assumptions and Trade-offs

- FinTrack supports KES and USD portfolio currencies.
- Supported investment instruments are SCOM, KCB, EQTY, and T-BILL-91.
- BUY and SELL transactions update investment quantities and weighted average purchase costs.
- A sale cannot exceed the available holding quantity.
- Portfolio and transaction records are scoped to the authenticated user.
- Investment valuations use recorded current prices. The application does not currently retrieve live market prices.
- Treasury Bill valuations use recorded transaction and price information rather than an external market-data feed.
- The application is an assessment prototype and does not execute brokerage trades, integrate with banks, or provide financial advice.

## Security

- Passwords are hashed before storage.
- Sanctum bearer tokens protect authenticated API routes.
- Portfolio and investment records are associated with authenticated users.
- Investment transactions validate quantities and available holdings.
- Environment files and credentials must not be committed to version control.
- Production deployments should use HTTPS and secure environment configuration.

## Testing

The backend includes automated feature tests covering:

- Authentication and portfolio ownership.
- Portfolio creation.
- Investment purchases and weighted average costs.
- Investment sales and insufficient holdings validation.
- Unsupported investment instruments.
- Portfolio summary calculations.
- Investment transaction deletion and holding recalculation.

Run the backend test suite using:

```bash
php artisan test
```

Frontend quality checks:

```bash
npm run lint
npm run build
```

## Future Improvements

- Integrate a reliable market-data provider.
- Add CSV export for transactions and portfolio summaries.
- Expand automated frontend testing.
- Introduce continuous integration and automated deployment.
- Add more investment instruments.
- Deploy with HTTPS and a managed production database.

## Screenshots and Demo

Screenshots of the application and live demo links will be added here after deployment.

## Deployment

Production deployment details will be provided here after deployment:

- Frontend URL: To be added.
- Backend API URL: To be added.
- Swagger documentation URL: To be added.

The production application should use HTTPS, a managed database, production environment settings, and restricted CORS configuration.

## Demo Account

For assessment demonstration, the following local demo account is available:

- Email: `demo@fintrack.test`
- Password: `FinTrackDemo@2026`

These are local development credentials. Configure a separate demo account for the live deployment and do not reuse production secrets in this repository.

## AI Tool Usage

AI assistance was used during development to support:

- Reviewing and improving Laravel API implementation.
- Troubleshooting PHP, React, and configuration issues.
- Preparing and reviewing API documentation.
- Developing and refining project documentation.
- Reviewing automated test results and identifying missing requirements.

Generated suggestions were reviewed and tested within the project development environment. The developer remains responsible for the implementation, verification, and final submission.

## Project Branding

**FinTrack by Finnet Technologies**

A portfolio and investment tracking solution.
