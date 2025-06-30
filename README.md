# Leads by Kary

A Next.js web application for searching and managing business leads using Google Places API with PostgreSQL database.

## Features

- **Authentication & User Management**
  - Email/password signup and login with bcrypt encryption
  - JWT-based authentication with HTTP-only cookies
  - User profile management (name, email, phone, address, etc.)

- **Business Search**
  - Free-text search for businesses by city, state, ZIP, category, or name
  - Google Places API integration with exponential backoff retry logic
  - Local caching with PostgreSQL for faster subsequent searches
  - Force fresh fetch option to bypass cache

- **Security & Performance**
  - Input validation and sanitization
  - Rate limiting and error handling
  - Responsive design with Tailwind CSS
  - Production-ready Docker configuration

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, PostgreSQL with pg driver
- **Authentication**: bcrypt, jsonwebtoken, HTTP-only cookies
- **External APIs**: Google Places Text Search API
- **Deployment**: Docker, Vercel-ready configuration

## Quick Start

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd leads-by-kary
npm install
```

### 2. Environment Setup

Copy the environment template and fill in your values:

```bash
cp env.example .env.local
```

Required environment variables:
```bash
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/leads_by_kary

# Google Places API Key (get from Google Cloud Console)
GOOGLE_PLACES_KEY=your_google_places_api_key_here

# JWT Secret (generate a secure random string)
JWT_SECRET=your_jwt_secret_here_use_crypto_random_bytes

# Next.js Environment
NEXTAUTH_URL=http://localhost:3000
```

### 3. Database Setup

#### Option A: Using Docker Compose (Recommended)

```bash
# Start PostgreSQL and the application
docker-compose up -d

# The database will be automatically initialized with the schema
```

#### Option B: Manual PostgreSQL Setup

1. Install PostgreSQL locally
2. Create database: `createdb leads_by_kary`
3. Run schema: `psql leads_by_kary < schema.sql`

### 4. Start Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

## API Documentation

### Authentication Endpoints

#### POST /api/auth/signup
Create a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123",
  "name": "John Doe",
  "phone": "555-0123",
  "address": "123 Main St",
  "city": "Anytown",
  "country": "USA"
}
```

#### POST /api/auth/login
Authenticate an existing user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

#### POST /api/auth/logout
Clear authentication session.

### Search Endpoints

#### POST /api/search
Search for places using local cache or Google Places API.

**Request Body:**
```json
{
  "query": "restaurants in New York",
  "forceFresh": false
}
```

**Response:**
```json
{
  "places": [
    {
      "id": 1,
      "place_id": "ChIJ...",
      "name": "Restaurant Name",
      "address": "123 Street Name, City, State",
      "city": "New York",
      "latitude": 40.7128,
      "longitude": -74.0060,
      "category": "restaurant",
      "phone": "+1-555-0123",
      "website": "https://example.com",
      "stored_at": "2024-01-01T00:00:00.000Z"
    }
  ],
  "warning": "Using cached results due to API unavailability"
}
```

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL, -- bcrypt hashed
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  city TEXT,
  country TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Places Table
```sql
CREATE TABLE places (
  id SERIAL PRIMARY KEY,
  place_id TEXT UNIQUE NOT NULL, -- Google Places ID
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  category TEXT,
  phone TEXT,
  website TEXT,
  stored_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(place_id, address)
);
```

## Deployment

### Docker Deployment

1. **Build and run with Docker Compose:**
   ```bash
   docker-compose up --build
   ```

2. **Production deployment:**
   ```bash
   docker build -t leads-by-kary .
   docker run -p 3000:3000 --env-file .env.local leads-by-kary
   ```

### Vercel Deployment

1. **Connect to Vercel:**
   ```bash
   npm install -g vercel
   vercel
   ```

2. **Set environment variables in Vercel dashboard:**
   - `DATABASE_URL`
   - `GOOGLE_PLACES_KEY`
   - `JWT_SECRET`

3. **Deploy:**
   ```bash
   vercel --prod
   ```

## Security Considerations

- **Password Security**: Passwords are hashed using bcrypt with 12 salt rounds
- **JWT Security**: Tokens stored in HTTP-only cookies, not localStorage
- **Input Validation**: All inputs validated on both client and server
- **SQL Injection Prevention**: Parameterized queries used throughout
- **Rate Limiting**: Exponential backoff for external API calls
- **HTTPS**: Secure cookies in production environment

## Development

### Project Structure
```
src/
├── app/
│   ├── api/
│   │   ├── auth/          # Authentication endpoints
│   │   └── search/        # Search endpoints
│   ├── login/             # Login page
│   ├── signup/            # Signup page
│   └── page.tsx           # Main search page
├── components/
│   ├── SearchForm.tsx     # Search form component
│   └── PlaceCard.tsx      # Place result card
└── lib/
    ├── auth.ts            # Authentication utilities
    ├── db.ts              # Database connection
    ├── places.ts          # Google Places integration
    └── api.ts             # Client-side API utilities
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript check

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support or questions, please open an issue in the repository.
