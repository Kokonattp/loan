-- =====================================================
-- SUPABASE SETUP - ระบบบันทึกเงินกู้
-- รันใน SQL Editor ของ Supabase (โปรเจคเดียวกับลาพักร้อน)
-- =====================================================

-- 1. สร้างตาราง loan_records
CREATE TABLE loan_records (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  name TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  week_key TEXT NOT NULL
);

-- 2. เปิด RLS (Row Level Security)
ALTER TABLE loan_records ENABLE ROW LEVEL SECURITY;

-- 3. สร้าง Policy อนุญาตทุกคน (Public)
CREATE POLICY "Allow public read" ON loan_records FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON loan_records FOR INSERT WITH CHECK (true);

-- 4. สร้าง Index
CREATE INDEX idx_loan_records_week_key ON loan_records(week_key);
CREATE INDEX idx_loan_records_created_at ON loan_records(created_at DESC);
