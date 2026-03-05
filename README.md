# Sales Microservice Platform

A comprehensive, production-ready microservices-based Sales Management System built with modern technologies. This platform enables businesses to manage customers, orders, invoices, and payments with a robust multi-tenant architecture supporting Role-Based Access Control (RBAC).

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Microservices](#microservices)
  - [Auth Service](#1-auth-service)
  - [Customer Service](#2-customer-service)
  - [Order Service](#3-order-service)
  - [Invoice Service](#4-invoice-service)
  - [Payment Service](#5-payment-service)
  - [Frontend UI](#6-frontend-ui)
- [Technology Stack](#technology-stack)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Documentation](#api-documentation)
- [Data Models](#data-models)
- [Security](#security)
- [Inter-Service Communication](#inter-service-communication)
- [Development](#development)

---

## Overview

The Sales Microservice Platform is designed to handle the complete sales lifecycle for businesses:

1. **User & Organization Management** - Multi-tenant support with organizations and role-based permissions
2. **Customer Management** - Create and manage customer records
3. **Order Management** - Create, update, confirm, and cancel orders with line items
4. **Invoice Generation** - Generate invoices from confirmed orders with tax calculation
5. **Payment Processing** - Record payments against invoices with multiple payment methods

### Why Microservices?

- **Scalability**: Each service can be scaled independently based on demand
- **Maintainability**: Smaller, focused codebases are easier to understand and maintain
- **Fault Isolation**: Failures in one service don't cascade to others
- **Technology Flexibility**: Services can use different technologies if needed
- **Team Autonomy**: Different teams can work on different services independently

---

## Architecture

```
                                    ┌─────────────────────────────────────────────────────────────┐
                                    │                         NGINX                               │
                                    │                    (API Gateway/Proxy)                      │
                                    │                        Port 80                              │
                                    └─────────────────────────────────────────────────────────────┘
                                                              │
                    ┌─────────────────────┬───────────────────┼───────────────────┬─────────────────────┐
                    │                     │                   │                   │                     │
                    ▼                     ▼                   ▼                   ▼                     ▼
        ┌───────────────────┐ ┌───────────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌───────────────────┐
        │   Auth Service    │ │ Customer Service  │ │  Order Service  │ │ Invoice Service │ │ Payment Service   │
        │    /api/auth/*    │ │ /api/customers/*  │ │  /api/orders/*  │ │ /api/invoices/* │ │  /api/payments/*  │
        │    Port 8000      │ │    Port 8000      │ │   Port 8000     │ │   Port 8000     │ │    Port 8000      │
        └───────────────────┘ └───────────────────┘ └─────────────────┘ └─────────────────┘ └───────────────────┘
                │                     │                   │                   │                     │
                └─────────────────────┴───────────────────┴───────────────────┴─────────────────────┘
                                                          │
                                                          ▼
                                            ┌───────────────────────────┐
                                            │       MySQL Database      │
                                            │        Port 3306          │
                                            └───────────────────────────┘
                                            
        ┌───────────────────────────────────────────────────────────────────────────────────────────────┐
        │                                    Frontend (Next.js)                                         │
        │                                      Port 3000                                                │
        │                               Served via NGINX at /                                           │
        └───────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Request Flow

1. **Client** sends request to NGINX (port 80)
2. **NGINX** routes the request:
   - `/api/*` routes → Backend microservices
   - `/` → Frontend (Next.js)
3. **Backend services** validate JWT tokens and check permissions
4. **Inter-service calls** use HTTP with forwarded authentication headers
5. **Response** flows back through NGINX to the client

---

## Microservices

### 1. Auth Service

**Location**: `sales-auth-service/`

**Purpose**: Handles authentication, authorization, and multi-tenant organization management.

#### Features
- User registration with organization creation
- User login with JWT token generation
- Role-Based Access Control (RBAC)
- Multi-tenant support (organizations)

#### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/auth/health` | Health check |
| POST | `/auth/signup` | Register new organization & user |
| POST | `/auth/login` | Authenticate user and get JWT token |

#### Data Models

**Organization**
- `id`: Primary key
- `name`: Organization display name
- `slug`: Unique identifier for login (e.g., `acme-corp`)
- `created_at`: Timestamp

**User**
- `id`: Primary key
- `email`: User email (unique)
- `password_hash`: Bcrypt hashed password
- `is_active`: Account status
- `is_verified`: Email verification status
- `created_at`: Timestamp

**Roles & Permissions**
- Pre-defined roles: `OWNER`, `ADMIN`, `SALES`, `ACCOUNTANT`
- Granular permissions for each resource action

#### Permissions Matrix

| Permission | Description |
|------------|-------------|
| `customer.create` | Create new customers |
| `customer.read` | View customer information |
| `customer.update` | Update customer details |
| `customer.delete` | Delete customers |
| `order.create` | Create new orders |
| `order.read` | View orders |
| `order.update` | Modify orders |
| `order.confirm` | Confirm orders |
| `order.cancel` | Cancel orders |
| `invoice.create` | Generate invoices |
| `invoice.read` | View invoices |
| `invoice.update` | Update invoice status |
| `invoice.cancel` | Cancel invoices |
| `payment.create` | Record payments |
| `payment.read` | View payment history |
| `payment.refund` | Process refunds |

---

### 2. Customer Service

**Location**: `sales-customer-service/`

**Purpose**: Manages customer records for organizations.

#### Features
- Create, read, update customers
- Organization-scoped customer data
- Customer existence validation for other services

#### API Endpoints

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/customers/health` | Health check | - |
| POST | `/customers/create-customer` | Create a new customer | `customer.create` |
| GET | `/customers/` | List all customers (paginated) | `customer.read` |
| GET | `/customers/{id}` | Get single customer | `customer.read` |
| GET | `/customers/{id}/exists` | Check if customer exists | Auth only |
| PUT | `/customers/{id}` | Update customer | `customer.update` |

#### Data Model

**Customer**
- `id`: Primary key
- `organization_id`: Tenant identifier
- `name`: Customer name
- `email`: Customer email (unique)
- `created_by_user_id`: User who created the record
- `created_at`: Timestamp

---

### 3. Order Service

**Location**: `sales-order-service/`

**Purpose**: Manages sales orders with line items.

#### Features
- Create orders with multiple line items
- Order status management (CREATED → CONFIRMED → CANCELLED)
- Customer validation via Customer Service
- Order total calculation

#### API Endpoints

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/orders/health` | Health check | - |
| POST | `/orders/` | Create a new order | `order.create` |
| GET | `/orders/` | List orders (paginated, filterable) | `order.read` |
| GET | `/orders/{id}` | Get single order with items | `order.read` |
| PUT | `/orders/{id}` | Update order items | `order.update` |
| POST | `/orders/{id}/confirm` | Confirm order | `order.confirm` |
| POST | `/orders/{id}/cancel` | Cancel order | `order.cancel` |

#### Order Status Flow

```
CREATED ──────► CONFIRMED ──────► (Invoice can be created)
    │
    └──────────► CANCELLED
```

#### Data Models

**Order**
- `id`: Primary key
- `organization_id`: Tenant identifier
- `customer_id`: Reference to customer
- `status`: `CREATED` | `CONFIRMED` | `CANCELLED`
- `created_by_user_id`: User who created the order
- `created_at`: Timestamp

**OrderItem**
- `id`: Primary key
- `order_id`: Foreign key to Order
- `product_name`: Item description
- `quantity`: Number of units
- `unit_price`: Price per unit

---

### 4. Invoice Service

**Location**: `sales-invoice-service/`

**Purpose**: Generates and manages invoices from confirmed orders.

#### Features
- Invoice generation from confirmed orders
- Automatic tax calculation (18% GST)
- Discount support (flat or percentage)
- Invoice status management
- Due date tracking (30 days default)

#### API Endpoints

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/invoices/health` | Health check | - |
| POST | `/invoices/orders/{order_id}` | Create invoice from order | `invoice.create` |
| GET | `/invoices/` | List invoices (filterable) | `invoice.read` |
| GET | `/invoices/{id}` | Get single invoice | `invoice.read` |
| POST | `/invoices/{id}/cancel` | Cancel invoice | `invoice.cancel` |
| POST | `/invoices/{id}/status` | Update invoice status | `invoice.update` |

#### Invoice Status Flow

```
UNPAID ──────► PARTIALLY_PAID ──────► PAID
   │                │
   │                └──────────────► REFUNDED
   │
   └─────────► CANCELLED
   │
   └─────────► OVERDUE (automatic based on due_date)
```

#### Data Model

**Invoice**
- `id`: Primary key
- `organization_id`: Tenant identifier
- `order_id`: Reference to order (unique - one invoice per order)
- `subtotal`: Sum of all items
- `tax`: Calculated tax amount (18%)
- `total`: Grand total (subtotal + tax - discount)
- `discount_type`: `FLAT` | `PERCENT` | null
- `discount_value`: Discount amount/percentage
- `due_date`: Payment due date
- `status`: `UNPAID` | `PARTIALLY_PAID` | `PAID` | `OVERDUE` | `CANCELLED` | `REFUNDED`
- `created_by_user_id`: User who created the invoice
- `created_at`: Timestamp

---

### 5. Payment Service

**Location**: `sales-payment-service/`

**Purpose**: Records and manages payments against invoices.

#### Features
- Multiple payment methods (CASH, CARD, UPI, BANK_TRANSFER)
- Partial payment support
- Automatic invoice status updates
- Payment refunds
- Payment history tracking

#### API Endpoints

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/payments/health` | Health check | - |
| POST | `/payments/pay` | Record a payment | `payment.create` |
| GET | `/payments/invoice/{invoice_id}` | Get payments for invoice | `payment.read` |
| POST | `/payments/refund/{invoice_id}` | Refund all payments for invoice | `payment.refund` |

#### Payment Methods
- `CASH` - Cash payment
- `CARD` - Credit/Debit card
- `UPI` - UPI transfer
- `BANK_TRANSFER` - Bank wire transfer

#### Data Model

**Payment**
- `id`: Primary key
- `organization_id`: Tenant identifier
- `invoice_id`: Reference to invoice
- `amount`: Payment amount (must be > 0)
- `payment_method`: Payment type
- `created_by_user_id`: User who recorded the payment
- `paid_at`: Payment timestamp
- `note`: Optional payment notes

---

### 6. Frontend UI

**Location**: `sales-invoice-ui/`

**Purpose**: Modern web interface for the Sales platform.

#### Technology
- **Framework**: Next.js 16.1 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **UI Components**: Radix UI primitives
- **Charts**: Recharts
- **Animations**: Framer Motion
- **Notifications**: Sonner

#### Pages

| Route | Description |
|-------|-------------|
| `/auth/login` | User login |
| `/auth/signup` | Organization registration |
| `/` | Dashboard with analytics |
| `/customers` | Customer management |
| `/orders` | Order listing and management |
| `/orders/[id]/create-invoice` | Create invoice from order |
| `/invoices` | Invoice listing |
| `/invoices/[id]` | Invoice details |
| `/invoices/[id]/pay` | Record payment |

#### Dashboard Features
- Revenue overview
- Invoice status distribution (Pie chart)
- Revenue trends (Line chart)
- Key metrics (Total orders, customers, invoices)

---

## Technology Stack

| Component | Technology |
|-----------|------------|
| **Backend Framework** | FastAPI (Python) |
| **Frontend Framework** | Next.js 16 (React 19) |
| **Database** | MySQL 8.4 |
| **API Gateway** | NGINX |
| **Containerization** | Docker & Docker Compose |
| **Authentication** | JWT (JSON Web Tokens) |
| **Password Hashing** | Bcrypt |
| **ORM** | SQLAlchemy |
| **Validation** | Pydantic |

---

## Getting Started

### Prerequisites

- Docker & Docker Compose
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Sales-microservice
   ```

2. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start all services**
   ```bash
   docker-compose up -d
   ```

4. **Verify services are running**
   ```bash
   docker-compose ps
   ```

5. **Access the application**
   - Frontend: http://localhost
   - API Documentation (Development mode):
     - Auth: http://localhost/api/auth/docs
     - Customers: http://localhost/api/customers/docs
     - Orders: http://localhost/api/orders/docs
     - Invoices: http://localhost/api/invoices/docs
     - Payments: http://localhost/api/payments/docs

### First Steps

1. **Sign up** with a new organization at `/auth/signup`
2. **Create customers** from the Customers page
3. **Create orders** for customers with line items
4. **Confirm orders** to make them ready for invoicing
5. **Generate invoices** from confirmed orders
6. **Record payments** against invoices

---

## Environment Variables

Create a `.env` file in the project root:

```env
# Database Configuration
MYSQL_ROOT_PASSWORD=
MYSQL_DATABASE=
MYSQL_USER=
MYSQL_PASSWORD=

# Database Connection String
DATABASE_URL=mysql+pymysql://:@mysql-db:3306/sales_db

# Environment (development/production)
# In production, API docs are disabled
ENVIRONMENT=development

# JWT Configuration
JWT_SECRET_KEY=your-secure-secret-key
ACCESS_TOKEN_EXPIRE_MINUTES=
```

### Frontend Environment

Create `sales-invoice-ui/.env.production`:

```env
NEXT_PUBLIC_API_URL=/api
```

---

## API Documentation

When running in development mode (`ENVIRONMENT=development`), Swagger UI documentation is available:

| Service | Documentation URL |
|---------|-------------------|
| Auth | `/api/auth/docs` |
| Customer | `/api/customers/docs` |
| Order | `/api/orders/docs` |
| Invoice | `/api/invoices/docs` |
| Payment | `/api/payments/docs` |

> **Note**: In production mode, API documentation is disabled for security.

---

## Data Models

### Entity Relationship

```
Organization
     │
     ├── Users (via OrganizationUser)
     │     └── Roles (via UserRole)
     │           └── Permissions (via RolePermission)
     │
     ├── Customers
     │     └── Orders
     │           └── OrderItems
     │                 └── Invoice (one per order)
     │                       └── Payments (many per invoice)
```

### Multi-Tenancy

All business data is scoped by `organization_id`:
- Customers belong to an organization
- Orders belong to an organization and reference customers
- Invoices belong to an organization and reference orders
- Payments belong to an organization and reference invoices

This ensures complete data isolation between tenants.

---

## Security

### Authentication Flow

```
1. User submits credentials (email + password + org_slug)
        │
        ▼
2. Auth Service validates credentials
        │
        ▼
3. JWT token generated with:
   - user_id
   - org_id  
   - permissions[]
        │
        ▼
4. Token returned to client
        │
        ▼
5. Client includes token in Authorization header:
   Authorization: Bearer <token>
```


### Permission Checking

Each protected endpoint uses the `require_permission` dependency:

```python
@router.post("/", response_model=OrderResponse)
def create_order(
    current_user = Depends(require_permission("order.create"))
):
    # Only executed if user has order.create permission
    ...
```

---

## Inter-Service Communication

Services communicate via HTTP REST calls with forwarded authentication:

### Example: Creating an Order

```
Order Service ──── validates customer ────► Customer Service
                   (with auth header)
```

### Example: Creating an Invoice

```
Invoice Service ──── fetches order details ────► Order Service
                     (with auth header)
```

### Service URLs (Internal Docker Network)

| Service | Internal URL |
|---------|--------------|
| Auth | `http://auth-service:8000` |
| Customer | `http://customer-service:8000` |
| Order | `http://order-service:8000` |
| Invoice | `http://invoice-service:8000` |
| Payment | `http://payment-service:8000` |

---

## Development

### Project Structure

```
Sales-microservice/
├── docker-compose.yaml          # Orchestration
├── .env                         # Environment variables
├── nginx/
│   └── nginx.conf              # API Gateway config
├── mysql-db/                   # Database data (mounted volume)
├── sales-auth-service/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── entrypoint.sh
│   └── app/
│       ├── main.py             # FastAPI app
│       ├── database.py         # DB connection
│       ├── init_db.py          # Table creation & seeding
│       ├── models/             # SQLAlchemy models
│       ├── schemas/            # Pydantic schemas
│       ├── routers/            # API routes
│       ├── services/           # Business logic
│       ├── security/           # JWT & password utils
│       └── exceptions/         # Custom exceptions
├── sales-customer-service/
│   └── app/
│       ├── main.py
│       ├── models/
│       ├── routers/
│       ├── services/
│       └── dependencies/       # Auth & permission deps
├── sales-order-service/
│   └── app/
│       ├── utils/
│       │   └── service_client.py  # Inter-service HTTP
│       └── ...
├── sales-invoice-service/
│   └── app/
│       └── ...
├── sales-payment-service/
│   └── app/
│       └── ...
└── sales-invoice-ui/
    ├── Dockerfile
    ├── package.json
    ├── app/                    # Next.js App Router
    │   ├── (dashboard)/        # Protected routes
    │   └── auth/               # Login/Signup
    ├── components/             # React components
    │   └── ui/                 # UI primitives
    ├── lib/
    │   ├── api.ts             # API client
    │   ├── auth-context.tsx   # Auth state
    │   └── utils.ts           # Utilities
    └── hooks/                  # Custom hooks
```

### Running Individual Services

```bash
# Run specific service
docker-compose up -d auth-service

# View logs
docker-compose logs -f order-service

# Rebuild after changes
docker-compose build order-service
docker-compose up -d order-service
```

### Database Migrations

Tables are automatically created on service startup via `init_db.py`. For schema changes:

1. Update the SQLAlchemy model
2. Rebuild and restart the service
3. Tables with new columns will be created (existing data preserved)

### Adding New Permissions

1. Add permission string to `sales-auth-service/app/init_db.py`:
   ```python
   permissions = [
       ...
       "new_resource.action",
   ]
   ```

2. Rebuild auth service:
   ```bash
   docker-compose build auth-service
   docker-compose up -d auth-service
   ```

3. Assign permission to roles via database

---

## Health Checks

Each service exposes a health endpoint:

```bash
# Check all services
curl http://localhost/api/auth/health
curl http://localhost/api/customers/health
curl http://localhost/api/orders/health
curl http://localhost/api/invoices/health
curl http://localhost/api/payments/health
```

Expected response: `{"status": "ok"}`

---

## License

This project is proprietary software. All rights reserved.

---

## Support

For issues and feature requests, please open a GitHub issue.
