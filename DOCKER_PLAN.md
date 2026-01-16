# Docker Containerization Plan
## flashCharge - Complete 3-Component Setup

**Date:** January 16, 2026  
**Status:** Planning Phase  
**Goal:** Migrate from PM2 standalone to fully containerized Docker Compose setup

---

## Current State Analysis

### Current Architecture (PM2 Standalone)

```
PM2 Process Manager
│
├── dashboard-backend (Node.js)  ← node /opt/ev-platform/dashboard-backend/src/server.js
│   └── Running on localhost:3000
│   └── Memory: 29.8 MB
│   └── Crashes: 44 restarts
│
├── dashboard-ui (Python/Static Server)  ← Serving HTML/CSS/JS
│   └── Running on localhost:3000 or separate port
│   └── Memory: 9.7 MB
│   └── Crashes: 25 restarts
│
├── steve-csms (Java WAR)  ← java -jar target/steve.war
│   └── Running on localhost:8080
│   └── Memory: 427.7 MB (Java heap)
│   └── Crashes: 6 restarts
│
└── MySQL Database  ← External or separate
    └── Port 3306
    └── Manual startup/management
```

### Issues with Current Setup

| Issue | Impact | Severity |
|-------|--------|----------|
| No container isolation | Process conflicts, dependency issues | ⚠️ Medium |
| Manual dependency management | Complex setup, hard to replicate | ⚠️ Medium |
| Difficult scaling | Can't run multiple instances | ⚠️ Medium |
| Network management | Hardcoded localhost, port conflicts | ⚠️ Medium |
| Environment configuration | Hardcoded in code/properties files | 🔴 High |
| No log aggregation | Logs scattered across files | ⚠️ Medium |
| Database management | Manual backup, no persistence | 🔴 High |
| Production readiness | Not suitable for Kubernetes | 🔴 High |

---

## Proposed Architecture

### New Architecture (Docker Compose)

```
Docker Compose Orchestration (Single Command: docker-compose up)
│
├─── Network: flashcharge-network (internal service discovery)
│
├── Dashboard UI (Nginx Container)
│   ├── Image: nginx:alpine
│   ├── Port: 80 (public)
│   ├── Volume: dashboard-ui/static files
│   ├── Memory: ~20 MB
│   └── Health Check: HTTP 200 on /
│
├── Dashboard Backend (Node.js Container)
│   ├── Image: node:21-alpine
│   ├── Port: 3000 (internal only)
│   ├── Volume: source code + node_modules
│   ├── Memory: ~256 MB (limit)
│   ├── Env Vars: From .env file
│   ├── Health Check: GET /health
│   └── Restart Policy: always
│
├── SteVe OCPP Server (Java Container)
│   ├── Image: java:21-jdk-slim
│   ├── Port: 8080 (internal only)
│   ├── Volume: WAR file + properties
│   ├── Memory: ~1 GB (limit)
│   ├── Env Vars: From .env file
│   ├── Health Check: GET /steve/api/
│   └── Restart Policy: always
│
├── MySQL Database (Database Container)
│   ├── Image: mysql:8.0
│   ├── Port: 3306 (internal only)
│   ├── Volume: mysql_data (persistent)
│   ├── Memory: ~512 MB (limit)
│   ├── Env Vars: From .env file
│   └── Restart Policy: always
│
└── Nginx Reverse Proxy (Optional, Advanced)
    ├── Image: nginx:alpine
    ├── Port: 8000 (public)
    ├── Config: reverse proxy rules
    └── Handles: Load balancing, SSL termination
```

### Benefits

| Benefit | Impact |
|---------|--------|
| ✅ Single command setup (`docker-compose up`) | Reproducible, team onboarding easy |
| ✅ Service isolation | No process conflicts, clean separation |
| ✅ Network isolation | Services communicate via network names |
| ✅ Volume persistence | Database survives restarts |
| ✅ Environment management | Secrets in .env, not in code |
| ✅ Easy scaling | Can add replicas with load balancer |
| ✅ Kubernetes-ready | Easy migration to K8s |
| ✅ Production parity | Dev/test/prod use same containers |
| ✅ Log centralization | Can add ELK/Loki stack |
| ✅ Resource limits | No runaway processes |

---

## Detailed Component Planning

### 1. Dashboard UI Container

**Current State:**
```
dashboard-ui/
├── index.html
├── style.css
├── js/app.js
└── README.md
```

**Question:** How is it currently served?
- Option A: Python `http.server` (likely)
- Option B: Node.js static server
- Option C: Nginx

**Proposed Solution:** Nginx (best practice)

#### Dockerfile for Dashboard UI

```dockerfile
# dashboard-ui/Dockerfile

FROM node:21-alpine as builder
WORKDIR /app

# Copy UI files (static only - no build step needed)
COPY index.html style.css ./
COPY js ./js

# Final stage - lightweight nginx
FROM nginx:alpine
WORKDIR /app

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy static files from builder
COPY --from=builder /app /usr/share/nginx/html

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:80/ || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

#### nginx.conf

```nginx
# dashboard-ui/nginx.conf

server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css text/javascript application/json;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|svg|ico)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # API proxy to backend
    location /api/ {
        proxy_pass http://dashboard-backend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support (if needed)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # SPA routing - all requests to / serve index.html
    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache";
    }

    # Health check endpoint
    location /health {
        return 200 "OK";
        add_header Content-Type text/plain;
    }
}
```

**Build Command:**
```bash
docker build -t flashcharge/dashboard-ui:latest dashboard-ui/
```

---

### 2. Dashboard Backend Container

**Current State:**
```
dashboard-backend/
├── src/
│   ├── server.js
│   ├── routes/
│   ├── services/
│   └── ...
├── package.json
└── node_modules/
```

**Dockerfile for Dashboard Backend:**

```dockerfile
# dashboard-backend/Dockerfile

FROM node:21-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (production only)
RUN npm ci --only=production

# Copy application code
COPY src ./src

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

EXPOSE 3000

# Run as non-root user
USER node

CMD ["node", "src/server.js"]
```

**Build Command:**
```bash
docker build -t flashcharge/dashboard-backend:latest dashboard-backend/
```

**Environment Variables Needed:**
```
DB_HOST=mysql
DB_PORT=3306
DB_USER=steve
DB_PASSWORD=steve
DB_NAME=steve
STEVE_API_URL=http://steve:8080/steve
STEVE_API_KEY=my-secret-api-key
NODE_ENV=production
PORT=3000
```

---

### 3. SteVe OCPP Server Container

**Current State:**
```
csms/steve/
├── src/
├── target/steve.war
├── pom.xml
├── Dockerfile (exists, needs enhancement)
└── src/main/resources/
    ├── application-prod.properties
    └── application-docker.properties
```

**Enhanced Dockerfile for SteVe:**

```dockerfile
# csms/steve/Dockerfile

FROM eclipse-temurin:21-jdk-slim as builder

WORKDIR /code

# Copy project files
COPY . .

# Build application
RUN chmod +x mvnw && \
    ./mvnw clean package -Pdocker -DskipTests

# Runtime stage
FROM eclipse-temurin:21-jre-slim

WORKDIR /app

# Create non-root user
RUN groupadd -r appuser && useradd -r -g appuser appuser

# Copy built WAR from builder
COPY --chown=appuser:appuser --from=builder /code/target/steve.war .

# Expose ports
EXPOSE 8080 8443

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:8080/steve/api/ || exit 1

# Switch to non-root user
USER appuser

# Run application with environment-aware options
CMD ["java", \
     "-Djdk.tls.client.protocols=TLSv1.2,TLSv1.3", \
     "-XX:MaxRAMPercentage=85", \
     "-XX:+UseG1GC", \
     "-XX:MaxGCPauseMillis=200", \
     "-jar", "steve.war"]
```

**Environment Variables (via application-docker.properties):**
```properties
# Database
db.ip=${DB_HOST:localhost}
db.port=${DB_PORT:3306}
db.schema=${DB_NAME:steve}
db.user=${DB_USER:steve}
db.password=${DB_PASSWORD:steve}

# Admin credentials
auth.user=${ADMIN_USER:admin}
auth.password=${ADMIN_PASSWORD:admin}

# API Keys
webapi.key=STEVE-API-KEY
webapi.value=${STEVE_API_KEY:my-secret-api-key}

# Server configuration
server.host=0.0.0.0
server.port=8080
http.port=8080
```

**Build Command:**
```bash
docker build -t flashcharge/steve:latest csms/steve/
```

---

### 4. MySQL Database Container

**No custom Dockerfile needed** (use official image)

**Environment Variables:**
```
MYSQL_DATABASE=steve
MYSQL_USER=steve
MYSQL_PASSWORD=steve
MYSQL_ROOT_PASSWORD=rootpass
```

**Volume Strategy:**
- `mysql_data`: Persistent data volume
- `init.sql`: Database initialization

**Initialization Script:**
```sql
-- csms/steve/src/main/resources/schema-mysql.sql
-- Already exists, will be used for initialization
```

---

## Docker Compose Configuration

### Main docker-compose.yml

```yaml
# docker-compose.yml

version: '3.9'

services:
  # Frontend - Nginx serving static UI + reverse proxy
  dashboard-ui:
    build:
      context: ./dashboard-ui
      dockerfile: Dockerfile
    container_name: dashboard-ui
    ports:
      - "80:80"
    depends_on:
      - dashboard-backend
    networks:
      - flashcharge-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost/health"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 5s
    environment:
      - LOG_LEVEL=info
    volumes:
      - ./dashboard-ui/index.html:/usr/share/nginx/html/index.html:ro
      - ./dashboard-ui/style.css:/usr/share/nginx/html/style.css:ro
      - ./dashboard-ui/js:/usr/share/nginx/html/js:ro

  # Backend API - Node.js Express server
  dashboard-backend:
    build:
      context: ./dashboard-backend
      dockerfile: Dockerfile
    container_name: dashboard-backend
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - DB_HOST=mysql
      - DB_PORT=3306
      - DB_USER=${DB_USER:-steve}
      - DB_PASSWORD=${DB_PASSWORD:-steve}
      - DB_NAME=${DB_NAME:-steve}
      - STEVE_API_URL=http://steve:8080/steve
      - STEVE_API_KEY=${STEVE_API_KEY:-my-secret-api-key}
    depends_on:
      mysql:
        condition: service_healthy
      steve:
        condition: service_healthy
    networks:
      - flashcharge-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s
    volumes:
      - ./dashboard-backend/src:/app/src:ro
    mem_limit: 512m
    mem_reservation: 256m

  # OCPP Server - Java/Spring Boot SteVe
  steve:
    build:
      context: ./csms/steve
      dockerfile: Dockerfile
    container_name: steve-ocpp
    ports:
      - "8080:8080"
      - "8443:8443"
    environment:
      - DB_HOST=mysql
      - DB_PORT=3306
      - DB_USER=${DB_USER:-steve}
      - DB_PASSWORD=${DB_PASSWORD:-steve}
      - DB_NAME=${DB_NAME:-steve}
      - ADMIN_USER=${ADMIN_USER:-admin}
      - ADMIN_PASSWORD=${ADMIN_PASSWORD:-admin}
      - STEVE_API_KEY=${STEVE_API_KEY:-my-secret-api-key}
      - JAVA_OPTS=-Xmx1g -Xms512m
    depends_on:
      mysql:
        condition: service_healthy
    networks:
      - flashcharge-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/steve/api/"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s
    volumes:
      - ./csms/steve/src/main/resources/application-docker.properties:/app/application-docker.properties:ro
    mem_limit: 2g
    mem_reservation: 1g

  # Database - MySQL
  mysql:
    image: mysql:8.0
    container_name: steve-mysql
    ports:
      - "3306:3306"
    environment:
      - MYSQL_DATABASE=${DB_NAME:-steve}
      - MYSQL_USER=${DB_USER:-steve}
      - MYSQL_PASSWORD=${DB_PASSWORD:-steve}
      - MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD:-rootpass}
      - MYSQL_INITDB_SKIP_TZINFO=yes
    networks:
      - flashcharge-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s
    volumes:
      - mysql_data:/var/lib/mysql
      - ./csms/steve/src/main/resources/schema-mysql.sql:/docker-entrypoint-initdb.d/01-schema.sql:ro
    mem_limit: 1g
    mem_reservation: 512m

networks:
  flashcharge-network:
    driver: bridge

volumes:
  mysql_data:
    driver: local
```

### Environment File (.env)

```bash
# .env (in project root)

# Database Configuration
DB_HOST=mysql
DB_PORT=3306
DB_NAME=steve
DB_USER=steve
DB_PASSWORD=steve
MYSQL_ROOT_PASSWORD=rootpass

# Admin Credentials (change in production!)
ADMIN_USER=admin
ADMIN_PASSWORD=admin

# API Configuration
STEVE_API_KEY=my-secret-api-key

# Node Environment
NODE_ENV=production

# Container Resources
COMPOSE_PROFILES=default
```

---

## File Structure (Post-Docker)

```
/opt/ev-platform/
│
├── docker-compose.yml          ← Main orchestration file
├── .env                        ← Environment variables (add to .gitignore)
├── .gitignore                  ← Ignore .env, node_modules, etc.
│
├── dashboard-ui/
│   ├── Dockerfile              ← NEW
│   ├── nginx.conf              ← NEW
│   ├── index.html
│   ├── style.css
│   └── js/
│       └── app.js
│
├── dashboard-backend/
│   ├── Dockerfile              ← NEW (simplified)
│   ├── package.json
│   ├── src/
│   │   ├── server.js
│   │   ├── routes/
│   │   ├── services/
│   │   └── ...
│   └── node_modules/           ← NOT copied to container
│
├── csms/
│   └── steve/
│       ├── Dockerfile          ← ENHANCED
│       ├── pom.xml
│       ├── src/
│       │   └── main/resources/
│       │       ├── application-docker.properties  ← NEW
│       │       └── schema-mysql.sql
│       └── target/
│           └── steve.war       ← Built in container
│
└── [Documentation files]
    ├── README.md
    ├── ARCHITECTURE.md
    ├── CODE_REVIEW.md
    └── PRODUCTION_READINESS.md
```

---

## Implementation Steps

### Phase 1: Prepare Dockerfiles (2-3 days)

- [ ] Create `dashboard-ui/Dockerfile` and `nginx.conf`
- [ ] Create `dashboard-backend/Dockerfile`
- [ ] Enhance `csms/steve/Dockerfile`
- [ ] Create `csms/steve/src/main/resources/application-docker.properties`
- [ ] Test each container builds independently

**Commands:**
```bash
docker build -t flashcharge/dashboard-ui:latest dashboard-ui/
docker build -t flashcharge/dashboard-backend:latest dashboard-backend/
docker build -t flashcharge/steve:latest csms/steve/
```

---

### Phase 2: Create docker-compose.yml (1 day)

- [ ] Create main `docker-compose.yml`
- [ ] Define all 4 services (ui, backend, steve, mysql)
- [ ] Configure networks
- [ ] Add health checks
- [ ] Set memory limits
- [ ] Add environment variables

**Validation:**
```bash
docker-compose config  # Validate YAML syntax
```

---

### Phase 3: Environment Configuration (1 day)

- [ ] Create `.env` file with defaults
- [ ] Add `.env` to `.gitignore`
- [ ] Document all environment variables
- [ ] Create `.env.example` for documentation
- [ ] Update startup scripts

**Files to create:**
```
.env                ← Actual secrets (ignored)
.env.example        ← Template (version controlled)
.gitignore          ← Update to ignore .env
```

---

### Phase 4: Integration Testing (2-3 days)

- [ ] Test `docker-compose up` fresh start
- [ ] Test container networking
- [ ] Verify database initialization
- [ ] Test health checks
- [ ] Verify logging
- [ ] Test service restart behavior

**Testing commands:**
```bash
docker-compose up --build
docker-compose logs -f
docker-compose ps
docker-compose exec dashboard-backend npm test
```

---

### Phase 5: Migration from PM2 (1-2 days)

- [ ] Stop PM2 processes: `pm2 stop all`
- [ ] Backup current database
- [ ] Start with docker-compose
- [ ] Verify all features work
- [ ] Monitor for issues
- [ ] Plan PM2 cleanup

**Commands:**
```bash
pm2 stop all
pm2 delete all

docker-compose up -d
docker-compose logs -f
```

---

### Phase 6: Documentation & Cleanup (1 day)

- [ ] Update README with docker-compose instructions
- [ ] Document environment variables
- [ ] Create troubleshooting guide
- [ ] Add health check verification
- [ ] Clean up old PM2 configs

---

## Migration Timeline

```
Week 1:
  Day 1-2: Prepare Dockerfiles
  Day 3: docker-compose.yml
  Day 4: Environment configuration
  Day 5: Integration testing
  
Week 2:
  Day 1: Migration from PM2
  Day 2: Final verification
  Day 3: Documentation
  Day 4-5: Buffer/Issue resolution
```

**Total Effort:** 8-10 days

---

## Quick Start Commands (After Implementation)

### Development

```bash
# First time setup
git clone <repo>
cd /opt/ev-platform
cp .env.example .env
# Edit .env with your values

# Start all services
docker-compose up --build

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Remove volumes (clean slate)
docker-compose down -v
```

### Production

```bash
# Build images
docker-compose build

# Push to registry
docker push flashcharge/dashboard-ui:latest
docker push flashcharge/dashboard-backend:latest
docker push flashcharge/steve:latest

# Deploy
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Monitor
docker-compose logs -f
docker-compose ps
```

---

## Resource Allocation

| Service | CPU | Memory | Storage |
|---------|-----|--------|---------|
| Dashboard UI (Nginx) | 100m | 50Mi | - |
| Dashboard Backend | 250m | 256Mi | - |
| SteVe OCPP | 500m | 1000Mi | - |
| MySQL Database | 250m | 512Mi | 10Gi |
| **Total** | **1.1** | **1.8Gi** | **10Gi** |

---

## Network Architecture

```
┌─────────────────────────────────────────────────┐
│     Docker Compose Network (flashcharge-network)│
│                                                 │
│  ┌─────────────┐  ┌──────────────┐  ┌────────┐│
│  │ Nginx:80    │  │Backend:3000  │  │SteVe:80││
│  │             │◄─┤              │◄─┤        ││
│  │ UI reverse  │  │API           │  │OCPP    ││
│  │ proxy       │  │              │  │Server  ││
│  └──────┬──────┘  └────────┬─────┘  └───┬────┘│
│         │ (:3000)          │ (:3306)     │      │
│         └──────────────────┼─────────────┘      │
│                            │                    │
│                      ┌─────▼─────┐              │
│                      │   MySQL    │              │
│                      │  :3306     │              │
│                      └────────────┘              │
│                                                 │
└─────────────────────────────────────────────────┘
                        │
                ┌───────┴────────┐
              Port 80         Port 3306
            (External)      (Internal)
```

---

## Health & Monitoring

### Built-in Health Checks

Each service has health checks:

```bash
# Check individual service health
docker-compose exec dashboard-ui wget --quiet --tries=1 --spider http://localhost/health
docker-compose exec dashboard-backend node -e "require('http').get('http://localhost:3000/health', (r) => console.log(r.statusCode))"
docker-compose exec steve curl http://localhost:8080/steve/api/
docker-compose exec mysql mysqladmin ping

# View all health statuses
docker-compose ps
```

### Viewing Logs

```bash
# All services
docker-compose logs

# Specific service
docker-compose logs dashboard-backend

# Follow live
docker-compose logs -f

# Last 100 lines
docker-compose logs --tail=100

# With timestamps
docker-compose logs --timestamps
```

---

## Troubleshooting

### Service fails to start

```bash
# Check logs
docker-compose logs steve

# Rebuild
docker-compose build --no-cache steve

# Start with debug
docker-compose up steve
```

### Database connection issues

```bash
# Check MySQL is running
docker-compose exec mysql mysqladmin ping

# Check connectivity from backend
docker-compose exec dashboard-backend nc -zv mysql 3306

# View MySQL logs
docker-compose logs mysql
```

### Port conflicts

```bash
# If port 80 is in use:
# Option 1: Stop other service
sudo systemctl stop nginx

# Option 2: Use different port in docker-compose.yml
ports:
  - "8000:80"  # Host:Container

# Option 3: Run on different compose file
docker-compose -f docker-compose.dev.yml up
```

---

## Rollback Plan

If issues occur:

```bash
# Stop containers but keep volumes
docker-compose stop

# Keep PM2 processes running as backup
pm2 start all

# To revert completely:
docker-compose down
pm2 start all
```

---

## Success Criteria

- [ ] `docker-compose up` starts all services successfully
- [ ] No port conflicts
- [ ] All health checks pass
- [ ] Dashboard UI loads on http://localhost
- [ ] API calls work (http://localhost:3000/api/...)
- [ ] Database initialized correctly
- [ ] All logs visible in `docker-compose logs`
- [ ] Services restart automatically on failure
- [ ] Memory/CPU stays within limits
- [ ] Zero downtime during deployment

---

## Next Steps

### Decision Point

Please confirm:

1. **Ready to proceed?** (Yes/No)
   - Proceed with Phase 1 (Dockerfiles)
   - Proceed with full implementation

2. **Any concerns?**
   - Network changes?
   - Port changes?
   - Environment variables?

3. **Timeline?**
   - Start immediately?
   - Plan for later?

4. **Team resources?**
   - Who will handle Docker setup?
   - Who will test?
   - Who will document?

---

## Appendix: Docker Best Practices Applied

✅ **Multi-stage builds** - Smaller final images  
✅ **Non-root users** - Security best practice  
✅ **Health checks** - Service monitoring  
✅ **Memory limits** - Resource management  
✅ **Named volumes** - Data persistence  
✅ **Health depends_on** - Proper startup order  
✅ **Environment variables** - Configuration management  
✅ **Logging** - Debugging support  
✅ **Restart policies** - High availability  
✅ **Network isolation** - Security boundary  

---

**Document Version:** 1.0  
**Created:** January 16, 2026  
**Status:** Planning/Review Phase
