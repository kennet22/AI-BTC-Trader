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

def create_trader(coinbase_api_key, coinbase_api_secret, openai_api_key, crypto_asset="BTC"):
    """
    Create a trader instance with EXACTLY the parameters needed.
    """
    try:
        # Log what we're receiving (first few chars only)
        key_preview = coinbase_api_key[:5] if coinbase_api_key else "None"
        secret_preview = coinbase_api_secret[:5] if coinbase_api_secret else "None"
        openai_preview = openai_api_key[:5] if openai_api_key else "None"
        
        logger.info(f"Creating trader with keys: CB_KEY:{key_preview}..., CB_SECRET:{secret_preview}..., OPENAI_KEY:{openai_preview}..., CRYPTO_ASSET:{crypto_asset}")
        
        # Create the trader with positional parameters (not keyword arguments)
        # as that's what the current BitcoinAITrader __init__ expects
        trader_instance = BitcoinAITrader(
            coinbase_api_key,
            coinbase_api_secret,
            openai_api_key,  # Using openai_api_key directly
            crypto_asset     # Pass the crypto asset parameter
        )
        
        logger.info(f"Trader created successfully for {crypto_asset}!")
        return trader_instance
    except Exception as e:
        logger.error(f"Error creating trader: {str(e)}")
        logger.error(f"Exception type: {type(e).__name__}")
        logger.error(f"Exception args: {e.args}")
        # Re-raise with clear message
        raise Exception(f"Failed to initialize trader for {crypto_asset}: {str(e)}")