# SUPABASE-ONLY APPROACH (100% FREE)
# Use this if you want the simplest setup

NODE_ENV=production
PORT=5000

# JWT Configuration (CHANGE THIS!)
JWT_SECRET=your-super-secret-production-jwt-key-256-bit-minimum-change-this

# Platform Database (Your Supabase PostgreSQL)
DB_HOST=db.qmvvhupzwhjudkxgndup.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=7nRkAkN1qZJAD8ga

# CORS Configuration
CORS_ORIGIN=https://dbaas-ten.vercel.app

# Use Supabase for all database types
# Users will create PostgreSQL databases for all use cases
SUPABASE_URL=https://qmvvhupzwhjudkxgndup.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Optional: Basic Redis simulation using PostgreSQL JSONB
# No external Redis needed - use PostgreSQL for caching
