import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useHolidays, useAddHoliday, useDeleteHoliday } from '@/hooks/useHolidays';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { PageSpinner } from '@/components/ui/Spinner';
import { MapPin, Save, Shield, CalendarX, Plus, Trash2 } from 'lucide-react';
import type { CollegeSettings } from '@/types';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

export default function Settings() {
  const [settings, setSettings] = useState<CollegeSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newReason, setNewReason] = useState('');

  const { data: holidays, isLoading: holidaysLoading } = useHolidays();
  const addHoliday = useAddHoliday();
  const deleteHoliday = useDeleteHoliday();

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from('college_settings')
          .select('*')
          .limit(1)
          .maybeSingle();
        if (data) setSettings(data as CollegeSettings);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    const { error } = await supabase
      .from('college_settings')
      .update({
        college_name: settings.college_name,
        latitude: settings.latitude,
        longitude: settings.longitude,
        geofence_radius_meters: settings.geofence_radius_meters,
      })
      .eq('id', settings.id);

    if (error) {
      toast.error('Failed to save settings');
    } else {
      toast.success('Settings saved');
    }
    setSaving(false);
  };

  const handleAddHoliday = async () => {
    if (!newDate) return;
    try {
      await addHoliday.mutateAsync({ date: newDate, reason: newReason });
      toast.success('Holiday added');
      setNewDate('');
      setNewReason('');
    } catch (e: any) {
      if (e?.code === '23505') {
        toast.error('This date is already a holiday');
      } else {
        toast.error('Failed to add holiday');
      }
    }
  };

  const handleDeleteHoliday = async (id: string) => {
    try {
      await deleteHoliday.mutateAsync(id);
      toast.success('Holiday removed');
    } catch {
      toast.error('Failed to remove holiday');
    }
  };

  if (loading) return <PageSpinner />;

  return (
    <div className="page-container max-w-2xl">
      <div className="mb-6">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Manage college configuration</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <div>
              <CardTitle>Geofence Settings</CardTitle>
              <CardDescription>Configure the campus location and attendance radius</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="College Name"
            value={settings?.college_name ?? ''}
            onChange={(e) => setSettings((prev) => prev ? { ...prev, college_name: e.target.value } : null)}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Latitude"
              type="number"
              step="any"
              value={settings?.latitude ?? ''}
              onChange={(e) => setSettings((prev) => prev ? { ...prev, latitude: parseFloat(e.target.value) } : null)}
            />
            <Input
              label="Longitude"
              type="number"
              step="any"
              value={settings?.longitude ?? ''}
              onChange={(e) => setSettings((prev) => prev ? { ...prev, longitude: parseFloat(e.target.value) } : null)}
            />
          </div>
          <Input
            label="Geofence Radius (meters)"
            type="number"
            value={settings?.geofence_radius_meters ?? ''}
            onChange={(e) => setSettings((prev) => prev ? { ...prev, geofence_radius_meters: parseInt(e.target.value) } : null)}
          />
          <div className="flex items-center gap-2 p-3 rounded-btn bg-primary-50 text-sm text-primary">
            <MapPin className="w-4 h-4" />
            Students must be within {settings?.geofence_radius_meters ?? 0}m of the campus center to mark attendance
          </div>
          <Button onClick={handleSave} isLoading={saving}>
            <Save className="w-4 h-4" /> Save Settings
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CalendarX className="w-5 h-5 text-amber-600" />
            <div>
              <CardTitle>Holidays</CardTitle>
              <CardDescription>Mark dates as holidays (Saturdays, Sundays, etc.) — they won't count toward attendance</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Input
                label="Date"
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <Input
                label="Reason (optional)"
                placeholder="e.g. Saturday, Public Holiday"
                value={newReason}
                onChange={(e) => setNewReason(e.target.value)}
              />
            </div>
            <Button onClick={handleAddHoliday} isLoading={addHoliday.isPending} disabled={!newDate}>
              <Plus className="w-4 h-4" /> Add
            </Button>
          </div>

          {holidaysLoading ? (
            <div className="text-sm text-[#9CA3AF]">Loading...</div>
          ) : holidays && holidays.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {holidays.map((h) => (
                <motion.div
                  key={h.id}
                  className="flex items-center justify-between px-3 py-2 rounded-btn bg-gray-50"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="flex items-center gap-3">
                    <CalendarX className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-medium text-[#111827]">
                      {new Date(h.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    {h.reason && (
                      <span className="text-xs text-[#9CA3AF]">— {h.reason}</span>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteHoliday(h.id)}
                    className="p-1.5 rounded-btn text-[#9CA3AF] hover:text-danger hover:bg-red-50 transition-colors"
                    title="Remove holiday"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </motion.div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#9CA3AF] text-center py-4">No holidays set. Add dates above to exclude them from attendance calculations.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
