import React, { useEffect, useState, useRef } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import { enUS } from 'date-fns/locale';
import { ClockIcon, GlobeAltIcon } from '@heroicons/react/24/outline';
import { formatPrice } from '../lib/utils';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

// Technical indicator calculation functions
const calculateIndicators = {
  // Simple Moving Average
  sma: (data, period) => {
    const prices = data.map(item => item.close);
    const result = [];
    
    for (let i = 0; i < prices.length; i++) {
      if (i < period - 1) {
        result.push(null); // Not enough data yet
      } else {
        const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
        result.push(sum / period);
      }
    }
    
    return result;
  },
  
  // Exponential Moving Average
  ema: (data, period) => {
    const prices = data.map(item => item.close);
    const result = [];
    const multiplier = 2 / (period + 1);
    
    // Start with SMA for the first EMA value
    const firstSMA = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
    result.push(...Array(period - 1).fill(null));
    result.push(firstSMA);
    
    for (let i = period; i < prices.length; i++) {
      const ema = (prices[i] - result[i - 1]) * multiplier + result[i - 1];
      result.push(ema);
    }
    
    return result;
  },
  
  // Bollinger Bands
  bb: (data, period) => {
    const prices = data.map(item => item.close);
    const sma = calculateIndicators.sma(data, period);
    const upper = [];
    const lower = [];
    
    for (let i = 0; i < prices.length; i++) {
      if (i < period - 1) {
        upper.push(null);
        lower.push(null);
      } else {
        const slice = prices.slice(i - period + 1, i + 1);
        const sum = slice.reduce((a, b) => a + b, 0);
        const mean = sum / period;
        
        // Calculate standard deviation
        const squaredDiffs = slice.map(price => Math.pow(price - mean, 2));
        const variance = squaredDiffs.reduce((a, b) => a + b, 0) / period;
        const stdDev = Math.sqrt(variance);
        
        upper.push(sma[i] + (2 * stdDev));
        lower.push(sma[i] - (2 * stdDev));
      }
    }
    
    return { middle: sma, upper, lower };
  },
  
  // Relative Strength Index
  rsi: (data, period) => {
    const prices = data.map(item => item.close);
    const result = [];
    
    // Calculate price changes
    const changes = [];
    for (let i = 1; i < prices.length; i++) {
      changes.push(prices[i] - prices[i - 1]);
    }
    
    // Initial null values
    result.push(...Array(period).fill(null));
    
    for (let i = period; i < prices.length; i++) {
      const periodChanges = changes.slice(i - period, i);
      const gains = periodChanges.filter(change => change > 0);
      const losses = periodChanges.filter(change => change < 0).map(loss => Math.abs(loss));
      
      const avgGain = gains.reduce((a, b) => a + b, 0) / period;
      const avgLoss = losses.reduce((a, b) => a + b, 0) / period;
      
      if (avgLoss === 0) {
        result.push(100);
      } else {
        const rs = avgGain / avgLoss;
        const rsi = 100 - (100 / (1 + rs));
        result.push(rsi);
      }
    }
    
    return result;
  },
  
  // MACD
  macd: (data, { fastPeriod, slowPeriod, signalPeriod }) => {
    const fastEMA = calculateIndicators.ema(data, fastPeriod);
    const slowEMA = calculateIndicators.ema(data, slowPeriod);
    
    // Calculate MACD line
    const macdLine = [];
    for (let i = 0; i < data.length; i++) {
      if (fastEMA[i] === null || slowEMA[i] === null) {
        macdLine.push(null);
      } else {
        macdLine.push(fastEMA[i] - slowEMA[i]);
      }
    }
    
    // Calculate signal line (EMA of MACD line)
    const signalLine = [];
    const validMacd = macdLine.filter(val => val !== null);
    const firstSignal = validMacd.slice(0, signalPeriod).reduce((a, b) => a + b, 0) / signalPeriod;
    
    for (let i = 0; i < data.length; i++) {
      if (i < slowPeriod + signalPeriod - 2) {
        signalLine.push(null);
      } else if (i === slowPeriod + signalPeriod - 2) {
        signalLine.push(firstSignal);
      } else {
        const multiplier = 2 / (signalPeriod + 1);
        const signal = (macdLine[i] - signalLine[i - 1]) * multiplier + signalLine[i - 1];
        signalLine.push(signal);
      }
    }
    
    // Calculate histogram
    const histogram = [];
    for (let i = 0; i < data.length; i++) {
      if (macdLine[i] === null || signalLine[i] === null) {
        histogram.push(null);
      } else {
        histogram.push(macdLine[i] - signalLine[i]);
      }
    }
    
    return { macdLine, signalLine, histogram };
  },
  
  // Volume
  volume: (data) => {
    return data.map(item => item.volume || 0);
  }
};

// Helper function to determine time unit based on timeframe
const getTimeUnit = (timeframe) => {
  switch (timeframe) {
    case 'ONE_MINUTE':
    case 'FIVE_MINUTE':
    case 'FIFTEEN_MINUTE':
    case 'THIRTY_MINUTE':
    case 'ONE_HOUR':
      return 'hour';
    case 'TWO_HOUR':
    case 'SIX_HOUR':
    case 'ONE_DAY':
      return 'day';
    case 'ONE_WEEK':
      return 'week';
    case 'ONE_MONTH':
      return 'month';
    default:
      return 'hour';
  }
};

// Format number with appropriate suffix (K, M, B)
const formatAxisValue = (value) => {
  if (value === 0) return '0';
  
  // For volume axis (in millions)
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  
  // For price axis (in dollars)
  return `$${value.toLocaleString('en-US')}`;
};

export default function BitcoinPriceChart({ 
  marketData = [], 
  data = [], // For backward compatibility
  timeframe = 'ONE_HOUR', 
  indicators = [],
  onTimeframeChange,
  cryptoAsset = 'BTC',
  isLoading = false
}) {
  // Get crypto name based on symbol
  const getCryptoName = (symbol) => {
    const cryptoNames = {
      'BTC': 'Bitcoin',
      'ETH': 'Ethereum',
      'SOL': 'Solana',
      'XRP': 'Ripple',
      'USDC': 'USD Coin',
      'ADA': 'Cardano',
      'DOGE': 'Dogecoin',
      'SHIB': 'Shiba Inu',
      'BTC-USDC': 'Bitcoin/USDC'
    };
    
    return cryptoNames[symbol] || symbol;
  };

  // Use marketData if provided, otherwise fall back to data (for backward compatibility)
  const chartData = marketData.length > 0 ? marketData : data;

  const [chartOptions, setChartOptions] = useState({});
  const [chartDatasets, setChartDatasets] = useState({ datasets: [] });
  const [use24HourFormat, setUse24HourFormat] = useState(true);
  const [useLocalTimezone, setUseLocalTimezone] = useState(true);
  const [localLoading, setLocalLoading] = useState(false);
  
  // Use refs to store previous values to prevent unnecessary re-renders
  const prevDataRef = useRef();
  const prevTimeframeRef = useRef();
  const prevIndicatorsRef = useRef();
  const prevTimeFormatRef = useRef();
  const prevTimezoneRef = useRef();
  const prevCryptoAssetRef = useRef();
  const indicatorsStringified = JSON.stringify(indicators);
  
  // Calculate chart height based on number of indicators
  const getChartHeight = () => {
    // Count how many different axis types we have
    const hasRSI = indicators.some(ind => ind.isActive && ind.id.split('_')[0] === 'rsi');
    const hasMACD = indicators.some(ind => ind.isActive && ind.id.split('_')[0] === 'macd');
    const hasVolume = indicators.some(ind => ind.isActive && ind.id.split('_')[0] === 'volume');
    
    // Base height plus additional height for each indicator type
    let height = 300; // Base height
    
    if (hasRSI) height += 80;
    if (hasMACD) height += 80;
    if (hasVolume) height += 40;
    
    return height;
  };

  useEffect(() => {
    if (!chartData || chartData.length === 0) return;
    
    // Check if data or dependencies have changed
    const dataChanged = prevDataRef.current !== chartData;
    const timeframeChanged = prevTimeframeRef.current !== timeframe;
    const indicatorsChanged = prevIndicatorsRef.current !== indicatorsStringified;
    const timeFormatChanged = prevTimeFormatRef.current !== use24HourFormat;
    const timezoneChanged = prevTimezoneRef.current !== useLocalTimezone;
    const cryptoAssetChanged = prevCryptoAssetRef.current !== cryptoAsset;
    
    if (!dataChanged && !timeframeChanged && !indicatorsChanged && !timeFormatChanged && !timezoneChanged && !cryptoAssetChanged) {
      return; // Skip update if nothing has changed
    }
    
    // Set loading state when crypto asset changes
    if (cryptoAssetChanged) {
      setLocalLoading(true);
      // This loading state will be cleared once the chart is rendered
      setTimeout(() => setLocalLoading(false), 500);
    }
    
    // Update refs
    prevDataRef.current = chartData;
    prevTimeframeRef.current = timeframe;
    prevIndicatorsRef.current = indicatorsStringified;
    prevTimeFormatRef.current = use24HourFormat;
    prevTimezoneRef.current = useLocalTimezone;
    prevCryptoAssetRef.current = cryptoAsset;

    // Prepare chart data
    const prices = chartData.map((item) => ({
      x: new Date(item.timestamp),
      y: item.close,
    }));

    // Start with the main price dataset
    const datasets = [
      {
        label: `${getCryptoName(cryptoAsset)} Price`,
        data: prices,
        borderColor: 'rgb(59, 130, 246)', // Blue
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 3,
        fill: false,
        tension: 0.2,
        yAxisID: 'y',
      },
    ];

    // Add indicator datasets if any are active
    indicators.forEach((indicator) => {
      if (!indicator.isActive) return;

      switch (indicator.id.split('_')[0]) {
        case 'sma':
          const smaValues = calculateIndicators.sma(chartData, indicator.settings.period);
          datasets.push({
            label: `SMA (${indicator.settings.period})`,
            data: chartData.map((item, i) => ({
              x: new Date(item.timestamp),
              y: smaValues[i]
            })),
            borderColor: indicator.color,
            borderWidth: 1.5,
            pointRadius: 0,
            pointHoverRadius: 0,
            fill: false,
            tension: 0,
            yAxisID: 'y',
          });
          break;
          
        case 'ema':
          const emaValues = calculateIndicators.ema(chartData, indicator.settings.period);
          datasets.push({
            label: `EMA (${indicator.settings.period})`,
            data: chartData.map((item, i) => ({
              x: new Date(item.timestamp),
              y: emaValues[i]
            })),
            borderColor: indicator.color,
            borderWidth: 1.5,
            pointRadius: 0,
            pointHoverRadius: 0,
            fill: false,
            tension: 0,
            yAxisID: 'y',
          });
          break;
          
        case 'bb':
          const bbValues = calculateIndicators.bb(chartData, indicator.settings.period);
          
          // Middle band (SMA)
          datasets.push({
            label: `BB Middle (${indicator.settings.period})`,
            data: chartData.map((item, i) => ({
              x: new Date(item.timestamp),
              y: bbValues.middle[i]
            })),
            borderColor: indicator.color,
            borderWidth: 1.5,
            pointRadius: 0,
            pointHoverRadius: 0,
            fill: false,
            tension: 0,
            yAxisID: 'y',
          });
          
          // Upper band
          datasets.push({
            label: `BB Upper (${indicator.settings.period})`,
            data: chartData.map((item, i) => ({
              x: new Date(item.timestamp),
              y: bbValues.upper[i]
            })),
            borderColor: 'rgba(75, 192, 192, 0.6)',
            borderWidth: 1,
            pointRadius: 0,
            pointHoverRadius: 0,
            borderDash: [5, 5],
            fill: false,
            tension: 0,
            yAxisID: 'y',
          });
          
          // Lower band
          datasets.push({
            label: `BB Lower (${indicator.settings.period})`,
            data: chartData.map((item, i) => ({
              x: new Date(item.timestamp),
              y: bbValues.lower[i]
            })),
            borderColor: 'rgba(75, 192, 192, 0.6)',
            borderWidth: 1,
            pointRadius: 0,
            pointHoverRadius: 0,
            borderDash: [5, 5],
            fill: false,
            tension: 0,
            yAxisID: 'y',
          });
          break;
          
        case 'rsi':
          const rsiValues = calculateIndicators.rsi(chartData, indicator.settings.period);
          datasets.push({
            label: `RSI (${indicator.settings.period})`,
            data: chartData.map((item, i) => ({
              x: new Date(item.timestamp),
              y: rsiValues[i]
            })),
            borderColor: indicator.color,
            borderWidth: 1.5,
            pointRadius: 0,
            pointHoverRadius: 0,
            fill: false,
            tension: 0,
            yAxisID: 'rsi',
          });
          break;
          
        case 'macd':
          const macdValues = calculateIndicators.macd(chartData, {
            fastPeriod: indicator.settings.fastPeriod,
            slowPeriod: indicator.settings.slowPeriod,
            signalPeriod: indicator.settings.signalPeriod
          });
          
          // MACD Line
          datasets.push({
            label: `MACD (${indicator.settings.fastPeriod},${indicator.settings.slowPeriod},${indicator.settings.signalPeriod})`,
            data: chartData.map((item, i) => ({
              x: new Date(item.timestamp),
              y: macdValues.macdLine[i]
            })),
            borderColor: indicator.color,
            borderWidth: 1.5,
            pointRadius: 0,
            pointHoverRadius: 0,
            fill: false,
            tension: 0,
            yAxisID: 'macd',
          });
          
          // Signal Line
          datasets.push({
            label: `Signal (${indicator.settings.signalPeriod})`,
            data: chartData.map((item, i) => ({
              x: new Date(item.timestamp),
              y: macdValues.signalLine[i]
            })),
            borderColor: 'rgba(255, 159, 64, 1)',
            borderWidth: 1.5,
            pointRadius: 0,
            pointHoverRadius: 0,
            fill: false,
            tension: 0,
            yAxisID: 'macd',
          });
          
          // Histogram
          datasets.push({
            label: 'Histogram',
            data: chartData.map((item, i) => ({
              x: new Date(item.timestamp),
              y: macdValues.histogram[i]
            })),
            backgroundColor: chartData.map((item, i) => 
              macdValues.histogram[i] > 0 ? 'rgba(75, 192, 192, 0.5)' : 'rgba(255, 99, 132, 0.5)'
            ),
            borderColor: chartData.map((item, i) => 
              macdValues.histogram[i] > 0 ? 'rgba(75, 192, 192, 1)' : 'rgba(255, 99, 132, 1)'
            ),
            borderWidth: 1,
            type: 'bar',
            tension: 0,
            yAxisID: 'macd',
          });
          break;
          
        case 'volume':
          const volumeValues = calculateIndicators.volume(chartData);
          datasets.push({
            label: 'Volume',
            data: chartData.map((item, i) => ({
              x: new Date(item.timestamp),
              y: volumeValues[i]
            })),
            backgroundColor: 'rgba(54, 162, 235, 0.3)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1,
            type: 'bar',
            yAxisID: 'volume',
          });
          break;
      }
    });

    // Update the chartDatasets state
    setChartDatasets({ datasets });

    // Determine which axes to show based on active indicators
    const hasRSI = indicators.some(ind => ind.isActive && ind.id.split('_')[0] === 'rsi');
    const hasMACD = indicators.some(ind => ind.isActive && ind.id.split('_')[0] === 'macd');
    const hasVolume = indicators.some(ind => ind.isActive && ind.id.split('_')[0] === 'volume');
    
    // Get time format based on user preference
    const timeFormat = use24HourFormat ? 'HH:mm' : 'h:mm a';
    
    // Setup chart options
    const scales = {
      x: {
        type: 'time',
        time: {
          unit: getTimeUnit(timeframe),
          displayFormats: {
            hour: timeFormat,
            day: 'MMM dd',
            week: 'MMM dd',
            month: 'MMM yyyy',
          },
          tooltipFormat: use24HourFormat ? 'MMM dd, yyyy HH:mm' : 'MMM dd, yyyy h:mm a',
        },
        adapters: {
          date: {
            locale: enUS,
          },
        },
        grid: {
          display: false,
        },
        ticks: {
          maxRotation: 0,
          autoSkip: true,
          padding: 8
        },
        border: {
          display: true
        }
      },
      y: {
        position: 'right',
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          callback: (value) => `$${value.toLocaleString('en-US')}`,
          padding: 8
        },
        border: {
          display: true
        }
      }
    };
    
    // Add RSI scale if needed
    if (hasRSI) {
      scales.rsi = {
        position: 'right',
        min: 0,
        max: 100,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          callback: (value) => `${value}`,
          padding: 8
        },
        display: true,
        border: {
          display: true
        }
      };
    }
    
    // Add MACD scale if needed
    if (hasMACD) {
      scales.macd = {
        position: 'right',
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          callback: (value) => `${value.toFixed(2)}`,
          padding: 8
        },
        display: true,
        border: {
          display: true
        }
      };
    }
    
    // Add Volume scale if needed
    if (hasVolume) {
      scales.volume = {
        position: 'left',
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          callback: (value) => {
            if (value === 0) return '0';
            if (value >= 1000000) {
              return `${(value / 1000000).toFixed(1)}M`;
            }
            if (value >= 1000) {
              return `${(value / 1000).toFixed(1)}K`;
            }
            return value.toString();
          },
          padding: 8
        },
        display: true,
        border: {
          display: true
        }
      };
    }

    setChartOptions({
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        title: {
          display: true,
          text: `${getCryptoName(cryptoAsset)} Price Chart (${timeframe})`,
          color: 'rgb(75, 85, 99)',
          font: {
            size: 16,
            weight: 'bold'
          },
          padding: {
            top: 10,
            bottom: 10
          }
        },
        legend: {
          display: true,
          position: 'top',
          align: 'center',
          labels: {
            boxWidth: 12,
            usePointStyle: true,
          },
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          callbacks: {
            label: function(context) {
              let label = context.dataset.label || '';
              
              if (label) {
                label += ': ';
              }
              
              if (context.parsed.y !== null) {
                if (label.includes('RSI') || label.includes('MACD') || label.includes('Signal') || label === 'Histogram:') {
                  label += context.parsed.y.toFixed(2);
                } else if (label.includes('Volume:')) {
                  label += formatAxisValue(context.parsed.y);
                } else {
                  label += formatPrice(context.parsed.y);
                }
              }
              
              return label;
            }
          }
        },
      },
      scales,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      timezone: useLocalTimezone ? 'local' : 'UTC',
    });
  }, [chartData, timeframe, indicatorsStringified, use24HourFormat, useLocalTimezone, cryptoAsset]);

  // Toggle between 12-hour and 24-hour time formats
  const toggleTimeFormat = () => {
    setUse24HourFormat(!use24HourFormat);
  };
  
  // Toggle between local and UTC timezone
  const toggleTimezone = () => {
    setUseLocalTimezone(!useLocalTimezone);
  };

  return (
    <div>
      {isLoading || localLoading ? (
        <div className="h-[400px] flex items-center justify-center bg-gray-50 rounded-lg">
          <div className="text-center">
            <svg className="w-12 h-12 mx-auto animate-spin text-primary-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="mt-3 text-gray-600">Loading chart data for {getCryptoName(cryptoAsset)}...</p>
          </div>
        </div>
      ) : chartData && chartData.length > 0 ? (
        <>
          <div className="flex justify-between items-center mb-3">
            <div className="space-x-2">
              <button
                className="text-sm text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded"
                onClick={toggleTimeFormat}
                title="Toggle between 12-hour and 24-hour time format"
              >
                {use24HourFormat ? '24H' : '12H'}
              </button>
              <button
                className="text-sm text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded"
                onClick={toggleTimezone}
                title="Toggle between local and UTC timezone"
              >
                {useLocalTimezone ? 'Local' : 'UTC'}
              </button>
            </div>
            {onTimeframeChange && (
              <div className="flex items-center space-x-2">
                <button 
                  className={`text-xs px-2 py-1 rounded ${timeframe === 'ONE_DAY' ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  onClick={() => onTimeframeChange('ONE_DAY')}
                >
                  1D
                </button>
                <button 
                  className={`text-xs px-2 py-1 rounded ${timeframe === 'SIX_HOURS' ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  onClick={() => onTimeframeChange('SIX_HOURS')}
                >
                  6H
                </button>
                <button 
                  className={`text-xs px-2 py-1 rounded ${timeframe === 'ONE_HOUR' ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  onClick={() => onTimeframeChange('ONE_HOUR')}
                >
                  1H
                </button>
                <button 
                  className={`text-xs px-2 py-1 rounded ${timeframe === 'FIFTEEN_MINUTES' ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  onClick={() => onTimeframeChange('FIFTEEN_MINUTES')}
                >
                  15M
                </button>
                <button 
                  className={`text-xs px-2 py-1 rounded ${timeframe === 'FIVE_MINUTES' ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  onClick={() => onTimeframeChange('FIVE_MINUTES')}
                >
                  5M
                </button>
                <button 
                  className={`text-xs px-2 py-1 rounded ${timeframe === 'ONE_MINUTE' ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  onClick={() => onTimeframeChange('ONE_MINUTE')}
                >
                  1M
                </button>
              </div>
            )}
          </div>
          
          <div style={{ height: getChartHeight() + 'px' }}>
            <Line options={chartOptions} data={chartDatasets} />
          </div>
        </>
      ) : (
        <div className="h-[400px] flex items-center justify-center bg-gray-50 rounded-lg">
          <p className="text-gray-500">No data available for {getCryptoName(cryptoAsset)}</p>
        </div>
      )}
    </div>
  );
} 