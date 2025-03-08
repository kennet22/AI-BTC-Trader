# Bitcoin AI Trader API

This is the FastAPI backend for the Bitcoin AI Trader application. It provides API endpoints to interact with the Bitcoin trader script and manage positions.

## Features

- Market data fetching and technical analysis
- Account balance and position management
- Trading execution (buy/sell)
- AI analysis integration
- WebSocket support for real-time updates
- Scheduled trading strategy execution

## Installation

1. Clone the repository
2. Install dependencies:
```bash
pip install -r requirements.txt
```
3. Copy `.env.example` to `.env` and fill in your API keys:
```bash
cp .env.example .env
```

## Usage

Start the FastAPI server:

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The API will be available at `http://localhost:8000`. OpenAPI documentation is available at `http://localhost:8000/docs`.

## API Endpoints

- **POST /api/configure**: Configure API keys
- **GET /api/market-data**: Get market data with indicators
- **GET /api/account-balance**: Get account balance
- **GET /api/positions**: Get active positions
- **POST /api/execute-trade**: Execute a trade
- **PUT /api/position/{position_id}**: Update a position
- **DELETE /api/position/{position_id}**: Close a position
- **GET /api/trade-history**: Get trade history
- **POST /api/run-strategy**: Run the trading strategy
- **WebSocket /ws**: Real-time updates

## Environment Variables

The following environment variables are used by the application:

- `PORT`: FastAPI server port (default: 8000)
- `HOST`: FastAPI server host (default: 0.0.0.0)
- `COINBASE_API_KEY`: Your Coinbase API key
- `COINBASE_API_SECRET`: Your Coinbase API secret
- `OPENAI_API_KEY`: Your OpenAI API key
- `MAX_DAILY_TRADES`: Maximum daily trades (default: 5)
- `TRADE_START_HOUR`: Hour to start trading (default: 9)
- `TRADE_END_HOUR`: Hour to stop trading (default: 23) 