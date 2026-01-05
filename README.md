# Access Control System - Building

Hệ thống kiểm soát ra vào tòa nhà văn phòng công ty.

## Cấu trúc dự án

```
access-control-system/
├── docker-compose.yml          # Docker orchestration
├── .gitignore
├── database/                   # SQL scripts (sẽ tạo tiếp)
├── mosquitto/
│   └── config/
│       └── mosquitto.conf      # MQTT broker config
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── .env.example
│   └── src/
│       ├── config/             # Database, MQTT config
│       ├── middlewares/        # Auth middleware
│       ├── models/             # Data models
│       ├── controllers/        # Business logic
│       └── routes/             # API routes
└── frontend/
    ├── Dockerfile
    ├── package.json
    ├── .env.local.example
    └── src/
        ├── app/                # Next.js 15 app router
        ├── components/         # React components
        ├── lib/                # Utils, API client
        ├── store/              # Zustand state
        └── types/              # TypeScript types
```

## Tech Stack

- **Backend**: Node.js 22 + Express 4
- **Frontend**: Next.js 15 + React 19
- **Database**: MySQL 8.0
- **Message Broker**: Mosquitto (MQTT)
- **Auth**: JWT
- **Styling**: Tailwind CSS
- **State**: Zustand
- **Container**: Docker + Docker Compose

## Bước tiếp theo

1. Tạo database schema và seed data trong folder `database/`
2. Setup backend API
3. Setup frontend
4. Chạy docker-compose và test

## Development Commands

```bash
# Start tất cả services
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop services
docker-compose down

# Reset database (xóa volumes)
docker-compose down -v
```

## Ports

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- MySQL: localhost:3306
- MQTT: localhost:1883
- MQTT WebSocket: ws://localhost:9001
