import React, { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
} from 'chart.js';
import 'chartjs-adapter-date-fns';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

export default function BitcoinPriceChart({ data, timeframe = '1H' }) {
  const [chartData, setChartData] = useState({
    datasets: [],
  });
  const [chartOptions, setChartOptions] = useState({});

  useEffect(() => {
    if (!data || data.length === 0) return;

    // Prepare chart data
    const prices = data.map((item) => ({
      x: new Date(item.timestamp),
      y: item.close,
    }));

    // Setup chart data
    setChartData({
      datasets: [
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
        },
      ],
    });

    // Setup chart options
    setChartOptions({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          callbacks: {
            label: (context) => `${context.dataset.label}: $${context.parsed.y.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          },
        },
      },
      scales: {
        x: {
          type: 'time',
          time: {
            unit: getTimeUnit(timeframe),
            displayFormats: {
              hour: 'HH:mm',
              day: 'MMM dd',
              week: 'MMM dd',
              month: 'MMM yyyy',
            },
          },
          grid: {
            display: false,
          },
        },
        y: {
          position: 'right',
          grid: {
            color: 'rgba(0, 0, 0, 0.05)',
          },
          ticks: {
            callback: (value) => `$${value.toLocaleString('en-US')}`,
          },
        },
      },
      interaction: {
        mode: 'index',
        intersect: false,
      },
    });
  }, [data, timeframe]);

  // Helper function to determine time unit based on timeframe
  const getTimeUnit = (timeframe) => {
    switch (timeframe) {
      case '1m':
      case '5m':
      case '15m':
      case '30m':
      case '1H':
        return 'hour';
      case '4H':
      case '1D':
        return 'day';
      case '1W':
        return 'week';
      case '1M':
        return 'month';
      default:
        return 'hour';
    }
  };

  return (
    <div className="h-80">
      {data && data.length > 0 ? (
        <Line data={chartData} options={chartOptions} />
      ) : (
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-500">Loading chart data...</p>
        </div>
      )}
    </div>
  );
} 