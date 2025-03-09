import React, { useState } from 'react';
import { ChartBarIcon, XMarkIcon } from '@heroicons/react/24/outline';

// Available technical indicators
const AVAILABLE_INDICATORS = [
  { 
    id: 'sma', 
    name: 'Simple Moving Average (SMA)', 
    description: 'Average price over a period',
    defaultPeriod: 20,
    color: 'rgb(255, 99, 132)',
    type: 'overlay'
  },
  { 
    id: 'ema', 
    name: 'Exponential Moving Average (EMA)', 
    description: 'Weighted average with more focus on recent prices',
    defaultPeriod: 20,
    color: 'rgb(54, 162, 235)',
    type: 'overlay'
  },
  { 
    id: 'bb', 
    name: 'Bollinger Bands', 
    description: 'Volatility bands above and below a moving average',
    defaultPeriod: 20,
    color: 'rgb(75, 192, 192)',
    type: 'overlay',
    hasMultipleLines: true
  },
  { 
    id: 'rsi', 
    name: 'Relative Strength Index (RSI)', 
    description: 'Momentum oscillator measuring speed and change of price movements',
    defaultPeriod: 14,
    color: 'rgb(153, 102, 255)',
    type: 'oscillator',
    min: 0,
    max: 100,
    levels: [30, 70]
  },
  { 
    id: 'macd', 
    name: 'MACD', 
    description: 'Trend-following momentum indicator',
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    color: 'rgb(255, 159, 64)',
    type: 'oscillator',
    hasMultipleLines: true
  },
  { 
    id: 'volume', 
    name: 'Volume', 
    description: 'Trading volume',
    color: 'rgba(75, 192, 192, 0.5)',
    type: 'volume'
  }
];

const ChartIndicators = ({ activeIndicators = [], onIndicatorChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  // Handle adding a new indicator
  const handleAddIndicator = (indicator) => {
    // Create a new indicator with default settings
    const newIndicator = {
      ...indicator,
      id: `${indicator.id}_${Date.now()}`, // Unique ID for this instance
      isActive: true,
      settings: {
        period: indicator.defaultPeriod || 14,
        fastPeriod: indicator.fastPeriod || 12,
        slowPeriod: indicator.slowPeriod || 26,
        signalPeriod: indicator.signalPeriod || 9
      }
    };
    
    onIndicatorChange([...activeIndicators, newIndicator]);
  };
  
  // Handle removing an indicator
  const handleRemoveIndicator = (indicatorId) => {
    onIndicatorChange(activeIndicators.filter(ind => ind.id !== indicatorId));
  };
  
  // Handle updating indicator settings
  const handleUpdateIndicator = (indicatorId, settings) => {
    onIndicatorChange(
      activeIndicators.map(ind => 
        ind.id === indicatorId 
          ? { ...ind, settings: { ...ind.settings, ...settings } }
          : ind
      )
    );
  };
  
  // Group indicators by type
  const groupedIndicators = AVAILABLE_INDICATORS.reduce((acc, indicator) => {
    const type = indicator.type || 'other';
    if (!acc[type]) acc[type] = [];
    acc[type].push(indicator);
    return acc;
  }, {});
  
  return (
    <div className="relative">
      {/* Indicator selection button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center px-3 py-2 text-sm font-medium text-white border border-transparent rounded-md shadow-sm bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
      >
        <ChartBarIcon className="w-4 h-4 mr-2" />
        {isOpen ? 'Hide Indicators' : 'Add Indicators'}
      </button>
      
      {/* Active indicators display */}
      {activeIndicators.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {activeIndicators.map(indicator => (
            <div 
              key={indicator.id} 
              className="inline-flex items-center px-3 py-1 text-sm bg-gray-100 rounded-full"
              style={{ borderLeft: `4px solid ${indicator.color}` }}
            >
              <span>{indicator.name}</span>
              {indicator.settings.period && (
                <span className="ml-1 text-gray-500">({indicator.settings.period})</span>
              )}
              <button 
                onClick={() => handleRemoveIndicator(indicator.id)}
                className="ml-2 text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
      
      {/* Indicator selection panel */}
      {isOpen && (
        <div className="absolute z-10 mt-2 w-full max-w-md bg-white rounded-md shadow-lg p-4 border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Technical Indicators</h3>
          
          {Object.entries(groupedIndicators).map(([type, indicators]) => (
            <div key={type} className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 uppercase mb-2">
                {type === 'overlay' ? 'Price Overlays' : 
                 type === 'oscillator' ? 'Oscillators' : 
                 type === 'volume' ? 'Volume' : 'Other Indicators'}
              </h4>
              
              <div className="space-y-2">
                {indicators.map(indicator => (
                  <div 
                    key={indicator.id}
                    className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-md cursor-pointer"
                    onClick={() => handleAddIndicator(indicator)}
                  >
                    <div>
                      <div className="font-medium">{indicator.name}</div>
                      <div className="text-sm text-gray-500">{indicator.description}</div>
                    </div>
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: indicator.color }}
                    ></div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          
          {/* Active indicator settings */}
          {activeIndicators.length > 0 && (
            <div className="mt-4 border-t border-gray-200 pt-4">
              <h4 className="text-sm font-medium text-gray-700 uppercase mb-2">Indicator Settings</h4>
              
              <div className="space-y-4">
                {activeIndicators.map(indicator => (
                  <div key={indicator.id} className="p-2 bg-gray-50 rounded-md">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{indicator.name}</span>
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: indicator.color }}
                      ></div>
                    </div>
                    
                    {/* Period setting for SMA, EMA, BB, RSI */}
                    {indicator.settings.period !== undefined && (
                      <div className="flex items-center">
                        <label className="text-sm text-gray-600 w-16">Period:</label>
                        <input 
                          type="range" 
                          min="2" 
                          max="200" 
                          value={indicator.settings.period} 
                          onChange={(e) => handleUpdateIndicator(
                            indicator.id, 
                            { period: parseInt(e.target.value) }
                          )}
                          className="flex-1 mx-2"
                        />
                        <span className="text-sm w-8 text-right">{indicator.settings.period}</span>
                      </div>
                    )}
                    
                    {/* MACD specific settings */}
                    {indicator.id.startsWith('macd') && (
                      <>
                        <div className="flex items-center mt-1">
                          <label className="text-sm text-gray-600 w-16">Fast:</label>
                          <input 
                            type="range" 
                            min="2" 
                            max="50" 
                            value={indicator.settings.fastPeriod} 
                            onChange={(e) => handleUpdateIndicator(
                              indicator.id, 
                              { fastPeriod: parseInt(e.target.value) }
                            )}
                            className="flex-1 mx-2"
                          />
                          <span className="text-sm w-8 text-right">{indicator.settings.fastPeriod}</span>
                        </div>
                        
                        <div className="flex items-center mt-1">
                          <label className="text-sm text-gray-600 w-16">Slow:</label>
                          <input 
                            type="range" 
                            min="2" 
                            max="50" 
                            value={indicator.settings.slowPeriod} 
                            onChange={(e) => handleUpdateIndicator(
                              indicator.id, 
                              { slowPeriod: parseInt(e.target.value) }
                            )}
                            className="flex-1 mx-2"
                          />
                          <span className="text-sm w-8 text-right">{indicator.settings.slowPeriod}</span>
                        </div>
                        
                        <div className="flex items-center mt-1">
                          <label className="text-sm text-gray-600 w-16">Signal:</label>
                          <input 
                            type="range" 
                            min="2" 
                            max="50" 
                            value={indicator.settings.signalPeriod} 
                            onChange={(e) => handleUpdateIndicator(
                              indicator.id, 
                              { signalPeriod: parseInt(e.target.value) }
                            )}
                            className="flex-1 mx-2"
                          />
                          <span className="text-sm w-8 text-right">{indicator.settings.signalPeriod}</span>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 text-sm font-medium text-primary-600 hover:text-primary-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChartIndicators; 