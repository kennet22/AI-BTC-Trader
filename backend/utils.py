import os
import json
from datetime import datetime
from pathlib import Path

def load_json_file(filename, default=None):
    """Load data from a JSON file, or return the default if file doesn't exist."""
    try:
        with open(filename, 'r') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return default if default is not None else {}

def save_json_file(filename, data):
    """Save data to a JSON file."""
    # Create directory if it doesn't exist
    os.makedirs(os.path.dirname(filename), exist_ok=True)
    
    with open(filename, 'w') as f:
        json.dump(data, f, indent=2)

def get_app_data_dir():
    """Get the data directory for the application."""
    # Use the ~/.btc-trader directory for storing data
    data_dir = Path.home() / '.btc-trader'
    os.makedirs(data_dir, exist_ok=True)
    return data_dir

def format_price(price, currency='$'):
    """Format a price with the appropriate currency symbol."""
    if currency == '$':
        return f"${price:,.2f}"
    return f"{price:,.2f} {currency}"

def calculate_profit_loss(entry_price, current_price, size, is_long=True):
    """Calculate profit/loss for a position."""
    if is_long:
        return (current_price - entry_price) * size
    else:
        return (entry_price - current_price) * size

def calculate_profit_loss_percentage(entry_price, current_price, is_long=True):
    """Calculate profit/loss percentage for a position."""
    if is_long:
        return (current_price - entry_price) / entry_price * 100
    else:
        return (entry_price - current_price) / entry_price * 100

def is_successful_trade(trade_data):
    """Determine if a trade was successful (profitable)."""
    if 'entry_price' not in trade_data or 'exit_price' not in trade_data:
        return False
    
    pl_pct = calculate_profit_loss_percentage(
        trade_data['entry_price'], 
        trade_data['exit_price'],
        trade_data.get('side', 'BUY') == 'BUY'
    )
    return pl_pct > 0

def calculate_win_rate(trades):
    """Calculate win rate from a list of trades."""
    if not trades:
        return 0
    
    winning_trades = sum(1 for trade in trades if is_successful_trade(trade))
    return winning_trades / len(trades) * 100

def format_timestamp(timestamp, format_str='%Y-%m-%d %H:%M:%S'):
    """Format a timestamp."""
    if isinstance(timestamp, (int, float)):
        timestamp = datetime.fromtimestamp(timestamp)
    return timestamp.strftime(format_str)

def get_trend_emoji(value):
    """Get an emoji indicating the trend (positive/negative)."""
    if value > 0:
        return "🟢"
    elif value < 0:
        return "🔴"
    return "⚪️"

def calculate_position_risk(position, current_price):
    """Calculate the risk for a position."""
    if 'stop_loss' not in position or not position['stop_loss']:
        return None
    
    risk = abs(current_price - position['stop_loss']) / current_price * 100
    return risk

def get_performance_summary(trades):
    """Get a summary of trading performance."""
    if not trades:
        return {
            "total_trades": 0,
            "win_rate": 0,
            "profit_loss": 0,
            "avg_profit_per_trade": 0,
            "avg_loss_per_trade": 0,
            "max_profit": 0,
            "max_loss": 0,
        }
    
    winning_trades = [t for t in trades if is_successful_trade(t)]
    losing_trades = [t for t in trades if not is_successful_trade(t) and 'exit_price' in t]
    
    total_pl = sum(
        calculate_profit_loss(
            t['entry_price'], 
            t['exit_price'],
            t['size'],
            t.get('side', 'BUY') == 'BUY'
        ) 
        for t in trades if 'exit_price' in t
    )
    
    avg_profit = (
        sum(
            calculate_profit_loss(
                t['entry_price'], 
                t['exit_price'],
                t['size'],
                t.get('side', 'BUY') == 'BUY'
            ) 
            for t in winning_trades
        ) / len(winning_trades)
    ) if winning_trades else 0
    
    avg_loss = (
        sum(
            calculate_profit_loss(
                t['entry_price'], 
                t['exit_price'],
                t['size'],
                t.get('side', 'BUY') == 'BUY'
            ) 
            for t in losing_trades
        ) / len(losing_trades)
    ) if losing_trades else 0
    
    max_profit = max(
        [
            calculate_profit_loss(
                t['entry_price'], 
                t['exit_price'],
                t['size'],
                t.get('side', 'BUY') == 'BUY'
            )
            for t in winning_trades
        ] or [0]
    )
    
    max_loss = min(
        [
            calculate_profit_loss(
                t['entry_price'], 
                t['exit_price'],
                t['size'],
                t.get('side', 'BUY') == 'BUY'
            )
            for t in losing_trades
        ] or [0]
    )
    
    return {
        "total_trades": len(trades),
        "win_rate": len(winning_trades) / len(trades) * 100 if trades else 0,
        "profit_loss": total_pl,
        "avg_profit_per_trade": avg_profit,
        "avg_loss_per_trade": avg_loss,
        "max_profit": max_profit,
        "max_loss": max_loss,
    }

def calculate_total_profit_summary(trade_history, active_positions, current_price):
    """
    Calculate both realized and unrealized profit.
    
    Args:
        trade_history: List of trade history entries
        active_positions: List of active positions
        current_price: Current BTC price
        
    Returns:
        Dictionary with realized and unrealized profit information
    """
    # Initialize summary
    summary = {
        "realized_profit": 0,
        "unrealized_profit": 0,
        "total_profit": 0,
        "realized_profit_percentage": 0,
        "unrealized_profit_percentage": 0,
        "total_profit_percentage": 0,
        "total_buy_volume": 0,
        "total_sell_volume": 0,
        "open_positions_count": len(active_positions),
        "closed_positions_count": 0
    }
    
    # Calculate realized profit from trade history
    closed_positions = set()
    total_investment = 0
    
    # First pass: calculate total investment and identify closed positions
    for trade in trade_history:
        if trade.get("side") == "BUY":
            price = trade.get("price", 0)
            size = trade.get("size", 0)
            total_investment += price * size
            summary["total_buy_volume"] += size
        elif trade.get("side") == "SELL":
            summary["total_sell_volume"] += trade.get("size", 0)
            closed_positions.add(trade.get("position_id"))
            if "profit_amount" in trade:
                summary["realized_profit"] += trade["profit_amount"]
    
    summary["closed_positions_count"] = len(closed_positions)
    
    # Calculate unrealized profit from active positions
    for position in active_positions:
        entry_price = position.get("entry_price", 0)
        size = position.get("size", 0)
        is_long = True  # Assuming all positions are long
        
        if entry_price > 0 and size > 0:
            unrealized_profit = calculate_profit_loss(entry_price, current_price, size, is_long)
            summary["unrealized_profit"] += unrealized_profit
    
    # Calculate total profit
    summary["total_profit"] = summary["realized_profit"] + summary["unrealized_profit"]
    
    # Calculate percentages if there was any investment
    if total_investment > 0:
        summary["realized_profit_percentage"] = (summary["realized_profit"] / total_investment) * 100
        summary["total_profit_percentage"] = (summary["total_profit"] / total_investment) * 100
    
    # Calculate unrealized profit percentage based on current open positions value
    open_positions_value = sum(p.get("entry_price", 0) * p.get("size", 0) for p in active_positions)
    if open_positions_value > 0:
        summary["unrealized_profit_percentage"] = (summary["unrealized_profit"] / open_positions_value) * 100
    
    return summary 