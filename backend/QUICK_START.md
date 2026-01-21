# Quick Start Guide

Get the MySQL-backed HR System up and running in 5 minutes.

## Prerequisites

- Node.js 18+
- MySQL 8+
- npm or yarn

## Setup Steps

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Database

Create `.env` file:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=hr_system
DB_PORT=3306
```

### 3. Create Database Schema

```bash
npm run migrate
```

### 4. Start Server

```bash
npm start
```

### 5. Test API

```bash
# Health check
curl http://localhost:4000/api/health

# Create contract
curl -X POST http://localhost:4000/api/contracts \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "position": "Software Engineer",
    "assessmentDate": "2024-01-15T10:00:00",
    "basicSalary": 50000,
    "termMonths": 12
  }'
```

## File Structure

```
backend/
├── src/
│   ├── config/database.js       # Database connection
│   ├── models/contractStore.js  # Repository layer
│   ├── routes/contracts.js      # Express routes
│   ├── controllers/             # Request handlers
│   ├── middlewares/             # Validation & error handling
│   └── database/schema.sql      # SQL schema
└── .env                         # Configuration
```

## API Endpoints

- `POST /api/contracts` - Create contract
- `GET /api/contracts` - List all contracts
- `GET /api/contracts/:id` - Get contract by ID
- `PUT /api/contracts/:id` - Update contract
- `DELETE /api/contracts/:id` - Delete contract

## Common Issues

**Database connection failed:**
- Check MySQL is running
- Verify credentials in `.env`
- Run migration: `npm run migrate`

**Port already in use:**
- Change `PORT` in `.env`
- Or kill process using port 4000

**Validation errors:**
- Check required fields: name, position, assessmentDate, basicSalary, termMonths
- Ensure numeric fields are >= 0
- Verify dates are valid format

For detailed documentation, see `PRODUCTION_DELIVERY.md`.
