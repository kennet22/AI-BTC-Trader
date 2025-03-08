import React, { useState, useEffect } from 'react';
import { formatPrice, formatPercentage } from '../lib/utils';

const TechnicalIndicators = ({ marketData }) => {
  if (!marketData || marketData.length === 0) {
    return (
      <div className="p-4 bg-white rounded-lg shadow">
        <div className="text-gray-500">No market data available</div>
      </div>
    );
  }

  // Get the latest data point
  const latestData = marketData[marketData.length - 1];
  
  // Calculate 24h change
  const previousData = marketData.length > 24 ? marketData[marketData.length - 25] : marketData[0];
  const priceChange24h = ((latestData.close / previousData.close) - 1) * 100;

  // Helper function to safely render a numeric value
  const safeRender = (value, decimals = 2) => {
    if (value === undefined || value === null) return 'N/A';
    if (typeof value === 'object') return JSON.stringify(value);
    if (typeof value === 'number') return value.toFixed(decimals);
    return String(value);
  };

  // Helper function to safely render a price
  const safeRenderPrice = (value) => {
    if (value === undefined || value === null) return 'N/A';
    if (typeof value === 'object') return JSON.stringify(value);
    try {
      return formatPrice(value);
    } catch (e) {
      return String(value);
    }
  };

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">Technical Indicators</h3>
        <p className="mt-1 max-w-2xl text-sm text-gray-500">
          Current market analysis indicators
        </p>
      </div>
      <div className="border-t border-gray-200">
        <dl>
          <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-500">Price</dt>
            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
              {safeRenderPrice(latestData.close)}
              <span className={`ml-2 ${priceChange24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatPercentage(priceChange24h)} (24h)
              </span>
            </dd>
          </div>
          
          <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-500">Moving Averages</dt>
            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
              <div className="flex flex-col space-y-1">
                <div>SMA 20: {safeRenderPrice(latestData.sma_20)}</div>
                <div>SMA 50: {safeRenderPrice(latestData.sma_50)}</div>
                <div>EMA 12: {safeRenderPrice(latestData.ema_12)}</div>
                <div>EMA 26: {safeRenderPrice(latestData.ema_26)}</div>
              </div>
            </dd>
          </div>
          
          <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-500">Oscillators</dt>
            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
              <div className="flex flex-col space-y-1">
                <div>RSI (14): {safeRender(latestData.rsi)}</div>
                <div>MACD: {safeRender(latestData.macd)}</div>
                <div>MACD Signal: {safeRender(latestData.macd_signal)}</div>
                <div>MACD Histogram: {safeRender(latestData.macd_hist)}</div>
              </div>
            </dd>
          </div>
          
          <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-500">Volatility</dt>
            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
              <div className="flex flex-col space-y-1">
                <div>ATR (14): {safeRender(latestData.atr)}</div>
                <div>Bollinger Upper: {safeRenderPrice(latestData.bb_upper)}</div>
                <div>Bollinger Middle: {safeRenderPrice(latestData.bb_middle)}</div>
                <div>Bollinger Lower: {safeRenderPrice(latestData.bb_lower)}</div>
              </div>
            </dd>
          </div>
          
          {latestData.awesome_oscillator !== undefined && (
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Advanced Indicators</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                <div className="flex flex-col space-y-1">
                  <div>Awesome Oscillator: {safeRender(latestData.awesome_oscillator)}</div>
                  {latestData.stoch_rsi_k !== undefined && (
                    <>
                      <div>Stochastic RSI %K: {safeRender(latestData.stoch_rsi_k)}</div>
                      <div>Stochastic RSI %D: {safeRender(latestData.stoch_rsi_d)}</div>
                    </>
                  )}
                  {latestData.mfi !== undefined && (
                    <div>Money Flow Index: {safeRender(latestData.mfi)}</div>
                  )}
                </div>
              </dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  );
};

export default TechnicalIndicators; 