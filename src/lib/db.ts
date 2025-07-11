import { Pool } from 'pg';

// Initialize PostgreSQL connection pool
// Using a pool for better performance and connection management
const pool = new Pool({
  connectionString: 'postgresql://postgress:Postgress123@postgress.csl4s28gcsqu.us-east-1.rds.amazonaws.com:5432/postgress',
  ssl: process.env.DATABASE_URL || 'postgresql://postgress:Postgress123@postgress.csl4s28gcsqu.us-east-1.rds.amazonaws.com:5432/postgress?sslmode=require'?.includes('amazonaws.com') ? { rejectUnauthorized: false } : false,
  max: 5, // Reduced max connections to avoid overwhelming RDS
  idleTimeoutMillis: 60000, // Keep connections alive longer
  connectionTimeoutMillis: 15000, // Increased timeout for AWS RDS
  statement_timeout: 30000, // SQL statement timeout
});

// Test database connection on startup
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export default pool; 