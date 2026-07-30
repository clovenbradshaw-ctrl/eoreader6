export function createLedger(options) {
  return { entries: [], options };
}

export function recordStep(ledger, step) {
  ledger.entries.push(step);
  return ledger;
}

export function competencyGain(ledger) {
  return 0;
}
