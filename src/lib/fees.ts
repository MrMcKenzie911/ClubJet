export function calculateSignupFee(initialDeposit: number): { fee: number, ref1: number, ref2: number, slush: number } {
  if (initialDeposit >= 5000) return { fee: 0, ref1: 0, ref2: 0, slush: 0 }
  if (initialDeposit < 500) throw new Error('Minimum deposit is $500')

  // Fee schedule by initial deposit tier
  let fee = 0
  if (initialDeposit >= 3500) fee = 100
  else if (initialDeposit >= 2000) fee = 125
  else fee = 150

  // CEO directive: 50% of the signup fee goes to the Slush Fund
  const slush = +(fee * 0.5).toFixed(2)
  const remainder = fee - slush
  const ref1 = +(remainder / 2).toFixed(2)
  const ref2 = +(remainder / 2).toFixed(2)
  return { fee, ref1, ref2, slush }
}

