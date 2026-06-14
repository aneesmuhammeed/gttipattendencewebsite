import { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';

interface TrendChartProps {
  data?: { date: string; percentage: number; present: number; total: number }[];
  isLoading?: boolean;
  title?: string;
  days?: number;
}

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    const d = payload[0].payload;
    return (
      <div className="bg-white rounded-card shadow-dropdown border border-gray-100 p-3 text-sm">
        <p className="font-semibold text-[#111827]">{new Date(label).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
        <p className="text-success font-medium mt-1">{d.present} present</p>
        <p className="text-[#9CA3AF] text-xs">{d.total} total · {d.percentage}%</p>
      </div>
    );
  }
  return null;
}

export function TrendChart({ data, isLoading, title = 'Attendance Trend', days = 30 }: TrendChartProps) {
  const [hoveredData, setHoveredData] = useState<any>(null);

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" />{title}</CardTitle></CardHeader>
        <CardContent><div className="h-64 skeleton" /></CardContent>
      </Card>
    );
  }

  if (!data?.length) {
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" />{title}</CardTitle></CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-sm text-[#9CA3AF]">No trend data available</div>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map((d) => ({
    ...d,
    label: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }));

  const avgPct = Math.round(chartData.reduce((sum, d) => sum + d.percentage, 0) / chartData.length);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            {title}
          </CardTitle>
          <div className="flex items-center gap-3 text-xs text-[#6B7280]">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-success" /> Present</span>
            <span className="font-semibold text-[#111827]">Avg {avgPct}%</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={chartData} onMouseMove={(e: any) => setHoveredData(e.activePayload?.[0]?.payload || null)}>
              <defs>
                <linearGradient id="colorPct" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1657C5" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#1657C5" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: '#9CA3AF' }}
                tickLine={false}
                axisLine={false}
                interval={Math.max(Math.floor(chartData.length / 8), 1)}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 10, fill: '#9CA3AF' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="percentage" stroke="#1657C5" strokeWidth={2} fill="url(#colorPct)" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
      </CardContent>
    </Card>
  );
}
