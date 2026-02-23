import type { Metadata } from 'next'
import { Kanit } from 'next/font/google'
import './globals.css'

const kanit = Kanit({
  subsets: ['latin', 'thai'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-kanit',
})

export const metadata: Metadata = {
  title: "Lotus's Operation Team Org-chart",
  description: "ระบบจัดการ Org Chart และข้อมูลทีมงาน Lotus's Operation Team",
  robots: "noindex, nofollow",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="th" className={kanit.variable}>
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
