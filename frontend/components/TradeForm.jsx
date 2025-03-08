import React, { useState, useEffect } from 'react';
import { formatPrice } from '../lib/utils';
import toast from 'react-hot-toast';
import bitcoinApi from '../lib/api';

export default function TradeForm({ currentPrice, accountBalance, onTradeComplete }) {
  const [action, setAction] = useState('BUY');
  const [amount, setAmount] = useState('');
  const [amountType, setAmountType] = useState('USD'); // USD or BTC
  const [orderType, setOrderType] = useState('market');
  const [isLoading, setIsLoading] = useState(false);

  // Calculate max amount based on account balance
  const maxAmount = amountType === 'USD'
    ? (accountBalance?.USD?.available || 0)
    : (accountBalance?.BTC?.available || 0);
  
  // Calculate estimated cost/receive amount
  const calculateEstimate = () => {
    if (!amount || !currentPrice) return 0;
    
    if (action === 'BUY') {
      return amountType === 'USD'
        ? parseFloat(amount) / currentPrice // USD to BTC
        : parseFloat(amount) * currentPrice; // BTC to USD
    } else {
      return amountType === 'USD'
        ? parseFloat(amount) / currentPrice // USD to BTC
        : parseFloat(amount) * currentPrice; // BTC to USD
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    
    if (parseFloat(amount) > maxAmount) {
      toast.error(`Amount exceeds your available ${amountType} balance`);
      return;
    }
    
    // Convert amount to USD if needed
    const amountUSD = amountType === 'BTC'
      ? parseFloat(amount) * currentPrice
      : parseFloat(amount);
    
    setIsLoading(true);
    
    try {
      const result = await bitcoinApi.executeTrade({
        action,
        amount: amountUSD,
        order_type: orderType,
      });
      
      if (result.status === 'success') {
        toast.success(`${action} order executed successfully`);
        setAmount('');
        onTradeComplete && onTradeComplete(result);
      } else {
        toast.error(`Error executing trade: ${result.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Trade error:', error);
      toast.error(`Error: ${error.response?.data?.detail || error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-lg font-medium text-gray-900">Trade Bitcoin</h2>
      <p className="mt-1 text-sm text-gray-500">
        Current Price: <span className="font-semibold">{formatPrice(currentPrice)}</span>
      </p>
      
      <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
        {/* Action selection */}
        <div>
          <label className="text-sm font-medium text-gray-700">Action</label>
          <div className="flex mt-1 space-x-4">
            <button
              type="button"
              className={`px-4 py-2 text-sm font-medium border rounded-md ${
                action === 'BUY'
                  ? 'bg-success-50 text-success-700 border-success-200'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
              onClick={() => setAction('BUY')}
            >
              Buy
            </button>
            <button
              type="button"
              className={`px-4 py-2 text-sm font-medium border rounded-md ${
                action === 'SELL'
                  ? 'bg-danger-50 text-danger-700 border-danger-200'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
              onClick={() => setAction('SELL')}
            >
              Sell
            </button>
          </div>
        </div>
        
        {/* Amount input */}
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
            Amount
          </label>
          <div className="relative mt-1 rounded-md shadow-sm">
            <input
              type="number"
              name="amount"
              id="amount"
              className="block w-full pr-20 border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              placeholder="0.00"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={isLoading}
            />
            <div className="absolute inset-y-0 right-0 flex items-center">
              <label htmlFor="amount-type" className="sr-only">
                Amount Type
              </label>
              <select
                id="amount-type"
                name="amount-type"
                className="h-full py-0 pl-2 text-gray-500 bg-transparent border-transparent rounded-md focus:ring-primary-500 focus:border-primary-500 pr-7 sm:text-sm"
                value={amountType}
                onChange={(e) => setAmountType(e.target.value)}
                disabled={isLoading}
              >
                <option value="USD">USD</option>
                <option value="BTC">BTC</option>
              </select>
            </div>
          </div>
          <div className="flex justify-between mt-1">
            <p className="text-xs text-gray-500">
              Available: {amountType === 'USD'
                ? formatPrice(accountBalance?.USD?.available || 0)
                : `${formatPrice(accountBalance?.BTC?.available || 0, '')} BTC`}
            </p>
            <button
              type="button"
              className="text-xs text-primary-600 hover:text-primary-700"
              onClick={() => setAmount(maxAmount.toString())}
              disabled={isLoading}
            >
              Max
            </button>
          </div>
        </div>
        
        {/* Order type */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Order Type</label>
          <select
            className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            value={orderType}
            onChange={(e) => setOrderType(e.target.value)}
            disabled={isLoading}
          >
            <option value="market">Market</option>
            <option value="limit">Limit</option>
          </select>
        </div>
        
        {/* Summary */}
        <div className="p-4 border border-gray-200 rounded-md bg-gray-50">
          <h3 className="text-sm font-medium text-gray-700">Order Summary</h3>
          <div className="mt-2 space-y-1">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Type:</span>
              <span className="text-sm font-medium">{action} {orderType.charAt(0).toUpperCase() + orderType.slice(1)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Amount:</span>
              <span className="text-sm font-medium">
                {amountType === 'USD' ? formatPrice(amount || 0) : `${amount || 0} BTC`}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">
                {action === 'BUY' ? 'Receive (est.):' : 'Receive (est.):'}
              </span>
              <span className="text-sm font-medium">
                {amountType === 'USD'
                  ? `${calculateEstimate().toFixed(8)} BTC`
                  : formatPrice(calculateEstimate())}
              </span>
            </div>
          </div>
        </div>
        
        {/* Submit button */}
        <div>
          <button
            type="submit"
            className={`w-full px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              isLoading
                ? 'bg-gray-400 cursor-not-allowed'
                : action === 'BUY'
                ? 'bg-success-600 hover:bg-success-700 focus:ring-success-500'
                : 'bg-danger-600 hover:bg-danger-700 focus:ring-danger-500'
            }`}
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : `${action} Bitcoin`}
          </button>
        </div>
      </form>
    </div>
  );
} 