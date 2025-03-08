import React from 'react';
import { 
  formatPrice, 
  formatBtcAmount,
  formatPercentage,
  calculateProfitLoss,
  calculateProfitLossPercentage,
  getPositionStatusColor
} from '../lib/utils';

export default function PositionsList({ positions, currentPrice, onUpdate, onClose }) {
  if (!positions || Object.keys(positions).length === 0) {
    return (
      <div className="p-4 text-center border border-gray-200 rounded-lg bg-gray-50">
        <p className="text-gray-500">No active positions</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden bg-white shadow sm:rounded-md">
      <ul className="divide-y divide-gray-200">
        {Object.entries(positions).map(([id, position]) => {
          // Calculate profit/loss
          const pl = calculateProfitLoss(
            position.entry_price,
            currentPrice,
            position.size
          );
          
          const plPercentage = calculateProfitLossPercentage(
            position.entry_price,
            currentPrice
          );
          
          // Determine status badge color
          const statusColor = getPositionStatusColor(plPercentage);
          
          return (
            <li key={id}>
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <p className="text-sm font-medium text-primary-600 truncate">
                      Position ID: {id.slice(0, 8)}...
                    </p>
                    <p className="flex items-center mt-1 text-sm text-gray-500">
                      <span>Entry Price: {formatPrice(position.entry_price)}</span>
                      <span className="mx-2">•</span>
                      <span>Size: {formatBtcAmount(position.size)} BTC</span>
                    </p>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColor}`}>
                      {pl >= 0 ? 'Profit' : 'Loss'}: {formatPrice(pl)}
                    </span>
                    <span className="mt-1 text-sm text-gray-500">
                      {formatPercentage(plPercentage)}
                    </span>
                  </div>
                </div>
                
                <div className="mt-4 sm:flex sm:justify-between">
                  <div className="sm:flex">
                    <div className="flex items-center mt-2 text-sm text-gray-500 sm:mt-0">
                      <span>Stop Loss: {formatPrice(position.stop_loss)}</span>
                      <span className="mx-2">•</span>
                      <span>Take Profit: {formatPrice(position.take_profit)}</span>
                    </div>
                  </div>
                  
                  <div className="flex mt-2 space-x-2 sm:mt-0">
                    <button
                      type="button"
                      onClick={() => onUpdate(id, position)}
                      className="inline-flex items-center px-3 py-1 text-sm font-medium text-white border border-transparent rounded-md shadow-sm bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onClose(id)}
                      className="inline-flex items-center px-3 py-1 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
} 