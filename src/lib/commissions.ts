export function calculateVariableCommission(balance: number, grossRatePct: number, hasLevel2: boolean) {
  // After lockup 12-share split example
  const total = balance * (grossRatePct / 100)
  const share = total / 12
  return {
    member: share * 6,
    ref1: share,
    ref2: hasLevel2 ? share : 0,
    slush: share,
    jared: share,
    ross: share,
    bne: hasLevel2 ? share : share * 2,
    total,
  }
}

export function getFixedRate(initialBalance: number) {
  if (initialBalance >= 1_000_001) return 0.0125
  if (initialBalance >= 100_001) return 0.01125
  return 0.01
}

export function calculateFixedCommission(balance: number, initialBalance: number, grossRatePct: number, hasLevel2: boolean) {
  const memberRate = getFixedRate(initialBalance)
  const memberAmount = balance * memberRate
  const total = balance * (grossRatePct / 100)
  const remainder = total - memberAmount
  if (remainder <= 0) {
    return { member: memberAmount, ref1: 0, ref2: 0, slush: 0, jared: 0, ross: 0, bne: 0, total }
  }
  const share = remainder / 6
  return {
    member: memberAmount,
    ref1: share,
    ref2: hasLevel2 ? share : 0,
    slush: share,
    jared: share,
    ross: share,
    bne: hasLevel2 ? share : share * 2,
    total,
  }
}

