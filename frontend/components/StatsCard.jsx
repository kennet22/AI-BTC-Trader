import React from 'react';

export default function StatsCard({ title, value, change, icon: Icon, trend }) {
  // Determine trend color
  const trendColor = trend === 'up' 
    ? 'text-success-500' 
    : trend === 'down' 
      ? 'text-danger-500' 
      : 'text-gray-500';
  
  // Determine trend arrow
  const trendArrow = trend === 'up' 
    ? '↑' 
    : trend === 'down' 
      ? '↓' 
      : '→';
  
  return (
    <div className="overflow-hidden bg-white rounded-lg shadow">
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="flex items-center justify-center w-12 h-12 rounded-md bg-primary-100 text-primary-600">
              {Icon && <Icon className="w-6 h-6" />}
            </div>
          </div>
          <div className="flex-1 w-0 ml-5">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
              <dd>
                <div className="text-lg font-medium text-gray-900">{value}</div>
              </dd>
              {change && (
                <dd className={`flex items-center text-sm ${trendColor}`}>
                  <span>{trendArrow}</span>
                  <span className="ml-1">{change}</span>
                </dd>
              )}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
} 