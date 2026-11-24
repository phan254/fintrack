# FinTrack by Finnet Technologies

A portfolio and investment transaction tracking application built with Laravel and React. FinTrack helps users manage investment portfolios, record transactions, monitor holdings, and view portfolio performance.

## Features

### Authentication
- User registration and login.
- Laravel Sanctum token-based API authentication.
- Protected API routes.

### Portfolio Management
- Create, view, update, and delete portfolios.
- Associate portfolios with clients.
- Support for KES and USD currencies.
- Track initial portfolio balances.

### Investment Transactions
- Record BUY and SELL investment transactions.
- Support for the following instruments:
  - SCOM – Safaricom PLC
  - KCB – KCB Group
  - EQTY – Equity Group
  - T-BILL-91 – 91-Day Treasury Bill
- Record investment quantity, unit price, and trade date.
- Validate available holdings before processing sales.
- Record income and expense transactions.

### Holdings and Portfolio Summary
- Track investment holdings and quantities.
- Calculate weighted average purchase costs.
- Calculate current holding values and unrealized gains or losses.
- View cash balance and total portfolio value.
- View asset allocation by asset type.

### API Documentation
- OpenAPI specification.
- Interactive Swagger UI documentation.
- Protected endpoints documented with bearer-token authentication.

## Technology Stack

### Backend
- PHP
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

## Project Structure

```text
fintrack/
├── backend/
│   ├── app/
│   ├── database/
│   ├── routes/
│   ├── tests/
│   └── ...
├── frontend/
│   ├── src/
│   ├── public/
│   └── ...
└── README.md
```
## Architecture

FinTrack uses a client-server architecture:

- **Frontend:** A React single-page application built with Vite. It provides the user interface for authentication, portfolio management, investment transactions, holdings, and portfolio summaries.
- **Backend:** A Laravel REST API that handles authentication, business logic, validation, and portfolio calculations.
- **Database:** MySQL stores user accounts, portfolios, transactions, and investment holdings.
- **Authentication:** Laravel Sanctum issues bearer tokens used by the frontend to access protected API endpoints.
- **API documentation:** OpenAPI annotations generate interactive Swagger documentation.

The frontend communicates with the backend through HTTP requests using Axios. Investment calculations and transaction validation are handled by the backend rather than relying on frontend calculations.

## Technology Choices

- **Laravel:** Provides structured API development, database migrations, Eloquent ORM, request validation, and authentication support.
- **React:** Provides reusable interface components and a responsive single-page application.
- **MySQL:** Provides persistent relational storage for financial records.
- **Laravel Sanctum:** Provides token-based authentication for protected API routes.
- **OpenAPI / Swagger:** Makes the API easier to understand, test, and integrate with.

## Assumptions and Trade-offs

- FinTrack supports KES and USD portfolio currencies.
- Supported investment instruments are SCOM, KCB, EQTY, and T-BILL-91.
- BUY and SELL transactions are used to update investment quantities and weighted average purchase costs.
- A sale cannot exceed the available holding quantity.
- Portfolio and transaction records are scoped to the authenticated user.
- Investment valuations use recorded current prices; the application does not currently retrieve live market prices.
- Treasury Bill valuations are based on manually entered transaction and price information rather than an external market-data feed.
- The application is designed as an assessment prototype and does not currently provide brokerage execution, bank integrations, or financial advice.

## Future Improvements

- Integrate a reliable market-data provider for updated investment prices.
- Add CSV export for transactions and portfolio summaries.
- Add pagination and advanced filtering to investment views.
- Expand automated frontend and backend test coverage.
- Introduce continuous integration and automated deployment.
- Deploy the application with HTTPS and a managed production database.

## Requirements

Install the following before setting up the project:

- PHP 8.4 or compatible version.
- Composer.
- Node.js and npm.
- MySQL.
- A web browser.

## Installation and Setup

### 1. Clone the repository

```bash
git clone YOUR_REPOSITORY_URL
cd fintrack
```

Replace `YOUR_REPOSITORY_URL` with the actual Git repository URL.

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

Create the `fintrack_db` database in MySQL, then run:

```bash
php artisan migrate
```

Start the backend server:

```bash
php artisan serve
```

The backend will be available at:

`http://127.0.0.1:8000`

### 3. Set up the React frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at:

`http://localhost:5173`

### 4. Run the automated tests

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

`http://127.0.0.1:8000/api/documentation`

Swagger UI provides interactive documentation for the authentication, portfolio, transaction, and holdings endpoints.

Protected endpoints require a valid Laravel Sanctum bearer token.

## Main API Endpoints

All API endpoints are prefixed with `/api`.

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | Register a user |
| POST | `/auth/login` | Authenticate a user |
| GET | `/auth/me` | Get authenticated user |
| POST | `/auth/logout` | Log out |
| GET | `/portfolios` | List portfolios |
| POST | `/portfolios` | Create portfolio |
| GET | `/portfolios/{portfolio}` | View portfolio |
| PUT | `/portfolios/{portfolio}` | Update portfolio |
| DELETE | `/portfolios/{portfolio}` | Delete portfolio |
| GET | `/portfolios/{portfolio}/summary` | View investment summary |
| GET | `/portfolios/{portfolio}/transactions` | List transactions for a portfolio |
| POST | `/portfolios/{portfolio}/transactions` | Create a transaction for a portfolio |
| GET | `/transactions` | List transactions |
| POST | `/transactions` | Create transaction |
| GET | `/holdings` | List holdings |
| POST | `/holdings` | Create holding |
| GET | `/holdings/{holding}` | View holding |
| PUT | `/holdings/{holding}` | Update holding |
| DELETE | `/holdings/{holding}` | Delete holding |

See Swagger UI for request parameters, validation rules, and response details.

## Security

- Passwords are hashed before storage.
- Sanctum bearer tokens protect authenticated API routes.
- Portfolio and investment records are associated with authenticated users.
- Investment transactions validate quantities and available holdings.
- Environment configuration and credentials should not be committed to version control.

## Testing

The backend includes automated feature tests covering authentication, portfolio ownership, investment purchases, sales, validation, and portfolio summary calculations.

Run the backend test suite using:

```bash
php artisan test
```

## Project Branding

**FinTrack by Finnet Technologies**

A portfolio and investment tracking solution.

## AI Tool Usage

AI assistance was used during development to support:
- Reviewing and improving Laravel API implementation.
- Troubleshooting PHP, React, and configuration issues.
- Preparing and reviewing API documentation.
- Developing and refining project documentation.
- Reviewing automated test results and identifying missing requirements.

All generated suggestions were reviewed and tested within the project development environment. The developer remains responsible for the implementation, verification, and final submission.