export function calculateSignupFee(initialDeposit: number): { fee: number, ref1: number, ref2: number, slush: number } {
  if (initialDeposit >= 5000) return { fee: 0, ref1: 0, ref2: 0, slush: 0 }
  if (initialDeposit >= 3500) return { fee: 100, ref1: 25, ref2: 25, slush: 50 }
  if (initialDeposit >= 2000) return { fee: 125, ref1: 25, ref2: 25, slush: 75 }
  if (initialDeposit >= 500) return { fee: 150, ref1: 25, ref2: 25, slush: 100 }
  throw new Error('Minimum deposit is $500')
}

