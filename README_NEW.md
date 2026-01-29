# EV Charging Platform

> Open-source EV charging management system with OCPP 1.6J support, real-time monitoring, and smart charging features.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![OCPP](https://img.shields.io/badge/OCPP-1.6J-blue.svg)](https://www.openchargealliance.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)

## 🚀 Features

- **OCPP 1.6J Compliance** - Full support via SteVe CSMS integration
- **Real-time Monitoring** - WebSocket-based live updates
- **Smart Charging** - Configurable charging modes and schedules
- **Firmware OTA** - Over-the-air firmware updates for chargers
- **Payment Integration** - Prepaid/postpaid billing support
- **Multi-tenant** - Support for multiple chargers and users
- **RESTful API** - Complete API for third-party integrations
- **Responsive Dashboard** - Mobile-first web interface

## 📋 Table of Contents

- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [API Documentation](#api-documentation)
- [Development](#development)
- [Contributing](#contributing)
- [License](#license)

## 🏗️ Architecture

```
┌─────────────────┐
│  EV Charger     │  OCPP 1.6J WebSocket
│  (Hardware)     │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  SteVe CSMS     │  Open Source OCPP Server
│  (Port 8080)    │  https://github.com/steve-community/steve
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  MySQL Database │  Stores OCPP data, transactions
│  (Port 3306)    │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  Backend API    │  Node.js + Express
│  (Port 3000)    │  REST API + WebSocket
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  Web Dashboard  │  HTML5 + Vanilla JS
│  (Port 80)      │  Real-time UI
└─────────────────┘
```

### Components

1. **ev-charging-backend** - Node.js REST API and WebSocket server
2. **ev-charging-dashboard** - Web-based user interface
3. **steve-csms** - OCPP Central System (open source)
4. **MySQL** - Database for OCPP data and transactions

## 📦 Prerequisites

- **Node.js** 18+ and npm
- **MySQL** 8.0+
- **Java** 11+ (for SteVe CSMS)
- **PM2** (for process management)
- **Nginx** (for reverse proxy)

## 🔧 Installation

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/ev-charging-platform.git
cd ev-charging-platform
```

### 2. Setup Database

```bash
mysql -u root -p << EOF
CREATE DATABASE steve CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'steve'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON steve.* TO 'steve'@'localhost';
FLUSH PRIVILEGES;
EOF
```

### 3. Install SteVe CSMS

```bash
cd steve-csms/steve
./mvnw clean package
# Configure steve/src/main/resources/config/prod/main.properties
```

### 4. Install Backend

```bash
cd ev-charging-backend
npm install
cp .env.example .env
# Edit .env with your configuration
```

### 5. Install Frontend

```bash
cd ev-charging-dashboard
# No build step required - vanilla JS
```

### 6. Start Services

```bash
# Start SteVe CSMS
pm2 start steve-csms/steve/target/steve.war --name steve-csms

# Start Backend
pm2 start ev-charging-backend/src/server.js --name ev-charging-backend

# Start Frontend (via nginx or http-server)
pm2 start http-server ev-charging-dashboard --name ev-charging-dashboard
```

## ⚙️ Configuration

### Backend (.env)

```env
# Database
DB_HOST=localhost
DB_USER=steve
DB_PASSWORD=your_password
DB_NAME=steve
DB_CONNECTION_LIMIT=20

# SteVe CSMS
STEVE_API_URL=http://localhost:8080/steve
STEVE_API_KEY=your_api_key

# JWT Authentication
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=24h

# Server
PORT=3000
NODE_ENV=production
```

### SteVe CSMS (main.properties)

```properties
db.url=jdbc:mysql://localhost:3306/steve
db.user=steve
db.password=your_password
ocpp.ws.port=8080
```

## 🎯 Usage

### Access Points

- **Dashboard:** http://localhost
- **Backend API:** http://localhost:3000/api
- **SteVe Web UI:** http://localhost:8080/steve
- **WebSocket:** ws://localhost:3000/ws

### Default Credentials

- **Dashboard:** admin / admin123
- **SteVe:** admin / 1234

### Quick Start

1. Register your charger in SteVe CSMS
2. Configure charger to connect to `ws://your-server:8080/steve/websocket/CentralSystemService/{charger-id}`
3. Login to dashboard
4. Select charger and start charging

## 📚 API Documentation

### Authentication

```bash
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

### Start Charging

```bash
POST /api/chargers/:id/start
Authorization: Bearer {token}
Content-Type: application/json

{
  "connectorId": 1,
  "idTag": "USER001"
}
```

### Get SOC (State of Charge)

```bash
GET /api/chargers/:id/soc
Authorization: Bearer {token}
```

Full API documentation: [docs/api/API_REFERENCE.md](docs/api/API_REFERENCE.md)

## 🛠️ Development

### Project Structure

```
ev-charging-platform/
├── ev-charging-backend/          # Node.js API server
│   ├── src/
│   │   ├── routes/               # API endpoints
│   │   ├── services/             # Business logic
│   │   ├── middleware/           # Auth, validation
│   │   └── utils/                # Helper functions
│   └── package.json
├── ev-charging-dashboard/        # Web UI
│   ├── assets/
│   │   ├── js/                   # JavaScript modules
│   │   └── css/                  # Stylesheets
│   └── pages/                    # HTML pages
├── steve-csms/                   # OCPP server (submodule)
├── docs/                         # Documentation
├── scripts/                      # Utility scripts
└── firmware-storage/             # OTA firmware files
```

### Running Tests

```bash
# Backend tests
cd ev-charging-backend
npm test

# End-to-end tests
./scripts/test-end-to-end.sh
```

### Code Style

- **Backend:** ESLint + Prettier
- **Frontend:** Vanilla JS (ES6+)
- **Naming:** Descriptive, kebab-case for files

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](docs/development/CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [SteVe CSMS](https://github.com/steve-community/steve) - OCPP Central System
- [OCPP Protocol](https://www.openchargealliance.org/) - Open Charge Point Protocol
- All contributors and supporters

## 📞 Support

- **Issues:** [GitHub Issues](https://github.com/yourusername/ev-charging-platform/issues)
- **Discussions:** [GitHub Discussions](https://github.com/yourusername/ev-charging-platform/discussions)
- **Email:** support@yourcompany.com

## 🗺️ Roadmap

- [ ] OCPP 2.0.1 support
- [ ] Mobile app (React Native)
- [ ] Advanced analytics dashboard
- [ ] Multi-language support
- [ ] Load balancing for multiple chargers
- [ ] Integration with renewable energy sources

---

**Made with ❤️ for the EV charging community**
