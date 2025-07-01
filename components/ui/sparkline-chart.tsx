'use client';

import { useMemo } from 'react';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';
import numeral from 'numeral';
import dayjs from 'dayjs';

interface DataPoint {
  date: string;
  value: number;
  timestamp: number;
}

interface SparklineChartProps {
  data: DataPoint[];
  width?: number;
  height?: number;
  color?: string;
  strokeWidth?: number;
  showValue?: boolean;
  showChange?: boolean;
  className?: string;
  format?: string;
}

export function SparklineChart({
  data,
  width = 120,
  height = 40,
  color = "#ef4444",
  strokeWidth = 2,
  showValue = true,
  showChange = true,
  className = '',
  format = '0,0.00',
}: SparklineChartProps) {
  const chartData = useMemo(() => {
    return data
      .sort((a, b) => a.timestamp - b.timestamp)
      .map((point) => ({
        ...point,
        formattedDate: dayjs(point.timestamp).format('MMM D'),
      }));
  }, [data]);

  const stats = useMemo(() => {
    if (chartData.length < 2) return null;

    const latest = chartData[chartData.length - 1];
    const previous = chartData[chartData.length - 2];
    const earliest = chartData[0];
    
    const recentChange = latest.value - previous.value;
    const recentChangePercent = previous.value !== 0 ? (recentChange / previous.value) * 100 : 0;
    const totalChange = latest.value - earliest.value;
    const totalChangePercent = earliest.value !== 0 ? (totalChange / earliest.value) * 100 : 0;
    
    return {
      latest: latest.value,
      recentChange,
      recentChangePercent,
      totalChange,
      totalChangePercent,
      isRecentPositive: recentChange > 0,
      isTotalPositive: totalChange > 0,
      timespan: `${dayjs(earliest.timestamp).format('MMM D')} - ${dayjs(latest.timestamp).format('MMM D')}`,
    };
  }, [chartData]);

  const minValue = useMemo(() => Math.min(...chartData.map(d => d.value)), [chartData]);
  const maxValue = useMemo(() => Math.max(...chartData.map(d => d.value)), [chartData]);

  if (chartData.length === 0) {
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        <div 
          className="bg-gray-100 rounded flex items-center justify-center"
          style={{ width, height }}
        >
          <span className="text-xs text-gray-400">No data</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      {/* Sparkline */}
      <div className="relative">
        <ResponsiveContainer width={width} height={height}>
          <LineChart data={chartData}>
            <YAxis hide domain={[minValue * 0.95, maxValue * 1.05]} />
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={strokeWidth}
              dot={false}
              activeDot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Stats */}
      {stats && (showValue || showChange) && (
        <div className="flex flex-col gap-1">
          {showValue && (
            <div className="text-sm font-medium text-gray-900">
              {numeral(stats.latest).format(format)}
            </div>
          )}
          
          {showChange && (
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-medium ${
                  stats.isRecentPositive
                    ? 'text-green-600'
                    : stats.recentChange < 0
                    ? 'text-red-600'
                    : 'text-gray-600'
                }`}
              >
                {stats.isRecentPositive ? '+' : ''}
                {numeral(stats.recentChangePercent / 100).format('0.0%')}
              </span>
              <span className="text-xs text-gray-500">recent</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Helper function to generate sample data for development
export function generateSampleSparklineData(
  days: number = 30,
  startValue: number = 3000,
  volatility: number = 0.1
): DataPoint[] {
  const data: DataPoint[] = [];
  let currentValue = startValue;
  
  for (let i = 0; i < days; i++) {
    const timestamp = dayjs().subtract(days - i, 'day').valueOf();
    const randomChange = (Math.random() - 0.5) * 2 * volatility * currentValue;
    currentValue = Math.max(0, currentValue + randomChange);
    
    data.push({
      date: dayjs(timestamp).format('YYYY-MM-DD'),
      value: currentValue,
      timestamp,
    });
  }
  
  return data;
}