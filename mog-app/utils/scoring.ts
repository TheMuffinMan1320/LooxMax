export function bmiToScore(bmi: number): number {
  if (bmi <= 0) return 0;
  if (bmi < 16) return 2.0;
  if (bmi < 18.5) return 2.0 + ((bmi - 16) / 2.5) * 5.0;
  if (bmi < 22) return 7.0 + ((bmi - 18.5) / 3.5) * 2.5;
  if (bmi < 25) return 9.5 - ((bmi - 22) / 3) * 1.5;
  if (bmi < 30) return 8.0 - ((bmi - 25) / 5) * 3.0;
  return Math.max(2.0, 5.0 - (bmi - 30) * 0.3);
}
