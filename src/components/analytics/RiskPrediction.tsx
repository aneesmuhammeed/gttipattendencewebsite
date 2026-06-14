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
  const newTotal = totalClasses + extraAbsent;
  const newPct = newTotal > 0 ? Math.round((present / newTotal) * 100) : 0;
  const diff = newPct - currentPct;
  const atRisk = newPct < 75;

  const predictions = [1, 2, 3, 5].map((n) => {
    const t = totalClasses + n;
    const p = t > 0 ? Math.round((present / t) * 100) : 0;
    return { absent: n, pct: p };
  });

  return (
    <Card>
      <CardContent>
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          Risk Prediction
        </h3>

        <div className="p-4 bg-gray-50 rounded-lg mb-4 text-center">
          <p className="text-sm text-gray-500">Current Attendance</p>
          <p className={`text-3xl font-bold ${currentPct >= 75 ? 'text-green-600' : 'text-red-600'}`}>
            {currentPct}%
          </p>
          <p className="text-xs text-gray-400">{present} present / {totalClasses} classes</p>
        </div>

        <div className="space-y-2 mb-4">
          <p className="text-sm font-medium text-gray-700">If absent for more classes:</p>
          {predictions.map((p) => (
            <div key={p.absent} className="flex items-center justify-between p-2 rounded bg-gray-50">
              <span className="text-sm text-gray-600">Absent {p.absent} more</span>
              <span className={`text-sm font-semibold ${p.pct >= 75 ? 'text-green-600' : 'text-red-600'}`}>
                {p.pct}%
                {p.pct < 75 && <span className="ml-1 text-xs text-red-500">(at risk)</span>}
              </span>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Custom prediction:</label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={1}
              max={20}
              value={extraAbsent}
              onChange={(e) => setExtraAbsent(Number(e.target.value))}
              className="flex-1 accent-primary-600"
            />
            <span className="text-sm font-semibold text-gray-900 w-8 text-right">{extraAbsent}</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg border">
            <span className="text-sm text-gray-600">
              If absent {extraAbsent} more time{extraAbsent > 1 ? 's' : ''}
            </span>
            <span className={`text-lg font-bold flex items-center gap-1 ${atRisk ? 'text-red-600' : 'text-green-600'}`}>
              {atRisk ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
              {newPct}%
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
