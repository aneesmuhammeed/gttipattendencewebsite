export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}

export function formatTime(time: string): string {
  const [hours, minutes] = time.split(':');
  const h = parseInt(hours);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${minutes} ${ampm}`;
}

export function formatDate(date: string): string {
  const d = new Date(date + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
}

export function formatDateTime(date: string): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// Haversine formula
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
  return R * c;
}

export function generateReportDateRange(range: 'daily' | 'weekly' | 'monthly' | 'yearly'): {
  start_date: string;
  end_date: string;
} {
  const now = new Date();
  const endDate = now.toISOString().split('T')[0];
  let startDate: string;

  switch (range) {
    case 'daily':
      startDate = endDate;
      break;
    case 'weekly': {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(now.setDate(diff));
      startDate = monday.toISOString().split('T')[0];
      break;
    }
    case 'monthly':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      break;
    case 'yearly':
      startDate = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
      break;
  }

  return { start_date: startDate, end_date: endDate };
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}


