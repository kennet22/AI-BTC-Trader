import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
} from 'chart.js';

// Register required Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler
);

const MiniPriceChart = ({ data, trend = 'neutral' }) => {
  // Determine color based on trend
  const getColor = () => {
    switch (trend) {
      case 'up':
        return {
          line: 'rgba(52, 211, 153, 1)',
          fill: 'rgba(52, 211, 153, 0.1)'
        };
      case 'down':
        return {
          line: 'rgba(239, 68, 68, 1)',
          fill: 'rgba(239, 68, 68, 0.1)'
        };
      default:
        return {
          line: 'rgba(96, 165, 250, 1)',
          fill: 'rgba(96, 165, 250, 0.1)'
        };
    }
  };

  const colors = getColor();

  // Prepare chart data
  const chartData = {
    labels: data.map((_, index) => index),
    datasets: [
      {
        data: data.map(item => item.close),
        borderColor: colors.line,
        backgroundColor: colors.fill,
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.4,
        fill: true,
      },
    ],
  };

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: false,
      },
    },
    scales: {
      x: {
        display: false,
      },
      y: {
        display: false,
        min: Math.min(...data.map(item => item.close)) * 0.999,
        max: Math.max(...data.map(item => item.close)) * 1.001,
      },
    },
    elements: {
      line: {
        tension: 0.4,
      },
    },
    interaction: {
      mode: 'nearest',
      intersect: false,
    },
  };

  return (
    <div className="h-full w-full" style={{ minHeight: '80px' }}>
      <Line data={chartData} options={chartOptions} />
    </div>
  );
};

export default MiniPriceChart; 