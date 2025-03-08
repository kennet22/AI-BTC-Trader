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
import traceback
import requests

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
        ai_api_key = kwargs.get('openai_api_key') or kwargs.get('ai_api_key')
        
        # Call the parent __init__ with positional parameters as expected
        super().__init__(coinbase_api_key, coinbase_api_secret, ai_api_key)
        
    def get_usd_balance(self):
        """Get USD balance directly - forward to the parent method if it exists"""
        if hasattr(super(), 'get_usd_balance'):
            return super().get_usd_balance()
        else:
            # Fallback if the parent class doesn't have the method (backward compatibility)
            balances = self.fetch_account_balance()
            return balances.get('USD', {}).get('available', 0.0)
    
    def get_btc_balance(self):
        """Get BTC balance directly - forward to the parent method if it exists"""
        if hasattr(super(), 'get_btc_balance'):
            return super().get_btc_balance()
        else:
            # Fallback if the parent class doesn't have the method (backward compatibility)
            balances = self.fetch_account_balance()
            return balances.get('BTC', {}).get('available', 0.0)
            
    def execute_trade(self, action, amount, order_type="market", time_in_force="gtc"):
        """Enhanced execute_trade with better error handling and logging"""
        try:
            logger.info(f"Executing {action} trade for {amount:.2f} ({order_type})")
            
            # Call the parent method with try-except to handle errors specifically
            try:
                result = super().execute_trade(action, amount, order_type, time_in_force)
            except requests.exceptions.HTTPError as http_error:
                logger.error(f"HTTP Error in execute_trade: {http_error}")
                # Extract error details from the response if possible
                error_details = {}
                try:
                    if hasattr(http_error, 'response') and http_error.response:
                        error_text = http_error.response.text
                        error_details = json.loads(error_text)
                except (json.JSONDecodeError, AttributeError):
                    error_details = {'message': str(http_error)}
                
                # Return structured error
                return {
                    'error': {
                        'message': str(http_error),
                        'type': 'HTTPError',
                        'details': error_details
                    }
                }
            except Exception as e:
                logger.error(f"Error in execute_trade: {str(e)}")
                return {
                    'error': {
                        'message': str(e),
                        'type': type(e).__name__
                    }
                }
            
            # Enhanced logging of the result
            if result:
                if isinstance(result, dict):
                    if result.get('success'):
                        logger.info(f"Trade executed successfully")
                    elif result.get('error'):
                        logger.error(f"Trade execution error: {result.get('error', {})}")
                else:
                    logger.info(f"Trade execution completed")
            else:
                logger.warning("Trade execution returned None")
                
            return result
        except Exception as e:
            logger.error(f"Error in CustomBitcoinAITrader.execute_trade: {str(e)}")
            return {
                'error': {
                    'message': str(e),
                    'type': type(e).__name__
                }
            }

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(levelname)-8s | %(message)s',
    handlers=[
        logging.StreamHandler()
    ]
)

# Create a logger for the app
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
    order_type: str = "market"  # Default to market order for simplicity
    time_in_force: str = "gtc"  # Add time_in_force parameter with default

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
        # Get balances using both general and direct methods
        # First try with the standard method
        balance = trader.fetch_account_balance()
        
        # Now try the direct methods for more accurate values
        try:
            logger.debug("Using direct balance methods for more accurate balance information")
            usd_balance = trader.get_usd_balance()
            btc_balance = trader.get_btc_balance()
            
            # If direct methods worked, update the balance dictionary with these values
            if usd_balance is not None:
                if 'USD' not in balance:
                    balance['USD'] = {'available': 0.0, 'hold': 0.0, 'total': 0.0}
                balance['USD']['available'] = usd_balance
                balance['USD']['total'] = usd_balance  # We might not have hold info, so set total = available
            
            if btc_balance is not None:
                if 'BTC' not in balance:
                    balance['BTC'] = {'available': 0.0, 'hold': 0.0, 'total': 0.0}
                balance['BTC']['available'] = btc_balance
                balance['BTC']['total'] = btc_balance  # We might not have hold info, so set total = available
            
            logger.info(f"Account balances - USD: ${balance.get('USD', {}).get('available', 0):.2f}, BTC: {balance.get('BTC', {}).get('available', 0):.8f}")
        except Exception as inner_e:
            logger.warning(f"Error using direct balance methods: {inner_e}")
        
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
        logger.info(f"Trade request: {trade.action} {trade.amount:.2f} ({trade.order_type})")
        
        # Validate the action
        if trade.action not in ["BUY", "SELL"]:
            raise HTTPException(status_code=400, detail=f"Invalid action: {trade.action}. Must be BUY or SELL.")
        
        # Validate order type
        if trade.order_type not in ["market", "limit"]:
            raise HTTPException(status_code=400, detail=f"Invalid order type: {trade.order_type}. Must be market or limit.")
        
        # Validate time_in_force
        if trade.time_in_force not in ["gtc", "ioc", "fok"]:
            raise HTTPException(status_code=400, detail=f"Invalid time_in_force: {trade.time_in_force}. Must be gtc, ioc, or fok.")
        
        # Check account balance before executing trade
        balance = trader.fetch_account_balance()
        
        # For buy orders, check USD balance
        if trade.action == "BUY":
            usd_balance = balance.get('USD', {}).get('available', 0)
            logger.debug(f"USD balance before trade: {usd_balance}")
            if usd_balance < trade.amount:
                raise HTTPException(status_code=400, detail=f"Insufficient USD balance: {usd_balance:.2f}. Needed: {trade.amount:.2f}")
        
        # For sell orders, check BTC balance
        elif trade.action == "SELL":
            btc_balance = balance.get('BTC', {}).get('available', 0)
            logger.debug(f"BTC balance before trade: {btc_balance}")
            if btc_balance < trade.amount:
                raise HTTPException(status_code=400, detail=f"Insufficient BTC balance: {btc_balance:.8f}. Needed: {trade.amount:.8f}")
        
        # Execute the trade with all parameters
        result = trader.execute_trade(
            action=trade.action,
            amount=trade.amount,
            order_type=trade.order_type,
            time_in_force=trade.time_in_force
        )
        
        logger.debug(f"Trade execution result type: {type(result)}")
        
        if result and (isinstance(result, dict) and result.get('success')):
            # If it's a buy, add a position for tracking
            if trade.action == "BUY":
                try:
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
                    
                    logger.info(f"Buy position created: ID {position_id}, size {position_size_btc:.8f} BTC")
                    
                    return {
                        "status": "success", 
                        "message": "Trade executed successfully",
                        "data": {
                            "order_id": result['success_response'].get('order_id', 'unknown'),
                            "position_id": position_id
                        }
                    }
                except Exception as e:
                    # The trade went through but position tracking failed
                    logger.error(f"Trade executed but position tracking failed: {e}")
                    return {
                        "status": "partial_success",
                        "message": "Trade executed but position tracking failed",
                        "data": {
                            "order_id": result['success_response'].get('order_id', 'unknown'),
                            "error": str(e)
                        }
                    }
            else:
                # Log sell trade
                try:
                    trader.log_trade("manual_sell", trade.amount, "SELL", 0, "manual")
                    
                    logger.info(f"Sell order executed: {trade.amount:.8f} BTC")
                    
                    return {
                        "status": "success", 
                        "message": "Trade executed successfully",
                        "data": {
                            "order_id": result['success_response'].get('order_id', 'unknown')
                        }
                    }
                except Exception as e:
                    # The trade went through but logging failed
                    logger.error(f"Trade executed but logging failed: {e}")
                    return {
                        "status": "partial_success",
                        "message": "Trade executed but logging failed",
                        "data": {
                            "order_id": result['success_response'].get('order_id', 'unknown'),
                            "error": str(e)
                        }
                    }
        elif result and isinstance(result, dict) and result.get('error'):
            # Got a structured error response
            error_detail = result.get('error', {})
            error_message = error_detail.get('message', 'Unknown error')
            error_type = error_detail.get('type', 'UnknownError')
            
            logger.error(f"Trade execution failed: {error_type} - {error_message}")
            raise HTTPException(status_code=400, detail=f"Trade execution failed: {error_message}")
        else:
            logger.error(f"Error executing trade: Unknown error or invalid response format")
            raise HTTPException(status_code=500, detail=f"Error executing trade: Unknown error or invalid response format")
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