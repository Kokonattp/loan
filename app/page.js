'use client';

import { useState, useEffect } from 'react';

// =====================================================
// CONFIG - ใช้ Supabase โปรเจคเดียวกับระบบลาพักร้อน
// =====================================================
const SUPABASE_URL = 'https://kylizhmvqpzdhylzvwog.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5bGl6aG12cXB6ZGh5bHp2d29nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2NzY4NzUsImV4cCI6MjA4MzI1Mjg3NX0.01L8sSvU55QVugeukEqAUBRQUMtstUuQXtZqYWjRFdA';
const WEEKLY_LIMIT = 60000;

// =====================================================
// HELPER: คำนวณ Week Key (ISO Week พ.ศ.)
// =====================================================
function getWeekKey(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const dayNum = d.getDay() || 7;
  d.setDate(d.getDate() + 4 - dayNum);
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNum = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  const thaiYear = d.getFullYear() + 543;
  return `${thaiYear}-W${String(weekNum).padStart(2, '0')}`;
}

// =====================================================
// SUPABASE FETCH HELPERS
// =====================================================
async function supabaseSelect(table, filter = '') {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${filter}`;
  const res = await fetch(url, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });
  return res.json();
}

async function supabaseInsert(table, data) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify(data),
  });
  return res.json();
}

// =====================================================
// ICONS
// =====================================================
const Icons = {
  CreditCard: () => (
    <svg className="w-11 h-11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="6" width="20" height="12" rx="2"/><path d="M22 10H2"/><path d="M6 14h4"/>
    </svg>
  ),
  Calendar: () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
    </svg>
  ),
  Plus: () => (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 5v14M5 12h14"/>
    </svg>
  ),
  History: () => (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8M16 17H8M10 9H8"/>
    </svg>
  ),
  Clock: () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="10"/>
    </svg>
  ),
  ArrowLeft: () => (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M19 12H5M12 19l-7-7 7-7"/>
    </svg>
  ),
  Check: () => (
    <svg className="w-9 h-9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/>
    </svg>
  ),
  X: () => (
    <svg className="w-9 h-9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/>
    </svg>
  ),
  Info: () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
    </svg>
  ),
  Wallet: () => (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="6" width="20" height="12" rx="2"/><path d="M22 10H2"/>
    </svg>
  ),
  Refresh: () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
    </svg>
  ),
};

// =====================================================
// MAIN COMPONENT
// =====================================================
export default function LoanRecordPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState('home');
  
  const [weekTotal, setWeekTotal] = useState(0);
  const [remaining, setRemaining] = useState(WEEKLY_LIMIT);
  const [weekKey, setWeekKey] = useState('');
  const [weekRecords, setWeekRecords] = useState([]);
  const [historyRecords, setHistoryRecords] = useState([]);
  
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  
  const [modal, setModal] = useState({ show: false, type: '', message: '' });

  useEffect(() => {
    loadWeekSummary();
  }, []);

  const loadWeekSummary = async () => {
    try {
      const currentWeekKey = getWeekKey();
      setWeekKey(currentWeekKey);
      
      const data = await supabaseSelect(
        'loan_records',
        `select=*&week_key=eq.${currentWeekKey}&order=created_at.desc`
      );
      
      if (Array.isArray(data)) {
        const total = data.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);
        setWeekTotal(total);
        setRemaining(WEEKLY_LIMIT - total);
        setWeekRecords(data);
      }
    } catch (error) {
      console.error('Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const data = await supabaseSelect(
        'loan_records',
        'select=*&order=created_at.desc&limit=500'
      );
      if (Array.isArray(data)) {
        setHistoryRecords(data);
      }
    } catch (error) {
      console.error('History error:', error);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setModal({ show: true, type: 'error', message: 'กรุณาระบุชื่อผู้กู้' });
      return;
    }
    const amountNum = parseFloat(amount) || 0;
    if (amountNum <= 0) {
      setModal({ show: true, type: 'error', message: 'กรุณาระบุยอดเงิน' });
      return;
    }
    if (amountNum > remaining) {
      setModal({ show: true, type: 'error', message: `ยอดเงินเกินวงเงินคงเหลือ!\nวงเงินคงเหลือ: ${remaining.toLocaleString()} บาท` });
      return;
    }

    setSaving(true);

    try {
      const currentWeekKey = getWeekKey();
      const result = await supabaseInsert('loan_records', {
        name: name.trim(),
        amount: amountNum,
        week_key: currentWeekKey,
      });

      if (result.error) {
        throw new Error(result.error.message || 'เกิดข้อผิดพลาด');
      }

      const newTotal = weekTotal + amountNum;
      const newRemaining = WEEKLY_LIMIT - newTotal;

      setModal({
        show: true,
        type: 'success',
        message: `บันทึกเงินกู้ ${amountNum.toLocaleString()} บาท เรียบร้อย\nยอดรวมสัปดาห์: ${newTotal.toLocaleString()} บาท\nคงเหลือ: ${newRemaining.toLocaleString()} บาท`
      });
      setName('');
      setAmount('');
      
    } catch (error) {
      setModal({ show: true, type: 'error', message: error.message || 'ไม่สามารถบันทึกได้' });
    } finally {
      setSaving(false);
    }
  };

  const closeModal = () => {
    setModal({ show: false, type: '', message: '' });
    if (modal.type === 'success') {
      setPage('home');
      loadWeekSummary();
    }
  };

  const getProgressColor = () => {
    const pct = (weekTotal / WEEKLY_LIMIT) * 100;
    if (pct >= 90) return 'bg-gradient-to-r from-red-500 to-red-400';
    if (pct >= 70) return 'bg-gradient-to-r from-amber-500 to-amber-400';
    return 'bg-gradient-to-r from-emerald-500 to-emerald-400';
  };

  const formatDateTime = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()+543} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  };

  const formatWeekLabel = () => {
    if (!weekKey) return 'สัปดาห์ที่ 1';
    const parts = weekKey.split('-W');
    return `สัปดาห์ที่ ${parseInt(parts[1])} ปี ${parts[0]}`;
  };

  const quickAmounts = [1000, 2000, 5000, 10000, 15000, 20000];

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
        <p className="mt-4 text-white/90 text-sm">กำลังโหลด...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-5 pb-8">
      {/* HOME PAGE */}
      {page === 'home' && (
        <div className="animate-slideUp">
          <header className="text-center py-8 text-white">
            <div className="w-20 h-20 mx-auto mb-4 bg-white/20 rounded-2xl flex items-center justify-center animate-float">
              <Icons.CreditCard />
            </div>
            <h1 className="text-2xl font-bold mb-1 drop-shadow-lg">ระบบบันทึกเงินกู้</h1>
            <p className="text-white/90 text-sm">Weekly Loan Recording System</p>
          </header>

          <div className="glass rounded-3xl p-6 mb-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-white/80 text-sm">ยอดเงินกู้สัปดาห์นี้</p>
              <button onClick={loadWeekSummary} className="p-2 hover:bg-white/10 rounded-lg transition-all text-white/70 hover:text-white">
                <Icons.Refresh />
              </button>
            </div>
            
            <div className="flex items-center gap-2 text-white/90 text-sm font-medium mb-4">
              <Icons.Calendar />
              <span>{formatWeekLabel()}</span>
            </div>

            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-4xl font-bold text-white">{weekTotal.toLocaleString()}</span>
              <span className="text-white/80">บาท</span>
            </div>
            <p className="text-white/70 text-sm">จากวงเงิน {WEEKLY_LIMIT.toLocaleString()} บาท/สัปดาห์</p>

            <div className="h-3 bg-white/20 rounded-full overflow-hidden my-4">
              <div className={`h-full rounded-full transition-all duration-500 ${getProgressColor()}`} style={{ width: `${Math.min((weekTotal / WEEKLY_LIMIT) * 100, 100)}%` }} />
            </div>

            <div className="flex items-center justify-between p-3 bg-white/10 rounded-xl">
              <span className="text-white/80 text-sm">วงเงินคงเหลือ</span>
              <span className="text-lg font-semibold text-white">{remaining.toLocaleString()} บาท</span>
            </div>
          </div>

          <div className="space-y-3">
            <button onClick={() => setPage('form')} disabled={remaining <= 0} className="w-full py-4 px-6 bg-white text-purple-600 font-semibold text-lg rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50">
              <Icons.Plus />
              บันทึกเงินกู้
            </button>

            <button onClick={() => { setPage('history'); loadHistory(); }} className="w-full py-4 px-6 bg-white/15 text-white font-semibold text-lg rounded-2xl border-2 border-white/30 hover:bg-white/25 transition-all flex items-center justify-center gap-3 active:scale-[0.98]">
              <Icons.History />
              ดูประวัติทั้งหมด
            </button>
          </div>

          {weekRecords.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center gap-2 text-white/80 text-sm mb-3">
                <Icons.Clock />
                <span>รายการสัปดาห์นี้ ({weekRecords.length} รายการ)</span>
              </div>
              <div className="space-y-2">
                {weekRecords.slice(0, 5).map((r) => (
                  <div key={r.id} className="flex items-center justify-between p-3 bg-white/10 rounded-xl">
                    <div>
                      <p className="text-white font-medium">{r.name}</p>
                      <p className="text-white/60 text-xs mt-0.5">{formatTime(r.created_at)}</p>
                    </div>
                    <span className="text-white font-semibold text-lg">{parseFloat(r.amount).toLocaleString()} ฿</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-center text-white/50 text-xs mt-8">เวอร์ชัน 1.0 • Supabase</p>
        </div>
      )}

      {/* FORM PAGE */}
      {page === 'form' && (
        <div className="animate-slideUp">
          <header className="flex items-center py-4 mb-5">
            <button onClick={() => setPage('home')} className="w-11 h-11 bg-white/15 rounded-xl flex items-center justify-center text-white hover:bg-white/25 transition-all">
              <Icons.ArrowLeft />
            </button>
            <h1 className="flex-1 text-center text-lg font-semibold text-white mr-11">บันทึกเงินกู้</h1>
          </header>

          <div className="glass-solid rounded-3xl p-6">
            <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-xl mb-5">
              <div className="text-purple-600"><Icons.Info /></div>
              <span className="text-sm text-gray-600">วงเงินคงเหลือ: <span className="font-semibold text-purple-600">{remaining.toLocaleString()} บาท</span></span>
            </div>

            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">ชื่อผู้กู้</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="ระบุชื่อ..." className="w-full px-4 py-4 text-base bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors" />
            </div>

            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">ยอดเงิน (บาท)</label>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))} placeholder="0" inputMode="numeric" className="w-full px-4 py-4 text-2xl font-semibold text-center bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors" />
              <div className="grid grid-cols-3 gap-2 mt-3">
                {quickAmounts.map((amt) => (
                  <button key={amt} onClick={() => setAmount(String(amt))} className="py-2.5 text-sm font-medium text-purple-600 bg-purple-50 border-2 border-purple-100 rounded-xl hover:bg-purple-100 active:scale-95 transition-all">
                    {amt.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={handleSubmit} disabled={saving} className="w-full py-4 text-lg font-semibold text-white bg-gradient-to-r from-purple-600 to-purple-700 rounded-2xl shadow-lg shadow-purple-500/40 hover:shadow-xl disabled:opacity-60 active:scale-[0.98] transition-all">
              {saving ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
          </div>
        </div>
      )}

      {/* HISTORY PAGE */}
      {page === 'history' && (
        <div className="animate-slideUp">
          <header className="flex items-center py-4 mb-5">
            <button onClick={() => setPage('home')} className="w-11 h-11 bg-white/15 rounded-xl flex items-center justify-center text-white hover:bg-white/25 transition-all">
              <Icons.ArrowLeft />
            </button>
            <h1 className="flex-1 text-center text-lg font-semibold text-white mr-11">ประวัติทั้งหมด</h1>
          </header>

          {historyRecords.length > 0 ? (
            <div className="space-y-3">
              {historyRecords.map((r) => (
                <div key={r.id} className="glass-solid rounded-2xl p-4 flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600">
                    <Icons.Wallet />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 truncate">{r.name}</p>
                    <p className="text-sm text-gray-500 mt-0.5">{formatDateTime(r.created_at)}</p>
                  </div>
                  <span className="text-lg font-bold text-purple-600 whitespace-nowrap">{parseFloat(r.amount).toLocaleString()} ฿</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-solid rounded-3xl p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 text-gray-300">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>
                </svg>
              </div>
              <p className="text-gray-500">ยังไม่มีรายการ</p>
            </div>
          )}
        </div>
      )}

      {/* MODAL */}
      {modal.show && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-5">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center animate-scaleIn">
            <div className={`w-20 h-20 mx-auto mb-5 rounded-full flex items-center justify-center ${modal.type === 'success' ? 'bg-emerald-100 text-emerald-500' : 'bg-red-100 text-red-500'}`}>
              {modal.type === 'success' ? <Icons.Check /> : <Icons.X />}
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">{modal.type === 'success' ? 'บันทึกสำเร็จ!' : 'เกิดข้อผิดพลาด'}</h3>
            <p className="text-gray-600 whitespace-pre-line mb-6">{modal.message}</p>
            <button onClick={closeModal} className={`w-full py-3.5 text-white font-semibold rounded-xl transition-all active:scale-95 ${modal.type === 'success' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-red-500 hover:bg-red-600'}`}>
              ตกลง
            </button>
          </div>
        </div>
      )}

      {/* LOADING OVERLAY */}
      {saving && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center z-50">
          <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
          <p className="mt-4 text-white">กำลังบันทึก...</p>
        </div>
      )}
    </div>
  );
}
