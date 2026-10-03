export function securityScoreLabel(
  score: number,
): 'Excellent' | 'Good' | 'Needs attention' | 'Critical' {
  return score >= 90
    ? 'Excellent'
    : score >= 75
      ? 'Good'
      : score >= 50
        ? 'Needs attention'
        : 'Critical';
}
