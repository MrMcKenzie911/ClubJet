-- 001_referrals_schema.sql
-- Step 1: Referral Tracking core schema

-- profiles additions
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referrer_id UUID REFERENCES profiles(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_code VARCHAR(12) UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_level INTEGER DEFAULT 2;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_founding_member BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES profiles(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE profiles ADD CONSTRAINT IF NOT EXISTS approval_status_check CHECK (approval_status IN ('pending','approved','rejected'));

-- referral relationships table (tracks up to 5 levels)
CREATE TABLE IF NOT EXISTS referral_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  level_1_referrer_id UUID REFERENCES profiles(id),
  level_2_referrer_id UUID REFERENCES profiles(id),
  level_3_referrer_id UUID REFERENCES profiles(id),
  level_4_referrer_id UUID REFERENCES profiles(id),
  level_5_referrer_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referral_relationships_user ON referral_relationships(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON profiles(referral_code);

