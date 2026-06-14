import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { PageSpinner } from '@/components/ui/Spinner';
import { MapPin, Save } from 'lucide-react';
import type { CollegeSettings } from '@/types';
import toast from 'react-hot-toast';

export default function Settings() {
  const [settings, setSettings] = useState<CollegeSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from('college_settings')
          .select('*')
          .limit(1)
          .single();
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

  if (loading) return <PageSpinner />;

  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary-600" />
            Geofence Settings
          </CardTitle>
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
          <Button onClick={handleSave} isLoading={saving}>
            <Save className="w-4 h-4 mr-2" /> Save Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
