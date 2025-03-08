import os
import sys
import json
import asyncio
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from fastapi import FastAPI, HTTPException, Depends, WebSocket, WebSocketDisconnect, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, validator
import pandas as pd
import logging
import schedule
import time
import threading
from pathlib import Path

# Add the parent directory to sys.path so we can import the Bitcoin trader script
sys.path.append(str(Path(__file__).parent.parent.parent))
from btc_investor_ai_v4 import BitcoinAITrader as OriginalBitcoinAITrader

# Import our isolated trader factory
from trader_factory import create_trader

# Create a monkey-patched version of BitcoinAITrader to work around the proxies issue
class CustomBitcoinAITrader(OriginalBitcoinAITrader):
    """Custom version that works around the proxies issue"""
    
    def __init__(self, **kwargs):
        # Extract only the parameters we care about
        coinbase_api_key = kwargs.get('coinbase_api_key')
        coinbase_api_secret = kwargs.get('coinbase_api_secret')
        ai_api_key = kwargs.get('ai_api_key')
        
        # Call the parent __init__ with only the expected parameters
        super().__init__(
            coinbase_api_key=coinbase_api_key,
            coinbase_api_secret=coinbase_api_secret,
            ai_api_key=ai_api_key
        )

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(levelname)-8s | %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Define constants for API key storage
CONFIG_DIR = Path(__file__).parent / "config"
API_KEYS_FILE = CONFIG_DIR / "api_keys.json"

# Function to load API keys from file
def load_api_keys_from_file():
    if not CONFIG_DIR.exists():
        CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    
    if not API_KEYS_FILE.exists():
        return None
    
    try:
        with open(API_KEYS_FILE, "r") as f:
            keys = json.load(f)
            logger.info("Loaded API keys from file")
            return keys
    except Exception as e:
        logger.error(f"Error loading API keys from file: {e}")
        return None

# Function to save API keys to file
def save_api_keys_to_file(keys):
    if not CONFIG_DIR.exists():
        CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    
    try:
        with open(API_KEYS_FILE, "w") as f:
            json.dump(keys, f)
            logger.info("Saved API keys to file")
    except Exception as e:
        logger.error(f"Error saving API keys to file: {e}")

# Initialize the app
app = FastAPI(title="Bitcoin AI Trader API", description="API for the Bitcoin AI Trader")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For production, replace with your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize the trader (will be done once API keys are provided)
trader = None

# WebSocket connections management
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception as e:
                logger.error(f"Error broadcasting message: {e}")

manager = ConnectionManager()

# Pydantic models for request validation
class APIConfig(BaseModel):
    coinbase_api_key: str
    coinbase_api_secret: str
    openai_api_key: str
    
    # Add validator to ensure no extra fields
    @validator('*', pre=True)
    def no_extra_fields(cls, v):
        return v
    
    class Config:
        # This tells Pydantic to ignore extra fields
        extra = "ignore"

class TradeRequest(BaseModel):
    action: str  # "BUY" or "SELL"
    amount: float
    order_type: str = "market"

class PositionUpdate(BaseModel):
    position_id: str
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None
    size: Optional[float] = None

# Background task for running the trading strategy
def run_strategy_background(background_tasks: BackgroundTasks):
    if trader is None:
        raise HTTPException(status_code=400, detail="Trader is not initialized. Please configure API keys first.")
    
    background_tasks.add_task(trader.run_strategy)
    return {"status": "success", "message": "Trading strategy started in background"}

# Background thread for scheduled tasks
def scheduled_tasks():
    """Run scheduled tasks in the background"""
    try:
        logger.info("Starting scheduled tasks thread")
        
        # Schedule strategy execution once per hour if trader is configured
        def run_scheduled_strategy():
            if trader:
                logger.info("Running scheduled strategy...")
                try:
                    trader.run_strategy()
                    logger.info("Scheduled strategy execution completed")
                except Exception as e:
                    logger.error(f"Error in scheduled strategy execution: {e}")
            else:
                logger.info("Trader not configured - skipping scheduled run")
        
        # Schedule the task
        schedule.every(1).hours.do(run_scheduled_strategy)
        
        # Run the scheduler loop
        while True:
            schedule.run_pending()
            time.sleep(60)  # Check every minute
    except Exception as e:
        logger.error(f"Error in scheduled tasks thread: {e}")
        # Keep thread alive even after error
        time.sleep(300)  # Wait 5 minutes before retrying
        scheduled_tasks()  # Restart the function

# Helper function to create trader safely
def create_trader_safe(**kwargs):
    """Create a trader instance safely"""
    try:
        # Extract and validate required parameters
        coinbase_api_key = kwargs.get('coinbase_api_key')
        coinbase_api_secret = kwargs.get('coinbase_api_secret')
        
        # Handle both parameter names for OpenAI API key
        openai_api_key = kwargs.get('openai_api_key') or kwargs.get('ai_api_key')
        
        if not all([coinbase_api_key, coinbase_api_secret, openai_api_key]):
            missing = []
            if not coinbase_api_key: missing.append('coinbase_api_key')
            if not coinbase_api_secret: missing.append('coinbase_api_secret')
            if not openai_api_key: missing.append('openai_api_key/ai_api_key')
            raise ValueError(f"Missing required parameters: {', '.join(missing)}")
                
        # Clean up the API secret - replace escaped newlines with actual newlines
        if coinbase_api_secret:
            coinbase_api_secret = coinbase_api_secret.replace('\\n', '\n')
            
        # Log with first few characters for security
        logger.info(f"Creating trader with keys: CB_KEY:{coinbase_api_key[:5]}..., CB_SECRET:{coinbase_api_secret[:5]}..., OPENAI_KEY:{openai_api_key[:5]}...")
        
        # Use the factory function
        trader = create_trader(
            coinbase_api_key=coinbase_api_key,
            coinbase_api_secret=coinbase_api_secret,
            openai_api_key=openai_api_key
        )
        logger.info("Trader created successfully!")
        return trader
    except Exception as e:
        logger.error(f"Error creating trader: {e}")
        raise

# Routes
@app.post("/api/configure")
async def configure_api(request: Request):
    """Configure API keys for the trader"""
    global trader
    
    try:
        data = await request.json()
        
        # Log the API keys (just the first few characters for security)
        keys_present = [key for key in ["coinbase_api_key", "coinbase_api_secret", "openai_api_key"] if key in data]
        logger.info(f"Received API config request with keys present: {', '.join(keys_present)}")
        
        if "coinbase_api_key" in data and "coinbase_api_secret" in data and "openai_api_key" in data:
            logger.info("API Keys (first 10 chars):")
            logger.info(f"Coinbase Key: {data['coinbase_api_key'][:10]}...")
            logger.info(f"Coinbase Secret: {data['coinbase_api_secret'][:10]}...")
            logger.info(f"OpenAI Key: {data['openai_api_key'][:10]}...")
            
            # Create trader instance with provided keys
            logger.info("Creating trader instance...")
            
            # Save API keys to file for persistence across restarts
            save_api_keys_to_file({
                "coinbase_api_key": data["coinbase_api_key"],
                "coinbase_api_secret": data["coinbase_api_secret"],
                "openai_api_key": data["openai_api_key"]
            })
            
            # Create the trader instance
            trader = create_trader_safe(
                coinbase_api_key=data["coinbase_api_key"],
                coinbase_api_secret=data["coinbase_api_secret"],
                ai_api_key=data["openai_api_key"]
            )
            
            logger.info("Trader instance created successfully!")
            return {"status": "success", "message": "API keys configured successfully"}
        else:
            raise HTTPException(status_code=400, detail="Missing required API keys")
    except Exception as e:
        logger.error(f"Error configuring API: {e}")
        raise HTTPException(status_code=500, detail=f"Error configuring API: {str(e)}")

@app.get("/api/market-data")
async def get_market_data(granularity: str = "ONE_HOUR"):
    """Get market data for Bitcoin"""
    if trader is None:
        raise HTTPException(status_code=400, detail="Trader is not initialized. Please configure API keys first.")
    
    try:
        data = trader.fetch_market_data(granularity=granularity)
        
        if data.empty:
            raise HTTPException(status_code=500, detail="Failed to fetch market data")
        
        # Calculate indicators
        data_with_indicators = trader.calculate_technical_indicators(data)
        
        # Properly clean the data for JSON serialization
        # Convert dataframe to records safely
        cleaned_data = []
        
        # Process each row individually to handle problematic values
        for _, row in data_with_indicators.iterrows():
            record = {}
            # Add timestamp from index (assumes DatetimeIndex)
            record['timestamp'] = row.name.isoformat() if hasattr(row.name, 'isoformat') else str(row.name)
            
            # Process each field, replacing problematic values
            for column in data_with_indicators.columns:
                value = row[column]
                # Handle various types of problematic values
                if pd.isna(value) or pd.isnull(value) or value in [float('inf'), float('-inf')]:
                    record[column] = None
                else:
                    record[column] = value
            
            cleaned_data.append(record)
        
        return {"status": "success", "data": cleaned_data}
    except Exception as e:
        logger.error(f"Error fetching market data: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching market data: {str(e)}")

@app.get("/api/account-balance")
async def get_account_balance():
    """Get account balance"""
    if trader is None:
        raise HTTPException(status_code=400, detail="Trader is not initialized. Please configure API keys first.")
    
    try:
        balance = trader.fetch_account_balance()
        return {"status": "success", "data": balance}
    except Exception as e:
        logger.error(f"Error fetching account balance: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching account balance: {str(e)}")

@app.get("/api/positions")
async def get_positions():
    """Get active positions"""
    if trader is None:
        raise HTTPException(status_code=400, detail="Trader is not initialized. Please configure API keys first.")
    
    try:
        positions = trader.load_active_positions()
        return {"status": "success", "data": positions}
    except Exception as e:
        logger.error(f"Error fetching positions: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching positions: {str(e)}")

@app.post("/api/execute-trade")
async def execute_trade(trade: TradeRequest):
    """Execute a trade"""
    if trader is None:
        raise HTTPException(status_code=400, detail="Trader is not initialized. Please configure API keys first.")
    
    try:
        result = trader.execute_trade(
            action=trade.action,
            amount=trade.amount,
            order_type=trade.order_type
        )
        
        if isinstance(result, dict) and result.get('success'):
            # If it's a buy, add a position for tracking
            if trade.action == "BUY":
                # Get current price
                market_data = trader.fetch_market_data()
                current_price = market_data['close'].iloc[-1]
                
                # Add position
                position_size_btc = trade.amount / current_price
                position_id = trader.add_position(
                    entry_price=current_price,
                    size=position_size_btc,
                    stop_loss=current_price * 0.95,  # Default 5% stop loss
                    take_profit=current_price * 1.1,  # Default 10% take profit
                    trailing_stop_pct=0,
                    dynamic_stop_loss=True,
                    atr_multiplier=3.0
                )
                
                # Log the trade
                trader.log_trade(position_id, position_size_btc, "BUY", current_price, "manual")
                
                return {
                    "status": "success", 
                    "message": "Trade executed successfully",
                    "data": {
                        "order_id": result['success_response']['order_id'],
                        "position_id": position_id
                    }
                }
            else:
                # Log sell trade
                trader.log_trade("manual_sell", trade.amount, "SELL", 0, "manual")
                
                return {
                    "status": "success", 
                    "message": "Trade executed successfully",
                    "data": {
                        "order_id": result['success_response']['order_id']
                    }
                }
        else:
            raise HTTPException(status_code=500, detail=f"Error executing trade: {result}")
    except Exception as e:
        logger.error(f"Error executing trade: {e}")
        raise HTTPException(status_code=500, detail=f"Error executing trade: {str(e)}")

@app.put("/api/position/{position_id}")
async def update_position(position_id: str, update: PositionUpdate):
    """Update position details"""
    if trader is None:
        raise HTTPException(status_code=400, detail="Trader is not initialized. Please configure API keys first.")
    
    try:
        positions = trader.load_active_positions()
        
        if position_id not in positions:
            raise HTTPException(status_code=404, detail=f"Position {position_id} not found")
        
        if update.stop_loss:
            trader.update_position_stop_loss(position_id, update.stop_loss)
        
        if update.size:
            trader.update_position_size(position_id, update.size)
        
        # For take_profit, we need to update the whole position
        if update.take_profit:
            position = positions[position_id]
            position['take_profit'] = update.take_profit
            trader.save_active_positions(positions)
        
        return {"status": "success", "message": "Position updated successfully"}
    except Exception as e:
        logger.error(f"Error updating position: {e}")
        raise HTTPException(status_code=500, detail=f"Error updating position: {str(e)}")

@app.delete("/api/position/{position_id}")
async def close_position(position_id: str):
    """Close a position"""
    if trader is None:
        raise HTTPException(status_code=400, detail="Trader is not initialized. Please configure API keys first.")
    
    try:
        positions = trader.load_active_positions()
        
        if position_id not in positions:
            raise HTTPException(status_code=404, detail=f"Position {position_id} not found")
        
        position = positions[position_id]
        
        # Execute sell order
        result = trader.execute_trade(
            action="SELL",
            amount=position['size'],
            order_type="market"
        )
        
        if isinstance(result, dict) and result.get('success'):
            # Remove the position
            trader.remove_position(position_id)
            
            # Log the trade
            current_price = trader.fetch_market_data()['close'].iloc[-1]
            trader.log_trade(position_id, position['size'], "SELL", current_price, "manual_close")
            
            return {
                "status": "success", 
                "message": "Position closed successfully",
                "data": {
                    "order_id": result['success_response']['order_id']
                }
            }
        else:
            raise HTTPException(status_code=500, detail=f"Error closing position: {result}")
    except Exception as e:
        logger.error(f"Error closing position: {e}")
        raise HTTPException(status_code=500, detail=f"Error closing position: {str(e)}")

@app.get("/api/trade-history")
async def get_trade_history(limit: int = 10):
    """Get trade history"""
    if trader is None:
        raise HTTPException(status_code=400, detail="Trader is not initialized. Please configure API keys first.")
    
    try:
        history = trader.get_trade_history(limit=limit)
        return {"status": "success", "data": history}
    except Exception as e:
        logger.error(f"Error fetching trade history: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching trade history: {str(e)}")

@app.post("/api/run-strategy")
async def run_strategy(background_tasks: BackgroundTasks):
    """Run the trading strategy once"""
    return run_strategy_background(background_tasks)

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# Scheduled tasks
@app.on_event("startup")
def startup_event():
    """Initialize the application on startup"""
    global trader
    
    # Set up scheduled tasks
    scheduler_thread = threading.Thread(target=scheduled_tasks)
    scheduler_thread.daemon = True
    scheduler_thread.start()
    
    # Try to load API keys from file and initialize trader
    keys = load_api_keys_from_file()
    if keys:
        try:
            logger.info("Initializing trader with saved API keys...")
            trader = create_trader_safe(
                coinbase_api_key=keys["coinbase_api_key"],
                coinbase_api_secret=keys["coinbase_api_secret"],
                ai_api_key=keys["openai_api_key"]
            )
            logger.info("Trader initialized successfully from saved keys!")
        except Exception as e:
            logger.error(f"Failed to initialize trader with saved keys: {e}")
    else:
        logger.info("No saved API keys found. Please configure API keys.")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True) 