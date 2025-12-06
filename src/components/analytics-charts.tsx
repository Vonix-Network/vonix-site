'use client';

import { useState } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Users, DollarSign } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface ChartDataPoint {
  date: string;
  label: string;
  value: number;
}

interface RevenueChartProps {
  // Full dataset (typically last 90 days). Component slices it to 30/60/90.
  data: ChartDataPoint[];
  total: number;
}

interface UserGrowthChartProps {
  // Full dataset (typically last 90 days). Component slices it to 30/60/90.
  data: ChartDataPoint[];
  totalUsers: number;
  newThisWeek: number;
}

const CustomTooltip = ({ active, payload, label, isCurrency }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-sm text-neon-cyan">
          {isCurrency ? formatCurrency(payload[0].value) : payload[0].value}
        </p>
      </div>
    );
  }
  return null;
};

export function RevenueChart({ data, total }: RevenueChartProps) {
  const [range, setRange] = useState<30 | 60 | 90>(30);
  const ranges: Array<30 | 60 | 90> = [30, 60, 90];

  const startIndex = Math.max(0, data.length - range);
  const displayData = data.slice(startIndex);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-success" />
            Revenue Overview
          </span>
          <span className="flex flex-col items-end gap-1 text-xs sm:text-sm text-muted-foreground">
            <span>
              Total: {formatCurrency(total)}
            </span>
            <div className="inline-flex rounded-full border border-border bg-background/40 p-0.5">
              {ranges.map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setRange(days)}
                  className={`px-2 py-0.5 rounded-full text-[10px] sm:text-xs transition ${
                    range === days
                      ? 'bg-primary text-primary-foreground shadow'
                      : 'text-muted-foreground hover:bg-muted/40'
                  }`}
                >
                  {days}d
                </button>
              ))}
            </div>
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          {displayData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={displayData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis 
                  dataKey="label" 
                  stroke="rgba(255,255,255,0.5)" 
                  fontSize={12}
                  tickLine={false}
                />
                <YAxis 
                  stroke="rgba(255,255,255,0.5)" 
                  fontSize={12}
                  tickLine={false}
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip content={<CustomTooltip isCurrency />} />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#22c55e" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#revenueGradient)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <DollarSign className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No revenue data available</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function UserGrowthChart({ data, totalUsers, newThisWeek }: UserGrowthChartProps) {
  const [range, setRange] = useState<30 | 60 | 90>(30);
  const ranges: Array<30 | 60 | 90> = [30, 60, 90];

  const startIndex = Math.max(0, data.length - range);
  const displayData = data.slice(startIndex);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <Users className="w-5 h-5 text-neon-cyan" />
            User Growth
          </span>
          <span className="flex flex-col items-end gap-1 text-xs sm:text-sm text-muted-foreground">
            <span>
              +{newThisWeek} this week
            </span>
            <div className="inline-flex rounded-full border border-border bg-background/40 p-0.5">
              {ranges.map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setRange(days)}
                  className={`px-2 py-0.5 rounded-full text-[10px] sm:text-xs transition ${
                    range === days
                      ? 'bg-primary text-primary-foreground shadow'
                      : 'text-muted-foreground hover:bg-muted/40'
                  }`}
                >
                  {days}d
                </button>
              ))}
            </div>
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          {displayData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={displayData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="userGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00D9FF" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#00D9FF" stopOpacity={0.3}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis 
                  dataKey="label" 
                  stroke="rgba(255,255,255,0.5)" 
                  fontSize={12}
                  tickLine={false}
                />
                <YAxis 
                  stroke="rgba(255,255,255,0.5)" 
                  fontSize={12}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="value" 
                  fill="url(#userGradient)" 
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No user growth data available</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}


