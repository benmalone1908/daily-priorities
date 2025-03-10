
export const getColorClasses = (deviation: number) => {
  const absDeviation = Math.abs(deviation);
  
  // The closer to 0%, the more green (normal)
  if (absDeviation < 10) return 'bg-green-50 border-green-200 text-success';
  if (absDeviation < 25) return 'bg-green-50 border-green-200 text-[#4ade80]';
  if (absDeviation < 50) return 'bg-orange-50 border-orange-200 text-warning';
  
  // As deviation gets more extreme (in either direction), show redder colors
  if (absDeviation < 100) return 'bg-red-50 border-red-200 text-[#fca5a5]';
  if (absDeviation < 500) return 'bg-red-50 border-red-200 text-[#f87171]';
  return 'bg-red-50 border-red-200 text-alert';
};
