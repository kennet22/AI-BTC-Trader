import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { formatPrice, formatPercentage, formatDate, formatBtcAmount } from '../lib/utils';
import bitcoinApi from '../lib/api';
import toast from 'react-hot-toast';

export default function History() {
  const router = useRouter();
  const [isConfigured, setIsConfigured] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [tradeHistory, setTradeHistory] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    win: 0,
    loss: 0,
    winRate: 0,
    totalProfit: 0,
    totalLoss: 0,
    netProfit: 0,
  });

  // Check if API is configured on mount
  useEffect(() => {
    const apiConfigured = localStorage.getItem('btc_trader_api_configured') === 'true';
    setIsConfigured(apiConfigured);
    
    if (apiConfigured) {
      fetchTradeHistory();
    } else {
      setIsLoading(false);
      router.push('/');
    }
  }, []);

  // Fetch trade history
  const fetchTradeHistory = async () => {
    setIsLoading(true);
    
    try {
      const response = await bitcoinApi.getTradeHistory(50); // Get last 50 trades
      
      if (response.status === 'success') {
        const trades = response.data || [];
        setTradeHistory(trades);
        
        // Calculate summary
        const completed = trades.filter(trade => trade.exit_price);
        const winning = completed.filter(trade => (
          trade.side === 'BUY' 
            ? trade.exit_price > trade.entry_price 
            : trade.exit_price < trade.entry_price
        ));
        const losing = completed.filter(trade => (
          trade.side === 'BUY' 
            ? trade.exit_price < trade.entry_price 
            : trade.exit_price > trade.entry_price
        ));
        
        const totalProfit = winning.reduce((sum, trade) => {
          const profitAmount = trade.side === 'BUY'
            ? (trade.exit_price - trade.entry_price) * trade.size
            : (trade.entry_price - trade.exit_price) * trade.size;
          return sum + profitAmount;
        }, 0);
        
        const totalLoss = losing.reduce((sum, trade) => {
          const lossAmount = trade.side === 'BUY'
            ? (trade.entry_price - trade.exit_price) * trade.size
            : (trade.exit_price - trade.entry_price) * trade.size;
          return sum + lossAmount;
        }, 0);
        
        setSummary({
          total: completed.length,
          win: winning.length,
          loss: losing.length,
          winRate: completed.length > 0 ? (winning.length / completed.length) * 100 : 0,
          totalProfit,
          totalLoss,
          netProfit: totalProfit - totalLoss,
        });
      } else {
        toast.error('Failed to fetch trade history');
      }
    } catch (error) {
      console.error('Error fetching trade history:', error);
      toast.error('Error fetching trade history. Please check your API configuration.');
    } finally {
      setIsLoading(false);
    }
  };

  // Get CSS class for profit/loss
  const getProfitLossClass = (value) => {
    if (value > 0) return 'text-success-600';
    if (value < 0) return 'text-danger-600';
    return 'text-gray-500';
  };

  return (
    <Layout>
      <div className="pb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Trade History</h1>
          <button
            type="button"
            onClick={fetchTradeHistory}
            className="inline-flex items-center px-3 py-2 text-sm font-medium text-white border border-transparent rounded-md shadow-sm bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
        
        {/* Summary Cards */}
        <div className="grid grid-cols-1 gap-5 mt-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="p-5 bg-white rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Win Rate</h3>
            <p className="mt-1 text-xl font-semibold text-gray-900">{formatPercentage(summary.winRate)}</p>
            <p className="mt-1 text-sm text-gray-500">{summary.win} wins / {summary.loss} losses</p>
          </div>
          
          <div className="p-5 bg-white rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Total Trades</h3>
            <p className="mt-1 text-xl font-semibold text-gray-900">{summary.total}</p>
          </div>
          
          <div className="p-5 bg-white rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Net Profit/Loss</h3>
            <p className={`mt-1 text-xl font-semibold ${getProfitLossClass(summary.netProfit)}`}>
              {formatPrice(summary.netProfit)}
            </p>
          </div>
          
          <div className="p-5 bg-white rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Average P/L</h3>
            <p className={`mt-1 text-xl font-semibold ${getProfitLossClass(summary.total > 0 ? summary.netProfit / summary.total : 0)}`}>
              {formatPrice(summary.total > 0 ? summary.netProfit / summary.total : 0)}
            </p>
          </div>
        </div>
        
        {/* Trade History Table */}
        <div className="mt-6">
          <div className="overflow-hidden bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h2 className="text-lg font-medium text-gray-900">Recent Trades</h2>
            </div>
            
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <p className="text-gray-500">Loading trade history...</p>
              </div>
            ) : tradeHistory.length === 0 ? (
              <div className="flex items-center justify-center h-32">
                <p className="text-gray-500">No trade history available</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                        Date
                      </th>
                      <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                        Type
                      </th>
                      <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                        Size
                      </th>
                      <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                        Entry Price
                      </th>
                      <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                        Exit Price
                      </th>
                      <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                        P/L
                      </th>
                      <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                        P/L %
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {tradeHistory.map((trade, index) => {
                      const isCompleted = Boolean(trade.exit_price);
                      
                      // Calculate profit/loss
                      const profitLoss = isCompleted
                        ? trade.side === 'BUY'
                          ? (trade.exit_price - trade.entry_price) * trade.size
                          : (trade.entry_price - trade.exit_price) * trade.size
                        : 0;
                        
                      // Calculate profit/loss percentage
                      const profitLossPercent = isCompleted
                        ? trade.side === 'BUY'
                          ? ((trade.exit_price - trade.entry_price) / trade.entry_price) * 100
                          : ((trade.entry_price - trade.exit_price) / trade.entry_price) * 100
                        : 0;
                        
                      return (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{formatDate(trade.entry_time)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              trade.side === 'BUY' ? 'bg-success-100 text-success-800' : 'bg-danger-100 text-danger-800'
                            }`}>
                              {trade.side}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{formatBtcAmount(trade.size)} BTC</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{formatPrice(trade.entry_price)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {isCompleted ? formatPrice(trade.exit_price) : '-'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className={`text-sm ${isCompleted ? getProfitLossClass(profitLoss) : 'text-gray-500'}`}>
                              {isCompleted ? formatPrice(profitLoss) : '-'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className={`text-sm ${isCompleted ? getProfitLossClass(profitLossPercent) : 'text-gray-500'}`}>
                              {isCompleted ? formatPercentage(profitLossPercent) : '-'}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
} 