export function commitPrediction(task) {
  return { task, committed: true };
}

export function revealAndScore(task, outcome) {
  return { task, outcome, score: 0 };
}
