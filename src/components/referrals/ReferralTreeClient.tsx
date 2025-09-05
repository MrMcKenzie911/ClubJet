"use client"
import { ReferralTree } from './ReferralTree'

export default function ReferralTreeClient({ userId, isAdmin=false }: { userId: string, isAdmin?: boolean }) {
  if (!userId) return null
  return <ReferralTree userId={userId} isAdmin={isAdmin} />
}

