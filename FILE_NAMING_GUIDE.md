# File Naming Convention Guide

## Purpose
This guide ensures all files in the EV Charging Platform are self-documenting and easy to understand for open-source contributors.

## General Rules

1. **Use kebab-case** for all files: `my-file-name.js`
2. **Be descriptive** - name should explain purpose
3. **Use suffixes** to indicate file type
4. **Group related files** in appropriate directories

## Backend Files

### Routes (`src/routes/`)
Format: `{feature}-routes.js`

Examples:
- `authentication-routes.js` - User login/logout endpoints
- `charger-management-routes.js` - Charger CRUD operations
- `firmware-ota-routes.js` - Firmware update endpoints
- `payment-routes.js` - Payment processing endpoints
- `transaction-routes.js` - Charging transaction endpoints

### Services (`src/services/`)
Format: `{feature}-service.js`

Examples:
- `cache-service.js` - Query result caching
- `charging-parameters-service.js` - Charging configuration logic
- `database-connection.js` - MySQL connection pool
- `state-of-charge-service.js` - SOC calculation and retrieval
- `ocpp-steve-integration.js` - SteVe CSMS API client
- `transaction-service.js` - Transaction management
- `realtime-websocket-service.js` - WebSocket server

### Middleware (`src/middleware/`)
Format: `{purpose}-middleware.js`

Examples:
- `jwt-authentication.js` - JWT token validation
- `request-validation.js` - Input validation
- `error-handler.js` - Global error handling
- `rate-limiter.js` - API rate limiting

### Utils (`src/utils/`)
Format: `{feature}-{type}.js`

Examples:
- `battery-calculations.js` - Battery capacity calculations
- `date-helpers.js` - Date formatting utilities
- `encryption-utils.js` - Encryption/decryption functions

### Config (`src/config/`)
Format: `{feature}-config.js` or `{feature}-constants.js`

Examples:
- `charging-constants.js` - Charging-related constants
- `database-config.js` - Database configuration
- `app-config.js` - Application settings

## Frontend Files

### Pages (`pages/`)
Format: `{page-name}.html`

Examples:
- `index.html` - Main dashboard
- `login.html` - Login page
- `charger-selection.html` - Charger selection page
- `charging-configuration.html` - Charging config page
- `firmware-update.html` - Firmware OTA page
- `websocket-test.html` - WebSocket testing tool

### JavaScript (`assets/js/`)
Format: `{feature}-{type}.js`

Examples:
- `dashboard-main.js` - Main dashboard logic
- `charging-configuration.js` - Charging config logic
- `websocket-client.js` - WebSocket client
- `auth-handler.js` - Authentication handling

### Services (`assets/js/services/`)
Format: `{service-name}.js`

Examples:
- `api-client.js` - HTTP API client
- `payment-gateway.js` - Payment processing
- `websocket-manager.js` - WebSocket management

### Utils (`assets/js/utils/`)
Format: `{feature}-{type}.js`

Examples:
- `battery-calculations.js` - Battery math functions
- `charging-constants.js` - Frontend constants
- `ui-helpers.js` - UI utility functions
- `date-formatters.js` - Date formatting

### Styles (`assets/css/`)
Format: `{feature}-styles.css`

Examples:
- `global-styles.css` - Global CSS variables and base styles
- `charging-config-styles.css` - Charging configuration page styles
- `charging-summary-styles.css` - Summary page styles
- `dashboard-styles.css` - Dashboard page styles

## Documentation

### Architecture Docs (`docs/architecture/`)
Format: `{TOPIC}_ARCHITECTURE.md` or `{TOPIC}_INTEGRATION.md`

Examples:
- `SYSTEM_ARCHITECTURE.md` - Overall system design
- `DATA_FLOW.md` - Data flow diagrams
- `OCPP_INTEGRATION.md` - OCPP protocol integration
- `STEVE_INTEGRATION.md` - SteVe CSMS integration

### API Docs (`docs/api/`)
Format: `{FEATURE}_API.md` or `{FEATURE}_REFERENCE.md`

Examples:
- `API_REFERENCE.md` - Complete API documentation
- `WEBSOCKET_API.md` - WebSocket protocol docs
- `AUTHENTICATION_API.md` - Auth endpoints

### Deployment Docs (`docs/deployment/`)
Format: `{PURPOSE}_GUIDE.md` or `{TOPIC}.md`

Examples:
- `INSTALLATION.md` - Installation instructions
- `CONFIGURATION.md` - Configuration guide
- `PRODUCTION_DEPLOYMENT.md` - Production setup
- `DOCKER_DEPLOYMENT.md` - Docker setup

### Development Docs (`docs/development/`)
Format: `{TOPIC}.md`

Examples:
- `CONTRIBUTING.md` - Contribution guidelines
- `CODING_STANDARDS.md` - Code style guide
- `TESTING.md` - Testing guide
- `DEBUGGING.md` - Debugging tips

## Scripts

### Utility Scripts (`scripts/`)
Format: `{action}-{target}.sh`

Examples:
- `setup-environment.sh` - Initial setup
- `optimize-database.sh` - Database optimization
- `test-end-to-end.sh` - E2E testing
- `backup-database.sh` - Database backup
- `deploy-production.sh` - Production deployment

## Special Files

### Root Level
- `README.md` - Project overview
- `LICENSE` - License information
- `.gitignore` - Git ignore rules
- `.env.example` - Environment template
- `docker-compose.yml` - Docker configuration
- `package.json` - Node.js dependencies

## Examples of Good vs Bad Names

### ❌ Bad Names
- `app.js` - Too generic
- `utils.js` - Not descriptive
- `service1.js` - Meaningless number
- `temp.js` - Temporary files shouldn't be committed
- `new-file.js` - Not descriptive
- `test.html` - Too generic

### ✅ Good Names
- `dashboard-main.js` - Clear purpose
- `battery-calculations.js` - Describes functionality
- `ocpp-steve-integration.js` - Explains integration
- `charging-configuration.html` - Clear page purpose
- `realtime-websocket-service.js` - Descriptive service name
- `jwt-authentication.js` - Clear middleware purpose

## Quick Reference

| Type | Format | Example |
|------|--------|---------|
| Route | `{feature}-routes.js` | `charger-management-routes.js` |
| Service | `{feature}-service.js` | `state-of-charge-service.js` |
| Middleware | `{purpose}-middleware.js` | `jwt-authentication.js` |
| Util | `{feature}-{type}.js` | `battery-calculations.js` |
| Page | `{page-name}.html` | `charging-configuration.html` |
| Style | `{feature}-styles.css` | `dashboard-styles.css` |
| Script | `{action}-{target}.sh` | `optimize-database.sh` |
| Doc | `{TOPIC}_{TYPE}.md` | `SYSTEM_ARCHITECTURE.md` |

## Benefits

1. **Self-Documenting** - File name explains its purpose
2. **Easy Navigation** - Find files quickly
3. **Consistent** - Predictable naming patterns
4. **Professional** - Open-source ready
5. **Maintainable** - Easy for new contributors

## Enforcement

- Use linters to check file names
- Review file names in pull requests
- Update this guide as patterns evolve
- Refactor old files to match conventions

---

**Remember:** A good file name is worth a thousand comments!
