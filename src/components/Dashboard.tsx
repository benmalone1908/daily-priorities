
const customTickFormatter = (value: string) => {
  const allDates = [
    '3/24/2025', '3/25/2025', '3/26/2025', '3/27/2025', '3/28/2025', '3/29/2025', '3/30/2025', 
    '3/31/2025', '4/1/2025', '4/2/2025', '4/3/2025', '4/4/2025', '4/5/2025', '4/6/2025', 
    '4/7/2025', '4/8/2025', '4/9/2025', '4/10/2025', '4/11/2025', '4/12/2025', '4/13/2025', 
    '4/14/2025', '4/15/2025', '4/16/2025', '4/17/2025', '4/18/2025', '4/19/2025', '4/20/2025'
  ];
  
  const intervalDates = [
    '3/24/2025', '3/30/2025', '4/7/2025', '4/14/2025', '4/20/2025'
  ];
  
  // If it's an exact match to one of our interval dates, always show
  if (intervalDates.includes(value)) {
    return formatDate(value);
  }
  
  // For the full range, show every 3rd date
  const index = allDates.indexOf(value);
  return index % 3 === 0 ? formatDate(value) : '';
};
