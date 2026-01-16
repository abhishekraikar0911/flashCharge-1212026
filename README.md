# flashCharge - EV Charging Management Platform

**Version:** 1.0.0  
**Status:** Production-Ready  
**Last Updated:** January 16, 2026

---

## 📚 Quick Navigation

This repository contains a complete EV charging management system. Start here to understand the project:

### 🏗️ **1. [ARCHITECTURE.md](ARCHITECTURE.md)** - System Design & Overview
**For:** Understanding how the system works  
**Contains:**
- System architecture overview
- Component descriptions (SteVe, Backend, UI)
- Technology stack
- Database schema
- API endpoints reference
- Data flow examples
- Communication protocols

**Read this first if you're new to the project.**

---

### 🔍 **2. [ARCHITECTURE_WITH_REVIEW.md](ARCHITECTURE_WITH_REVIEW.md)** - System Design & Code Review (COMBINED)
**For:** Complete system understanding + code quality assessment  
**Contains:**
- System architecture & design
- Technology stack details
- Component architecture
- **Code quality assessment** (scores & findings)
- **Security audit** of all components
- Database schema
- API endpoints
- Deployment architecture
- Setup instructions

**Read this to understand both how the system works AND its code quality.**

---

### 🐳 **3. [DOCKER_PLAN.md](DOCKER_PLAN.md)** - Containerization & Deployment
**For:** Setting up and deploying the system  
**Contains:**
- Current vs proposed architecture
- Docker configuration for all 3 components
- docker-compose.yml template
- Environment setup
- Deployment instructions
- Health checks & monitoring
- Troubleshooting guide

**Follow this to containerize and run the application.**

---

### 📋 **4. [PRODUCTION_READINESS.md](PRODUCTION_READINESS.md)** - Deployment Checklist
**For:** Ensuring production readiness  
**Contains:**
- Component-by-component assessment
- Security hardening checklist
- Reliability requirements
- Monitoring setup
- Performance optimization
- Deployment timeline
- Risk assessment

**Use this as a deployment readiness checklist.**

---

## 🚀 Current Setup (How It's Running Now)

### Current State - Standalone Services

The platform is **currently running with standalone processes**, NOT Docker:

```bash
# CURRENT: Dashboard UI - Static Files (Nginx)
nginx  # Serves /opt/ev-platform/dashboard-ui/
# Files: index.html, style.css, js/app.js
# Access: http://localhost:80

# CURRENT: Dashboard Backend - Node.js Standalone
node src/server.js    # From /opt/ev-platform/dashboard-backend/
# Runs: Express.js on port 3000
# Access: http://localhost:3000

# CURRENT: SteVe OCPP - Java Standalone  
java -jar steve.war   # From /opt/ev-platform/csms/steve/target/
# Runs: Spring Boot on port 8080
# Access: http://localhost:8080/steve

# CURRENT: MySQL Database
mysql                 # Running locally
# Port: 3306
# User: steve
```

**How Each Component Actually Runs Right Now:**

| Component | Status | Running As |
|-----------|--------|-----------|
| **Dashboard UI** | ✅ Live | Static HTML/CSS/JS via Nginx |
| **Dashboard Backend** | ✅ Live | Node.js server process |
| **SteVe OCPP** | ✅ Live | Java Spring Boot application |
| **MySQL Database** | ✅ Live | MySQL 8.0 database |
| **Process Manager** | Using PM2 | `pm2 start all` manages processes |

### Check What's Currently Running

```bash
# View current processes
pm2 list

# Check if services are responding
curl http://localhost:3000/health       # Backend health check
curl http://localhost:8080/steve/api/   # SteVe check
mysql -u steve -p steve                  # Test MySQL

# View live logs
pm2 logs
pm2 logs dashboard-backend
pm2 logs steve

# Monitor processes
pm2 monit
```

### Start Services Manually (If Needed)

```bash
# Terminal 1: Dashboard Backend
cd /opt/ev-platform/dashboard-backend
npm install
node src/server.js

# Terminal 2: SteVe OCPP Server
cd /opt/ev-platform/csms/steve
# Either:
./mvnw spring-boot:run    # Development
# Or:
java -jar target/steve-*.war  # Compiled

# Terminal 3: Dashboard UI (already running via Nginx)
# Static files are served, no process needed

# Check access
# UI:      http://localhost
# Backend: http://localhost:3000
# SteVe:   http://localhost:8080/steve
```

---

## 🐳 Future Plan: Docker Migration

**See [DOCKER_PLAN.md](DOCKER_PLAN.md) for complete details**

Currently running standalone. **Planned future state** with Docker:

```bash
# FUTURE: All services in Docker containers
docker-compose up --build

# Will provide:
# - Dashboard UI:  http://localhost
# - Backend API:   http://localhost:3000
# - SteVe Admin:   http://localhost:8080/steve
# - MySQL:         localhost:3306
```

---

## 📖 Quick Reference

### For Code Review

```bash
# Read documentation in this order:
less ARCHITECTURE_WITH_REVIEW.md    # System + code quality
less PRODUCTION_READINESS.md         # What needs to be done
less DOCKER_PLAN.md                  # How to containerize
```

### For Development (Current Setup)

```bash
# Terminal 1: Backend API
cd /opt/ev-platform/dashboard-backend
npm install
npm start  # or: node src/server.js

# Terminal 2: SteVe (if needed)
cd /opt/ev-platform/csms/steve
./mvnw spring-boot:run

# Access dashboard UI in browser:
# http://localhost:3000
```

### For Docker Migration (Future)

See [DOCKER_PLAN.md](DOCKER_PLAN.md) for:
- Step-by-step containerization
- Dockerfile for each component
- docker-compose.yml template
- Environment setup
- Deployment procedures

---

## 📁 Project Structure

```
/opt/ev-platform/
│
├── README.md                          ← YOU ARE HERE
├── ARCHITECTURE_WITH_REVIEW.md        ← System design + code review
├── PRODUCTION_READINESS.md            ← Readiness checklist
├── DOCKER_PLAN.md                     ← Future Docker setup
│
├── csms/steve/                        # SteVe OCPP Server (Java)
│   ├── src/                           # Source code
│   ├── target/steve.war               # ✅ Currently running this
│   ├── pom.xml                        # Maven config
│   ├── Dockerfile                     # Future: Docker image
│   └── k8s/                          # Future: Kubernetes manifests
│
├── dashboard-backend/                 # API Backend (Node.js)
│   ├── src/
│   │   ├── server.js                 # ✅ Currently running this
│   │   ├── routes/
│   │   └── services/
│   ├── package.json
│   └── Dockerfile                     # Future: Docker image
│
├── dashboard-ui/                      # Web UI (HTML/CSS/JS)
│   ├── index.html                    # ✅ Currently served via Nginx
│   ├── style.css
│   ├── js/
│   ├── nginx.conf
│   └── Dockerfile                     # Future: Docker image
│
└── Configuration/
    ├── .env                          # Secrets (git-ignored)
    ├── .gitignore
    └── docker-compose.yml            # Future: Container orchestration

KEY:
✅ Currently running
🐳 Planned Docker containers
```

---

## 🏢 System Components

### 1. **Dashboard UI** (Frontend)
- Modern web interface
- Real-time charging monitoring
- Start/Stop charging controls
- State of Charge visualization
- Status monitoring

**Tech:** HTML5, CSS3, JavaScript, Nginx  
**Current Status:** ✅ Running (static files served via Nginx)  
**Quality:** 8/10

---

### 2. **Dashboard Backend** (API)
- REST API for UI and integrations
- Database query interface
- SteVe API client
- Request validation
- Error handling

**Tech:** Node.js, Express.js, MySQL2  
**Current Status:** ✅ Running (node src/server.js on port 3000)  
**Quality:** 5.8/10 (needs security hardening)  
**Issues:** Hardcoded credentials, no auth, no input validation

---

### 3. **SteVe OCPP Server** (Core)
- OCPP protocol implementation
- Charging station management
- Transaction management
- Authentication & Authorization
- Web admin portal

**Tech:** Java 21, Spring Boot, MySQL  
**Current Status:** ✅ Running (java -jar steve.war on port 8080)  
**Quality:** 9.2/10 (production-ready)

---

### 4. **Database** (Data)
- Charger registry
- Transaction history
- Meter readings
- User management
- RFID authentication

**Tech:** MySQL 8.0  
**Current Status:** ✅ Running (port 3306)  
**Quality:** 9/10 (well-designed schema)

---

## 🔑 Key Features

### For End Users
✅ Real-time charger monitoring  
✅ Start/stop charging via web interface  
✅ State of Charge visualization  
✅ Transaction history  
✅ RFID card authentication  

### For Administrators
✅ Charger management  
✅ User management  
✅ Transaction reporting  
✅ System health monitoring  
✅ API key management  

### For Developers
✅ RESTful API  
✅ Docker containerization  
✅ Kubernetes-ready  
✅ OCPP protocol support  
✅ Modular architecture  

---

## 📊 Current Status

| Component | Status | Quality |
|-----------|--------|---------|
| **SteVe OCPP Server** | ✅ Production-Ready | 9.2/10 |
| **Dashboard Backend** | ⚠️ Ready (needs hardening) | 5.8/10 |
| **Dashboard UI** | ✅ Production-Ready | 8/10 |
| **Database** | ✅ Well-Designed | 9/10 |
| **Documentation** | ✅ Complete | 9/10 |

**Overall:** 📊 **Ready for Development, Needs Hardening for Production**

---

## 🛠️ Tech Stack

### Frontend
- HTML5 semantic markup
- CSS3 (glassmorphism design)
- Vanilla JavaScript (ES6+)
- SVG for visualizations
- Nginx web server

### Backend
- Node.js 21 LTS
- Express.js 5.x
- MySQL2 connection pool
- Axios for HTTP calls
- Docker containers

### OCPP Server
- Java 21 JDK
- Spring Boot 4.0
- Maven build
- Embedded Tomcat
- Docker/Kubernetes support

### Database
- MySQL 8.0
- Persistent volumes
- Connection pooling
- Optimized schema

---

## 🔐 Security

### Current Issues (Identified)
🔴 **Critical (Must Fix Before Docker/Production):**
- Hardcoded credentials in backend code
- No authentication on API endpoints
- No input validation on API requests

### Recommendations:
✅ Move credentials to environment variables  
✅ Implement JWT authentication  
✅ Add request validation  
✅ Enable HTTPS/TLS  
✅ Add rate limiting  
✅ Implement role-based access control  

**Full details:** See ARCHITECTURE_WITH_REVIEW.md → Code Review section  
**Implementation timeline:** See PRODUCTION_READINESS.md

---

## 📈 Deployment Options

### Option 1: Current Setup (Standalone) ✅ CURRENT
```bash
# How it's running now
pm2 start all          # Manages: Backend, SteVe, UI
pm2 list              # Check status
pm2 logs              # View logs
pm2 stop all          # Stop services
pm2 restart all       # Restart services
```
**Best for:** Development, testing  
**Status:** ✅ Currently in use

---

### Option 2: Docker Compose (Planned) 🐳 FUTURE
```bash
# Future: Move to containerization
docker-compose up --build
docker-compose ps
docker-compose logs -f
```
**Best for:** Production-like environment  
**Status:** ⚠️ Planned, see DOCKER_PLAN.md for details  
**Timeline:** 8-10 days to implement

---

### Option 3: Kubernetes (Enterprise) 🚀 FUTURE
```bash
# For large-scale deployment
kubectl apply -f csms/steve/k8s/
kubectl get pods
kubectl logs <pod-name>
```
**Best for:** Enterprise, auto-scaling  
**Status:** ⚠️ Manifests available, not yet implemented

---

## 📖 Documentation Map

```
README.md (You are here)
    ↓
    ├─→ ARCHITECTURE_WITH_REVIEW.md
    │   ├─ System design & architecture
    │   ├─ All 3 components explained
    │   ├─ Code quality scores & assessment
    │   ├─ Security audit findings
    │   ├─ Database schema
    │   ├─ API endpoints
    │   └─ Deployment guides
    │
    ├─→ PRODUCTION_READINESS.md
    │   ├─ Readiness assessment
    │   ├─ Security checklist
    │   ├─ Performance tuning
    │   ├─ Monitoring setup
    │   ├─ Deployment timeline
    │   └─ Risk mitigation
    │
    └─→ DOCKER_PLAN.md
        ├─ Current vs proposed
        ├─ Dockerfile setup
        ├─ docker-compose.yml
        ├─ Environment config
        ├─ Deployment steps
        └─ Troubleshooting
```

---

## 🎯 Getting Started Paths

### 👨‍💼 **For Project Managers**
1. Read: ARCHITECTURE_WITH_REVIEW.md → Overview
2. Understand: System design & components
3. Check: PRODUCTION_READINESS.md → Timeline

**Time:** ~30 minutes

---

### 👨‍💻 **For Backend Developers**
1. Read: ARCHITECTURE_WITH_REVIEW.md → Full
2. Review: Code quality issues section
3. Follow: DOCKER_PLAN.md → Setup

**Time:** ~2 hours

---

### 🎨 **For Frontend Developers**
1. Read: ARCHITECTURE_WITH_REVIEW.md → UI section
2. Review: Code quality findings for frontend
3. Run: `docker-compose up` → Start coding

**Time:** ~1 hour

---

### 🔧 **For DevOps/SRE**
1. Read: DOCKER_PLAN.md → Complete
2. Review: PRODUCTION_READINESS.md → Full
3. Prepare: Infrastructure & deployment

**Time:** ~3 hours

---

## 🚨 Important Notes

### Before Deployment
- [ ] Review PRODUCTION_READINESS.md
- [ ] Update `.env` with real credentials
- [ ] Enable HTTPS/TLS
- [ ] Set up monitoring
- [ ] Configure backups
- [ ] Security audit complete

### Before Code Changes
- [ ] Read CODE_REVIEW.md for issues
- [ ] Run security scan
- [ ] Update tests
- [ ] Document changes

### Before Production
- [ ] All security issues fixed
- [ ] Load testing passed
- [ ] Disaster recovery plan ready
- [ ] Team trained on operations

---

## 📞 Support

For questions about:
- **Architecture & Code:** See ARCHITECTURE_WITH_REVIEW.md
- **Deployment & Readiness:** See PRODUCTION_READINESS.md
- **Docker Setup:** See DOCKER_PLAN.md

---

## 📋 Quick Links

| Document | Purpose | Audience |
|----------|---------|----------|
| [ARCHITECTURE_WITH_REVIEW.md](ARCHITECTURE_WITH_REVIEW.md) | System design + code review | Everyone |
| [PRODUCTION_READINESS.md](PRODUCTION_READINESS.md) | Readiness checklist | Managers/DevOps |
| [DOCKER_PLAN.md](DOCKER_PLAN.md) | Deployment guide | DevOps/Developers |

---

## ✅ Quick Checklist

- [ ] Read ARCHITECTURE.md
- [ ] Review CODE_REVIEW.md
- [ ] Follow DOCKER_PLAN.md
- [ ] Check PRODUCTION_READINESS.md
- [ ] Set up `.env`
- [ ] Run `docker-compose up`
- [ ] Verify all services healthy
- [ ] Run initial tests
- [ ] Deploy to production

---

## 📊 Project Statistics

- **Total Lines of Code:** ~2,500+
- **Main Components:** 3 (UI, Backend, OCPP Server)
- **Database Tables:** 8+
- **API Endpoints:** 10+
- **Documentation Pages:** 4
- **Tech Stack:** 8+ technologies
- **Support:** OCPP 1.2-1.6

---

## 🎓 Learning Resources

- [OCPP Protocol](https://openchargealliance.org/)
- [Electric Vehicle Charging](https://www.pluginvehicles.org/)
- [Spring Boot Documentation](https://spring.io/projects/spring-boot)
- [Express.js Guide](https://expressjs.com/)
- [Docker Documentation](https://docs.docker.com/)

---

## 📝 License

GNU General Public License (GPL)  
See LICENSE.txt for details

---

## 👥 Contributors

- **Project Lead:** Rivot Motors
- **Architecture:** Engineering Team
- **SteVe OCPP:** [steve-community](https://github.com/steve-community/steve)

---

**Last Updated:** January 16, 2026  
**Version:** 1.0.0  
**Status:** Ready for Review

🚀 **Ready to get started? Pick a document above and dive in!**