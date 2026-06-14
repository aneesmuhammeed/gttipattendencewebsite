import { motion } from 'framer-motion';

interface HealthGaugeProps {
  percentage: number;
  size?: number;
}

export function HealthGauge({ percentage, size = 200 }: HealthGaugeProps) {
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(Math.max(percentage, 0), 100) / 100) * circumference;

  const getLevel = (pct: number) => {
    if (pct >= 90) return { label: 'Excellent', color: '#22C55E', sub: 'Outstanding attendance' };
    if (pct >= 75) return { label: 'Good', color: '#1657C5', sub: 'Satisfactory attendance' };
    if (pct >= 60) return { label: 'Warning', color: '#F59E0B', sub: 'Needs improvement' };
    return { label: 'Critical', color: '#EF4444', sub: 'At risk of falling behind' };
  };

  const level = getLevel(percentage);

  return (
    <div className="flex flex-col items-center" style={{ width: size }}>
      <svg width={size} height={size * 0.6} viewBox={`0 0 ${size} ${size * 0.6}`}>
        <path
          d={`M ${size * 0.1} ${size * 0.55} A ${radius} ${radius} 0 0 1 ${size * 0.9} ${size * 0.55}`}
          fill="none"
          stroke="#F3F4F6"
          strokeWidth={16}
          strokeLinecap="round"
        />
        <motion.path
          d={`M ${size * 0.1} ${size * 0.55} A ${radius} ${radius} 0 0 1 ${size * 0.9} ${size * 0.55}`}
          fill="none"
          stroke={level.color}
          strokeWidth={16}
          strokeLinecap="round"
          strokeDasharray={circumference * 0.8}
          initial={{ strokeDashoffset: circumference * 0.8 }}
          animate={{ strokeDashoffset: offset * 0.8 }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
        />
      </svg>
      <div className="text-center -mt-8">
        <motion.p
          className="text-3xl font-bold"
          style={{ color: level.color }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          {percentage}%
        </motion.p>
        <motion.p
          className="text-sm font-semibold mt-0.5"
          style={{ color: level.color }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          {level.label}
        </motion.p>
        <p className="text-xs text-[#9CA3AF] mt-1">{level.sub}</p>
      </div>
    </div>
  );
}
