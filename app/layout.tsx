import './styles.css'
import type { Metadata } from 'next'
export const metadata: Metadata={title:'العائلة | al3aela',description:'شبكة العائلة الليبية'}
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="ar" dir="rtl"><body>{children}</body></html>}