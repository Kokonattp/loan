'use client';

import { useState, useMemo, useEffect } from 'react';

// =====================================================
// CONFIG - ใช้ Supabase โปรเจคเดียวกับระบบลาพักร้อน
// =====================================================
const SUPABASE_URL = 'https://kylizhmvqpzdhylzvwog.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5bGl6aG12cXB6ZGh5bHp2d29nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2NzY4NzUsImV4cCI6MjA4MzI1Mjg3NX0.01L8sSvU55QVugeukEqAUBRQUMtstUuQXtZqYWjRFdA';
const WEEKLY_LIMIT = 60000;

// สีสำหรับแต่ละคน
const nameGradients = [
  'linear-gradient(135deg, #ff6b6b, #ee5a5a)',
  'linear-gradient(135deg, #4facfe, #00f2fe)',
  'linear-gradient(135deg, #43e97b, #38f9d7)',
  'linear-gradient(135deg, #a855f7, #6366f1)',
  'linear-gradient(135deg, #f97316, #facc15)',
  'linear-gradient(135deg, #06b6d4, #3b82f6)',
  'linear-gradient(135deg, #8b5cf6, #d946ef)',
  'linear-gradient(135deg, #f43f5e, #fb7185)',
  'linear-gradient(135deg, #14b8a6, #22d3ee)',
  'linear-gradient(135deg, #ec4899, #f472b6)',
];

const getNameGradient = (name) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return nameGradients[Math.abs(hash) % nameGradients.length];
};

const thaiMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
const thaiMonthsShort = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const days = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

const toLocalDateStr = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const getWeekKey = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const dayNum = d.getDay() || 7;
  d.setDate(d.getDate() + 4 - dayNum);
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNum = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  const thaiYear = d.getFullYear() + 543;
  return `${thaiYear}-W${String(weekNum).padStart(2, '0')}`;
};

const supabaseFetch = async (table, method = 'GET', body = null, query = '') => {
  const options = {
    method,
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': method === 'POST' ? 'return=representation' : ''
    }
  };
  if (body) options.body = JSON.stringify(body);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query}`, options);
  return res.json();
};

export default function LoanRecordPage() {
  const [records, setRecords] = useState([]);
  const [month, setMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [tooltip, setTooltip] = useState(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 900);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await supabaseFetch('loan_records', 'GET', null, '?select=*&order=created_at.desc');
      if (Array.isArray(data)) {
        setRecords(data);
      }
    } catch (err) {
      console.error('Load error:', err);
    }
    setLoading(false);
  };

  const notify = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  // สร้าง Map ของวันที่ -> รายการเงินกู้
  const recordMap = useMemo(() => {
    const map = new Map();
    records.forEach(r => {
      const dateStr = r.created_at ? r.created_at.split('T')[0] : '';
      if (!map.has(dateStr)) map.set(dateStr, []);
      map.get(dateStr).push(r);
    });
    return map;
  }, [records]);

  // คำนวณยอดรวมสัปดาห์ปัจจุบัน
  const currentWeekKey = getWeekKey(new Date());
  const weekTotal = useMemo(() => {
    return records
      .filter(r => r.week_key === currentWeekKey)
      .reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);
  }, [records, currentWeekKey]);
  const weekRemaining = WEEKLY_LIMIT - weekTotal;

  // สร้างปฏิทิน
  const calendarDays = useMemo(() => {
    const y = month.getFullYear();
    const m = month.getMonth();
    const firstDay = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(new Date(y, m, d));
    }
    return days;
  }, [month]);

  const handleDateClick = (date) => {
    if (!date) return;
    setSelectedDate(date);
    setName('');
    setAmount('');
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      notify('กรุณาระบุชื่อ', false);
      return;
    }
    const amountNum = parseFloat(amount) || 0;
    if (amountNum <= 0) {
      notify('กรุณาระบุยอดเงิน', false);
      return;
    }
    
    // เช็ควงเงินสัปดาห์
    const targetWeekKey = getWeekKey(selectedDate);
    const targetWeekTotal = records
      .filter(r => r.week_key === targetWeekKey)
      .reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);
    
    if (targetWeekTotal + amountNum > WEEKLY_LIMIT) {
      notify(`เกินวงเงินสัปดาห์! คงเหลือ ${(WEEKLY_LIMIT - targetWeekTotal).toLocaleString()} บาท`, false);
      return;
    }

    setSaving(true);
    try {
      const result = await supabaseFetch('loan_records', 'POST', {
        name: name.trim(),
        amount: amountNum,
        week_key: targetWeekKey,
        created_at: selectedDate.toISOString()
      });

      if (result && result[0]) {
        setRecords([result[0], ...records]);
        setSelectedDate(null);
        notify(`บันทึก ${amountNum.toLocaleString()} บาท สำเร็จ`);
      } else if (result.message) {
        notify(result.message, false);
      }
    } catch (err) {
      notify('เกิดข้อผิดพลาด', false);
    }
    setSaving(false);
  };

  const today = toLocalDateStr(new Date());
  const cellHeight = isMobile ? 70 : 100;
  const fontSize = isMobile ? 9 : 11;

  const quickAmounts = [1000, 2000, 5000, 10000];

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
      fontFamily: "'Prompt', 'Noto Sans Thai', sans-serif",
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background decorations */}
      <div style={{
        position: 'fixed', top: '-20%', right: '-10%',
        width: '50vw', height: '50vw',
        background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 24, right: 24, left: isMobile ? 24 : 'auto',
          background: toast.ok ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #ef4444, #dc2626)',
          color: 'white', padding: '16px 28px', borderRadius: 16,
          fontSize: 15, fontWeight: 600, zIndex: 999,
          boxShadow: '0 20px 40px rgba(0,0,0,0.3)', textAlign: 'center'
        }}>{toast.msg}</div>
      )}

      {/* Tooltip */}
      {tooltip && !isMobile && (
        <div style={{
          position: 'fixed', left: tooltip.x, top: tooltip.y,
          transform: 'translate(-50%, -100%)',
          background: 'rgba(15, 23, 42, 0.95)', color: 'white',
          padding: '16px 20px', borderRadius: 16, zIndex: 1000,
          boxShadow: '0 25px 50px rgba(0,0,0,0.4)', minWidth: 200
        }}>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 10, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 10 }}>
            📅 {tooltip.date.getDate()} {thaiMonthsShort[tooltip.date.getMonth()]} {tooltip.date.getFullYear() + 543}
          </div>
          {tooltip.records.map((r, i) => (
            <div key={i} style={{ padding: '8px 0', borderBottom: i < tooltip.records.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ background: getNameGradient(r.name), padding: '2px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>{r.name}</span>
                <span style={{ marginLeft: 'auto', fontWeight: 700 }}>{parseFloat(r.amount).toLocaleString()} ฿</span>
              </div>
            </div>
          ))}
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.1)', textAlign: 'right', fontWeight: 700, color: '#fbbf24' }}>
            รวม {tooltip.records.reduce((s, r) => s + parseFloat(r.amount || 0), 0).toLocaleString()} ฿
          </div>
        </div>
      )}

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: isMobile ? 16 : 32 }}>
        {/* Header */}
        <header style={{ textAlign: 'center', padding: '24px 0 32px', color: 'white' }}>
          <div style={{
            width: 70, height: 70, margin: '0 auto 16px',
            background: 'rgba(255,255,255,0.2)', borderRadius: 20,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
              <rect x="2" y="6" width="20" height="12" rx="2"/><path d="M22 10H2"/><path d="M6 14h4"/>
            </svg>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8, textShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>ระบบบันทึกเงินกู้</h1>
          <p style={{ opacity: 0.9, fontSize: 14 }}>Weekly Loan Recording System</p>
        </header>

        {/* Summary Card */}
        <div style={{
          background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(20px)',
          borderRadius: 20, padding: 20, marginBottom: 24,
          border: '1px solid rgba(255,255,255,0.2)',
          display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{ textAlign: 'center', minWidth: 150 }}>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>สัปดาห์นี้</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'white' }}>{weekTotal.toLocaleString()}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>/ {WEEKLY_LIMIT.toLocaleString()} บาท</div>
          </div>
          <div style={{ width: 1, height: 50, background: 'rgba(255,255,255,0.2)' }} />
          <div style={{ textAlign: 'center', minWidth: 150 }}>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>คงเหลือ</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: weekRemaining > 20000 ? '#4ade80' : weekRemaining > 10000 ? '#fbbf24' : '#f87171' }}>
              {weekRemaining.toLocaleString()}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>บาท</div>
          </div>
          <div style={{ width: '100%', maxWidth: 400 }}>
            <div style={{ height: 10, background: 'rgba(255,255,255,0.2)', borderRadius: 5, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 5,
                width: `${Math.min((weekTotal / WEEKLY_LIMIT) * 100, 100)}%`,
                background: weekTotal / WEEKLY_LIMIT < 0.7 ? 'linear-gradient(90deg, #4ade80, #22c55e)' 
                  : weekTotal / WEEKLY_LIMIT < 0.9 ? 'linear-gradient(90deg, #fbbf24, #f59e0b)'
                  : 'linear-gradient(90deg, #f87171, #ef4444)',
                transition: 'width 0.5s'
              }} />
            </div>
          </div>
        </div>

        {/* Calendar */}
        {loading ? (
          <div style={{
            background: 'rgba(255,255,255,0.95)', borderRadius: 24, padding: 80,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
          }}>
            <div style={{
              width: 50, height: 50, border: '4px solid #e2e8f0', borderTopColor: '#8b5cf6',
              borderRadius: '50%', animation: 'spin 0.8s linear infinite'
            }} />
            <p style={{ marginTop: 16, color: '#64748b', fontWeight: 500 }}>กำลังโหลด...</p>
          </div>
        ) : (
        <div style={{
          background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(20px)',
          borderRadius: 24, boxShadow: '0 25px 50px rgba(0,0,0,0.15)', overflow: 'hidden'
        }}>
          {/* Calendar Header */}
          <div style={{
            background: 'linear-gradient(135deg, #1e293b, #334155)',
            color: 'white', padding: isMobile ? '16px 20px' : '24px 32px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1))}
              style={{
                width: 48, height: 48, background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)', borderRadius: 14,
                color: 'white', fontSize: 20, cursor: 'pointer', fontWeight: 700
              }}>◀</button>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: isMobile ? 22 : 28, fontWeight: 800 }}>{thaiMonths[month.getMonth()]}</div>
              <div style={{ fontSize: 14, opacity: 0.7, marginTop: 4 }}>พ.ศ. {month.getFullYear() + 543}</div>
            </div>
            <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1))}
              style={{
                width: 48, height: 48, background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)', borderRadius: 14,
                color: 'white', fontSize: 20, cursor: 'pointer', fontWeight: 700
              }}>▶</button>
          </div>

          {/* Days Header */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: '#f8fafc' }}>
            {days.map((d, i) => (
              <div key={d} style={{
                padding: '12px 0', textAlign: 'center', fontWeight: 700, fontSize: 13,
                color: i === 0 ? '#ef4444' : i === 6 ? '#3b82f6' : '#64748b'
              }}>{d}</div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {calendarDays.map((date, idx) => {
              if (!date) {
                return <div key={`empty-${idx}`} style={{ height: cellHeight, background: '#f8fafc' }} />;
              }
              
              const dateStr = toLocalDateStr(date);
              const dayRecords = recordMap.get(dateStr) || [];
              const dayTotal = dayRecords.reduce((s, r) => s + parseFloat(r.amount || 0), 0);
              const isToday = dateStr === today;
              const dayOfWeek = date.getDay();

              return (
                <div
                  key={dateStr}
                  onClick={() => handleDateClick(date)}
                  onMouseEnter={(e) => {
                    if (dayRecords.length > 0) {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setTooltip({ x: rect.left + rect.width / 2, y: rect.top - 10, date, records: dayRecords });
                    }
                  }}
                  onMouseLeave={() => setTooltip(null)}
                  style={{
                    height: cellHeight, padding: 6, borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0',
                    background: isToday ? 'linear-gradient(135deg, #ede9fe, #ddd6fe)' : 'white',
                    cursor: 'pointer', transition: 'all 0.2s', overflow: 'hidden', position: 'relative'
                  }}
                >
                  <div style={{
                    width: isMobile ? 24 : 32, height: isMobile ? 24 : 32,
                    borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: isMobile ? 12 : 14, fontWeight: 700, marginBottom: 4,
                    background: isToday ? 'linear-gradient(135deg, #8b5cf6, #6366f1)' : 'transparent',
                    color: isToday ? 'white' : dayOfWeek === 0 ? '#ef4444' : dayOfWeek === 6 ? '#3b82f6' : '#1e293b'
                  }}>{date.getDate()}</div>

                  {/* รายการเงินกู้ */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {dayRecords.slice(0, isMobile ? 1 : 2).map((r, i) => (
                      <div key={i} style={{
                        background: getNameGradient(r.name), color: 'white',
                        padding: '2px 6px', borderRadius: 4,
                        fontSize: fontSize, fontWeight: 600, whiteSpace: 'nowrap',
                        overflow: 'hidden', textOverflow: 'ellipsis'
                      }}>
                        {r.name} {parseFloat(r.amount).toLocaleString()}฿
                      </div>
                    ))}
                    {dayRecords.length > (isMobile ? 1 : 2) && (
                      <div style={{ fontSize: fontSize, color: '#64748b', fontWeight: 600 }}>
                        +{dayRecords.length - (isMobile ? 1 : 2)} อีก
                      </div>
                    )}
                  </div>

                  {/* ยอดรวมวัน */}
                  {dayTotal > 0 && !isMobile && (
                    <div style={{
                      position: 'absolute', bottom: 4, right: 6,
                      fontSize: 10, fontWeight: 700, color: '#8b5cf6'
                    }}>
                      {dayTotal.toLocaleString()}฿
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        )}

        {/* Footer */}
        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 24 }}>
          เวอร์ชัน 1.0 • Supabase
        </p>
      </div>

      {/* Modal บันทึกเงินกู้ */}
      {selectedDate && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: 20
        }} onClick={() => setSelectedDate(null)}>
          <div style={{
            background: 'white', borderRadius: 24, padding: 28, maxWidth: 400, width: '100%',
            boxShadow: '0 25px 50px rgba(0,0,0,0.3)'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ fontSize: 14, color: '#64748b', marginBottom: 4 }}>บันทึกเงินกู้</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#1e293b' }}>
                {selectedDate.getDate()} {thaiMonths[selectedDate.getMonth()]} {selectedDate.getFullYear() + 543}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>ชื่อผู้กู้</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="ระบุชื่อ..."
                style={{
                  width: '100%', padding: 14, fontSize: 16, border: '2px solid #e2e8f0',
                  borderRadius: 12, fontFamily: 'inherit', boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>ยอดเงิน (บาท)</label>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0"
                inputMode="numeric"
                style={{
                  width: '100%', padding: 14, fontSize: 24, fontWeight: 700, textAlign: 'center',
                  border: '2px solid #e2e8f0', borderRadius: 12, fontFamily: 'inherit', boxSizing: 'border-box'
                }}
              />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 12 }}>
                {quickAmounts.map(amt => (
                  <button key={amt} onClick={() => setAmount(String(amt))} style={{
                    padding: '10px 0', fontSize: 13, fontWeight: 600, color: '#7c3aed',
                    background: '#f3f0ff', border: '2px solid #e9e3ff', borderRadius: 10,
                    cursor: 'pointer', fontFamily: 'inherit'
                  }}>{amt.toLocaleString()}</button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setSelectedDate(null)} style={{
                flex: 1, padding: 14, fontSize: 16, fontWeight: 600, color: '#64748b',
                background: '#f1f5f9', border: 'none', borderRadius: 12,
                cursor: 'pointer', fontFamily: 'inherit'
              }}>ยกเลิก</button>
              <button onClick={handleSubmit} disabled={saving} style={{
                flex: 2, padding: 14, fontSize: 16, fontWeight: 700, color: 'white',
                background: saving ? '#94a3b8' : 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                border: 'none', borderRadius: 12, cursor: saving ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit', boxShadow: saving ? 'none' : '0 10px 30px rgba(99,102,241,0.4)'
              }}>{saving ? 'กำลังบันทึก...' : '💾 บันทึก'}</button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Prompt', sans-serif; }
        input:focus { outline: none; border-color: #8b5cf6 !important; }
        button:active { transform: scale(0.98); }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
