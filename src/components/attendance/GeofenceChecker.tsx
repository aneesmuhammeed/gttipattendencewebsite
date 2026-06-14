import { useState, useEffect } from 'react';
import { MapPin, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { checkGeofence } from '@/hooks/useAttendance';
import type { GeofenceResult } from '@/types';
import { Button } from '@/components/ui/Button';

interface GeofenceCheckerProps {
  onResult: (result: GeofenceResult) => void;
  onError: (error: string) => void;
}

export function GeofenceChecker({ onResult, onError }: GeofenceCheckerProps) {
  const [checking, setChecking] = useState(true);
  const [result, setResult] = useState<GeofenceResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runCheck = async () => {
    setChecking(true);
    setError(null);
    setResult(null);
    try {
      const geofenceResult = await checkGeofence();
      setResult(geofenceResult);
      onResult(geofenceResult);
    } catch (err) {
      const msg = (err as Error).message;
      setError(msg);
      onError(msg);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => { runCheck(); }, []);

  if (checking) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-btn bg-blue-50 text-primary">
        <MapPin className="w-5 h-5 animate-pulse" />
        <span className="text-sm">Checking your location...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-2">
        <div className="flex items-start gap-2 p-3 rounded-btn bg-red-50 text-sm">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-danger" />
          <div>
            <p className="font-medium text-danger">Location Error</p>
            <p className="text-xs mt-0.5 text-red-600">{error}</p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={runCheck}>
          <RefreshCw className="w-4 h-4" /> Retry
        </Button>
      </div>
    );
  }

  if (!result) return null;

  return (
    <div
      className="flex items-center gap-2 p-3 rounded-btn text-sm"
      style={{
        background: result.withinGeofence ? '#F0FDF4' : '#FEF2F2',
        color: result.withinGeofence ? '#22C55E' : '#EF4444',
      }}
    >
      {result.withinGeofence ? <CheckCircle className="w-5 h-5 shrink-0" /> : <AlertTriangle className="w-5 h-5 shrink-0" />}
      <div>
        {result.withinGeofence
          ? `Within campus (${result.distance}m from center)`
          : `${result.distance}m away (max: ${result.maxDistance}m)`}
      </div>
    </div>
  );
}
