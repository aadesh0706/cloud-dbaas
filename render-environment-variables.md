# FINAL PRODUCTION ENVIRONMENT VARIABLES FOR RENDER
# Copy these EXACT values to your Render backend service environment variables

NODE_ENV=production
PORT=5000

# JWT Configuration (CHANGE THIS IMMEDIATELY!)
JWT_SECRET=dbaas-super-secret-jwt-production-key-2025-change-this-now

# Platform Database (Supabase PostgreSQL)
DB_HOST=db.qmvvhupzwhjudkxgndup.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=7nRkAkN1qZJAD8ga

# CORS Configuration
CORS_ORIGIN=https://dbaas-ten.vercel.app

# MySQL (Aiven)
AIVEN_MYSQL_HOST=mysql-18ab94e9-aadeshgulumbe3-d462.d.aivencloud.com
AIVEN_MYSQL_PORT=21125
AIVEN_MYSQL_USER=avnadmin
AIVEN_MYSQL_PASSWORD=AVNS_1wL_IQ4w3bOXp0f3wBh
AIVEN_MYSQL_DATABASE=defaultdb

# MongoDB Atlas
MONGODB_ATLAS_URI=mongodb+srv://dbaasuser:OVYBsPXoE5O5VSov@cluster0.uz9y01u.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
MONGODB_ATLAS_DATABASE=dbaas-mongodb-pool

# AI Enhancement (Optional - you already have this)
OPENAI_API_KEY=sk-abcdef1234567890abcdef1234567890abcdef12

# Email Configuration (Optional)
GMAIL_USER=testerhundread@gmail.com
GMAIL_APP_PASSWORD=nljk kscj zgra zkax

# Resource Limits
MAX_DATABASES_PER_USER=5
MAX_PROJECTS_PER_USER=10
