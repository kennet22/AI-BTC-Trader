# Bitcoin AI Trader

A full-stack application for AI-powered Bitcoin trading, featuring a FastAPI backend and Next.js frontend.

## Overview

This application provides a modern web interface for the Bitcoin AI Trader script, allowing users to:

- View real-time Bitcoin price data with technical indicators
- Execute trades manually
- Configure and run automated trading strategies
- Monitor account balance and positions
- Analyze trading history and performance

## Architecture

The application consists of two main components:

1. **Backend (FastAPI)**: Provides API endpoints to interact with the Bitcoin trader script
2. **Frontend (Next.js)**: Provides a modern user interface to interact with the API

## Prerequisites

- Python 3.8+
- Node.js 14+
- Coinbase Advanced API credentials
- OpenAI API key

## Installation

### Backend

1. Navigate to the backend directory:
```bash
cd btc-trader-app/backend
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Copy the environment variables example file and fill in your API keys:
```bash
cp .env.example .env
```

### Frontend

1. Navigate to the frontend directory:
```bash
cd btc-trader-app/frontend
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

## Running the Application

### Development Mode

1. Start the backend server:
```bash
cd btc-trader-app/backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

2. In a separate terminal, start the frontend development server:
```bash
cd btc-trader-app/frontend
npm run dev
# or
yarn dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

### Production Mode

1. Build the frontend:
```bash
cd btc-trader-app/frontend
npm run build
# or
yarn build
```

2. Start the frontend production server:
```bash
npm run start
# or
yarn start
```

3. Start the backend server:
```bash
cd btc-trader-app/backend
uvicorn main:app --host 0.0.0.0 --port 8000
```

## Deployment on Digital Ocean

### Prerequisites

- Digital Ocean account
- Domain name (optional)

### Steps

1. Create a new Droplet on Digital Ocean (recommended: Ubuntu 20.04, Basic plan with 2GB RAM)

2. SSH into your Droplet:
```bash
ssh root@your_droplet_ip
```

3. Update the system:
```bash
apt update && apt upgrade -y
```

4. Install required packages:
```bash
apt install -y python3-pip python3-venv nginx
```

5. Clone the repository:
```bash
git clone https://github.com/yourusername/btc-trader-app.git
cd btc-trader-app
```

6. Set up the backend:
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your API keys
nano .env
```

7. Set up the frontend:
```bash
cd ../frontend
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash
source ~/.bashrc
nvm install 16
npm install
npm run build
```

8. Create a systemd service for the backend:
```bash
nano /etc/systemd/system/btc-trader-backend.service
```

Add the following content:
```
[Unit]
Description=BTC Trader Backend
After=network.target

[Service]
User=root
WorkingDirectory=/root/btc-trader-app/backend
ExecStart=/root/btc-trader-app/backend/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```

9. Create a systemd service for the frontend:
```bash
nano /etc/systemd/system/btc-trader-frontend.service
```

Add the following content:
```
[Unit]
Description=BTC Trader Frontend
After=network.target

[Service]
User=root
WorkingDirectory=/root/btc-trader-app/frontend
ExecStart=/root/.nvm/versions/node/v16.x.x/bin/npm start
Restart=always

[Install]
WantedBy=multi-user.target
```

10. Start and enable the services:
```bash
systemctl start btc-trader-backend
systemctl enable btc-trader-backend
systemctl start btc-trader-frontend
systemctl enable btc-trader-frontend
```

11. Configure Nginx:
```bash
nano /etc/nginx/sites-available/btc-trader
```

Add the following content:
```
server {
    listen 80;
    server_name your_domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /ws {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

12. Enable the Nginx configuration:
```bash
ln -s /etc/nginx/sites-available/btc-trader /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

13. (Optional) Set up SSL with Certbot:
```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d your_domain.com
```

Your Bitcoin AI Trader application should now be accessible at your domain or the Droplet's IP address.

## License

MIT 