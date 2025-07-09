export const calculateBMI = (weight: number, height: number): number => {
  return (weight * 10000) / (height * height);
};

export const calculateBMR = (weight: number, height: number, age: number, gender: 'male' | 'female'): number => {
  if (gender === 'male') {
    return 13.397 * weight + 4.799 * height - 5.677 * age + 88.362;
  } else {
    return 9.247 * weight + 3.098 * height - 4.33 * age + 447.593;
  }
};

export const calculateFutureWeight = (currentWeight: number, excessCalories: number, days: number): number => {
  const weightChange = (excessCalories * days) / 7200;
  return currentWeight + weightChange;
};

export const calculateAllFutureBMI = (height: number, weight: number, excessCalories: number) => {
  const periods = [30, 365, 1095, 1825, 3650];
  return periods.map(days => {
    const futureWeight = calculateFutureWeight(weight, excessCalories, days);
    return {
      period: days,
      weight: futureWeight,
      bmi: calculateBMI(futureWeight, height)
    };
  });
};

export const getPeriodLabel = (days: number): string => {
  switch (days) {
    case 30:
      return '1ヶ月後';
    case 365:
      return '1年後';
    case 1095:
      return '3年後';
    case 1825:
      return '5年後';
    case 3650:
      return '10年後';
    default:
      return `${days}日後`;
  }
};

export const getExcessCaloriesValue = (option: '少ない' | '普通' | '多い'): number => {
  switch (option) {
    case '少ない':
      return -100;
    case '普通':
      return 0;
    case '多い':
      return 100;
    default:
      return 0;
  }
};