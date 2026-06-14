import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { AlertTriangle, TrendingDown, TrendingUp } from 'lucide-react';

interface Props {
  totalClasses: number;
  present: number;
}

export function RiskPrediction({ totalClasses, present }: Props) {
  const [extraAbsent, setExtraAbsent] = useState(1);
  const currentPct = totalClasses > 0 ? Math.round((present / totalClasses) * 100) : 0;

  const predictions = [1, 2, 3, 5].map((n) => {
    const t = totalClasses + n;
    const p = t > 0 ? Math.round((present / t) * 100) : 0;
    return { absent: n, pct: p };
  });

  const newTotal = totalClasses + extraAbsent;
  const newPct = newTotal > 0 ? Math.round((present / newTotal) * 100) : 0;
  const atRisk = newPct < 75;

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <h3 className="text-sm font-semibold text-[#111827] flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-warning" />
          Risk Prediction
        </h3>

        <div className="rounded-btn p-4 text-center bg-gray-50">
          <p className="text-xs font-medium text-[#6B7280] mb-1">Current Attendance</p>
          <p className="text-3xl font-bold" style={{ color: currentPct >= 75 ? '#22C55E' : '#EF4444' }}>
            {currentPct}%
          </p>
          <p className="text-[11px] text-[#9CA3AF]">{present} present / {totalClasses} classes</p>
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-medium text-[#6B7280]">If absent more:</p>
          {predictions.map((p) => (
            <div key={p.absent} className="flex items-center justify-between rounded-btn px-3 py-2 bg-gray-50">
              <span className="text-xs text-[#6B7280]">{p.absent} more</span>
              <span
                className="text-sm font-semibold flex items-center gap-1"
                style={{ color: p.pct >= 75 ? '#22C55E' : '#EF4444' }}
              >
                {p.pct < 75 && <AlertTriangle className="w-3 h-3" />}
                {p.pct}%
              </span>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-[#6B7280]">Custom:</label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={1}
              max={20}
              value={extraAbsent}
              onChange={(e) => setExtraAbsent(Number(e.target.value))}
              className="flex-1 accent-primary"
            />
            <span className="text-sm font-semibold text-[#111827] w-6 text-right">{extraAbsent}</span>
          </div>
          <div className="flex items-center justify-between rounded-btn px-4 py-2.5 bg-gray-50">
            <span className="text-xs text-[#6B7280]">
              {extraAbsent} more absence{extraAbsent > 1 ? 's' : ''}
            </span>
            <span
              className="text-base font-semibold flex items-center gap-1"
              style={{ color: atRisk ? '#EF4444' : '#22C55E' }}
            >
              {atRisk ? <TrendingDown className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
              {newPct}%
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
