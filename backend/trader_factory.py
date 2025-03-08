"""
Trader Factory module

This module creates BitcoinAITrader instances in a controlled way,
completely isolated from any unwanted parameters.
"""

import sys
import logging
from pathlib import Path

# Configure logging
logger = logging.getLogger(__name__)

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent.parent))

# Import the trader class
from btc_investor_ai_v4 import BitcoinAITrader

def create_trader(coinbase_api_key, coinbase_api_secret, openai_api_key):
    """
    Create a trader instance with EXACTLY the parameters needed.
    """
    try:
        # Log what we're receiving (first few chars only)
        key_preview = coinbase_api_key[:5] if coinbase_api_key else "None"
        secret_preview = coinbase_api_secret[:5] if coinbase_api_secret else "None"
        openai_preview = openai_api_key[:5] if openai_api_key else "None"
        
        logger.info(f"Creating trader with keys: CB_KEY:{key_preview}..., CB_SECRET:{secret_preview}..., OPENAI_KEY:{openai_preview}...")
        
        # Create a new dict with ONLY the required parameters
        trader_params = {
            'coinbase_api_key': str(coinbase_api_key),
            'coinbase_api_secret': str(coinbase_api_secret),
            'ai_api_key': str(openai_api_key)  # Note: using ai_api_key here as that's what BitcoinAITrader expects
        }
        logger.info("Trader created successfully!")
        # Create the trader with EXACT parameters using dictionary unpacking
        trader_instance = BitcoinAITrader(**trader_params)
        
        logger.info("Trader created successfully!")
        return trader_instance
    except Exception as e:
        logger.error(f"Error creating trader: {str(e)}")
        logger.error(f"Exception type: {type(e).__name__}")
        logger.error(f"Exception args: {e.args}")
        # Re-raise with clear message
        raise Exception(f"Failed to initialize trader: {str(e)}")