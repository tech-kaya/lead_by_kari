-- Database schema for Leads by Kary
-- PostgreSQL DDL for user authentication and places storage

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
  UNIQUE(place_id, address) -- Prevent duplicate entries
);

-- Indexes for better search performance
CREATE INDEX idx_places_name ON places(name);
CREATE INDEX idx_places_city ON places(city);
CREATE INDEX idx_places_category ON places(category);
CREATE INDEX idx_users_email ON users(email); 