import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { motion } from 'framer-motion';
import { Flame } from 'lucide-react';

interface StreakData {
  current: number;
  longest: number;
}

function calculateStreak(data: { date: string; percentage: number; total: number }[]): StreakData {
  let current = 0;
  let longest = 0;
  let temp = 0;

  const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));

  for (const d of sorted) {
    if (d.total > 0 && d.percentage >= 75) {
      temp++;
      current = temp;
      if (temp > longest) longest = temp;
    } else {
      temp = 0;
    }
  }

  return { current, longest };
}

interface StreakCardProps {
  data?: { date: string; percentage: number; present: number; total: number }[];
  isLoading?: boolean;
}

export function StreakCard({ data, isLoading }: StreakCardProps) {
  const streaks = data ? calculateStreak(data) : { current: 0, longest: 0 };

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Flame className="w-4 h-4 text-primary" />Attendance Streak</CardTitle></CardHeader>
        <CardContent><div className="h-20 skeleton" /></CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-warning" />
          Attendance Streak
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-8">
          <motion.div
            className="text-center"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            <p className="text-3xl font-bold text-[#111827]">{streaks.current}</p>
            <p className="text-xs text-[#6B7280] mt-0.5">Current Streak</p>
          </motion.div>
          <div className="w-px h-12 bg-gray-100" />
          <motion.div
            className="text-center"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.15 }}
          >
            <p className="text-3xl font-bold text-[#111827]">{streaks.longest}</p>
            <p className="text-xs text-[#6B7280] mt-0.5">Longest Streak</p>
          </motion.div>
        </div>
      </CardContent>
    </Card>
  );
}
