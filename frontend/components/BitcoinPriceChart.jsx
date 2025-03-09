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

export default function BitcoinPriceChart({ data, timeframe = '1H', indicators = [] }) {
  const [chartData, setChartData] = useState({
    datasets: [],
  });
  const [chartOptions, setChartOptions] = useState({});
  const [use24HourFormat, setUse24HourFormat] = useState(true);
  const [useLocalTimezone, setUseLocalTimezone] = useState(true);
  
  // Use refs to store previous values to prevent unnecessary re-renders
  const prevDataRef = useRef();
  const prevTimeframeRef = useRef();
  const prevIndicatorsRef = useRef();
  const prevTimeFormatRef = useRef();
  const prevTimezoneRef = useRef();
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
    if (!data || data.length === 0) return;
    
    // Check if data or dependencies have changed
    const dataChanged = prevDataRef.current !== data;
    const timeframeChanged = prevTimeframeRef.current !== timeframe;
    const indicatorsChanged = prevIndicatorsRef.current !== indicatorsStringified;
    const timeFormatChanged = prevTimeFormatRef.current !== use24HourFormat;
    const timezoneChanged = prevTimezoneRef.current !== useLocalTimezone;
    
    if (!dataChanged && !timeframeChanged && !indicatorsChanged && !timeFormatChanged && !timezoneChanged) {
      return; // Skip update if nothing has changed
    }
    
    // Update refs
    prevDataRef.current = data;
    prevTimeframeRef.current = timeframe;
    prevIndicatorsRef.current = indicatorsStringified;
    prevTimeFormatRef.current = use24HourFormat;
    prevTimezoneRef.current = useLocalTimezone;

    // Prepare chart data
    const prices = data.map((item) => ({
      x: new Date(item.timestamp),
      y: item.close,
    }));

    // Setup datasets array with the main price dataset
    const datasets = [
      {
        label: 'Bitcoin Price',
        data: prices,
        borderColor: '#0d9488',
        backgroundColor: 'rgba(13, 148, 136, 0.1)',
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 3,
        fill: true,
        tension: 0.4,
        yAxisID: 'y',
      },
    ];
    
    // Add indicator datasets
    indicators.forEach(indicator => {
      if (!indicator.isActive) return;
      
      switch (indicator.id.split('_')[0]) {
        case 'sma':
          const smaValues = calculateIndicators.sma(data, indicator.settings.period);
          datasets.push({
            label: `SMA (${indicator.settings.period})`,
            data: data.map((item, i) => ({
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
          const emaValues = calculateIndicators.ema(data, indicator.settings.period);
          datasets.push({
            label: `EMA (${indicator.settings.period})`,
            data: data.map((item, i) => ({
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
          const bbValues = calculateIndicators.bb(data, indicator.settings.period);
          
          // Middle band (SMA)
          datasets.push({
            label: `BB Middle (${indicator.settings.period})`,
            data: data.map((item, i) => ({
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
            data: data.map((item, i) => ({
              x: new Date(item.timestamp),
              y: bbValues.upper[i]
            })),
            borderColor: indicator.color,
            borderDash: [5, 5],
            borderWidth: 1,
            pointRadius: 0,
            pointHoverRadius: 0,
            fill: false,
            tension: 0,
            yAxisID: 'y',
          });
          
          // Lower band
          datasets.push({
            label: `BB Lower (${indicator.settings.period})`,
            data: data.map((item, i) => ({
              x: new Date(item.timestamp),
              y: bbValues.lower[i]
            })),
            borderColor: indicator.color,
            borderDash: [5, 5],
            borderWidth: 1,
            pointRadius: 0,
            pointHoverRadius: 0,
            fill: false,
            tension: 0,
            yAxisID: 'y',
          });
          break;
          
        case 'rsi':
          const rsiValues = calculateIndicators.rsi(data, indicator.settings.period);
          datasets.push({
            label: `RSI (${indicator.settings.period})`,
            data: data.map((item, i) => ({
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
          const macdValues = calculateIndicators.macd(data, {
            fastPeriod: indicator.settings.fastPeriod,
            slowPeriod: indicator.settings.slowPeriod,
            signalPeriod: indicator.settings.signalPeriod
          });
          
          // MACD Line
          datasets.push({
            label: `MACD (${indicator.settings.fastPeriod},${indicator.settings.slowPeriod},${indicator.settings.signalPeriod})`,
            data: data.map((item, i) => ({
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
            data: data.map((item, i) => ({
              x: new Date(item.timestamp),
              y: macdValues.signalLine[i]
            })),
            borderColor: 'rgba(255, 99, 132, 1)',
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
            data: data.map((item, i) => ({
              x: new Date(item.timestamp),
              y: macdValues.histogram[i]
            })),
            type: 'bar',
            backgroundColor: (context) => {
              const value = context.dataset.data[context.dataIndex]?.y;
              return value >= 0 ? 'rgba(75, 192, 192, 0.5)' : 'rgba(255, 99, 132, 0.5)';
            },
            yAxisID: 'macd',
          });
          break;
          
        case 'volume':
          const volumeValues = calculateIndicators.volume(data);
          datasets.push({
            label: 'Volume',
            data: data.map((item, i) => ({
              x: new Date(item.timestamp),
              y: volumeValues[i]
            })),
            type: 'bar',
            backgroundColor: 'rgba(75, 192, 192, 0.3)',
            yAxisID: 'volume',
          });
          break;
      }
    });

    // Setup chart data
    setChartData({ datasets });

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
          // Fix for volume display
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
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            boxWidth: 12,
            padding: 15,
            usePointStyle: true
          }
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          padding: 10,
          callbacks: {
            label: (context) => {
              const label = context.dataset.label || '';
              const value = context.parsed.y;
              
              if (context.dataset.yAxisID === 'y') {
                return `${label}: $${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
              } else if (context.dataset.yAxisID === 'rsi') {
                return `${label}: ${value.toFixed(2)}`;
              } else if (context.dataset.yAxisID === 'macd') {
                return `${label}: ${value.toFixed(5)}`;
              } else if (context.dataset.yAxisID === 'volume') {
                return `${label}: ${value.toLocaleString('en-US')}`;
              }
              return `${label}: ${value}`;
            },
          },
        },
      },
      scales,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      timezone: useLocalTimezone ? 'local' : 'UTC',
    });
  }, [data, timeframe, indicatorsStringified, use24HourFormat, useLocalTimezone]);

  // Toggle between 12-hour and 24-hour time formats
  const toggleTimeFormat = () => {
    setUse24HourFormat(!use24HourFormat);
  };
  
  // Toggle between local and UTC timezone
  const toggleTimezone = () => {
    setUseLocalTimezone(!useLocalTimezone);
  };

  // Calculate the height based on active indicators
  const chartHeight = getChartHeight();

  return (
    <div>
      {data && data.length > 0 ? (
        <>
          <div className="flex justify-between items-center mb-3">
            <div className="flex flex-wrap gap-2">
              {indicators.filter(ind => ind.isActive).map(indicator => (
                <div 
                  key={indicator.id} 
                  className="inline-flex items-center px-2 py-1 text-xs bg-gray-100 rounded-full"
                  style={{ borderLeft: `4px solid ${indicator.color}` }}
                >
                  <span>{indicator.name.split(' ')[0]}</span>
                  {indicator.settings.period && (
                    <span className="ml-1 text-gray-500">({indicator.settings.period})</span>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button 
                onClick={toggleTimezone}
                className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none"
                title={useLocalTimezone ? "Using local timezone" : "Using UTC timezone"}
              >
                <GlobeAltIcon className="w-3 h-3 mr-1" />
                {useLocalTimezone ? 'Local' : 'UTC'}
              </button>
              <button 
                onClick={toggleTimeFormat}
                className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none"
              >
                <ClockIcon className="w-3 h-3 mr-1" />
                {use24HourFormat ? '24h' : '12h'} Format
              </button>
            </div>
          </div>
          <div style={{ height: `${chartHeight}px` }}>
            <Line 
              data={chartData} 
              options={{
                ...chartOptions,
                maintainAspectRatio: false,
                layout: {
                  padding: {
                    left: 10,
                    right: 10,
                    top: 20,
                    bottom: 10
                  }
                }
              }} 
            />
          </div>
        </>
      ) : (
        <div className="flex items-center justify-center h-80">
          <p className="text-gray-500">Loading chart data...</p>
        </div>
      )}
    </div>
  );
} 