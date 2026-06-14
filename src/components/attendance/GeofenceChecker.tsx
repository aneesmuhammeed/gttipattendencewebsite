import { useState, useEffect } from 'react';
import { MapPin, AlertTriangle, CheckCircle } from 'lucide-react';
import { checkGeofence } from '@/hooks/useAttendance';
import type { GeofenceResult } from '@/types';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

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
      <div className="flex items-center gap-2 text-gray-500 p-3 bg-gray-50 rounded-lg">
        <MapPin className="w-5 h-5 animate-pulse" />
        <span>Checking your location...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-red-600 p-3 bg-red-50 rounded-lg">
          <AlertTriangle className="w-5 h-5" />
          <span className="text-sm">{error}</span>
        </div>
        <Button size="sm" variant="outline" onClick={runCheck}>Retry Location Check</Button>
      </div>
    );
  }

  return (
    <div className={cn(
      'flex items-center gap-2 p-3 rounded-lg',
      result?.withinGeofence ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
    )}>
      {result?.withinGeofence ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
      <div className="text-sm">
        {result?.withinGeofence
          ? `You are within campus (${result.distance}m from center)`
          : `You are ${result?.distance}m away from campus (max: ${result?.maxDistance}m)`}
      </div>
    </div>
  );
}
