import './globals.css'

export const metadata = {
  title: 'ระบบบันทึกเงินกู้',
  description: 'Weekly Loan Recording System - บันทึกเงินกู้ จำกัด 60,000 บาท/สัปดาห์',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
  themeColor: '#7C3AED',
}

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body className="min-h-screen">
        {children}
      </body>
    </html>
  )
}
