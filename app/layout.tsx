import type { Metadata } from 'next'; import './globals.css';
export const metadata:Metadata={title:'Zyntra — AI workspace',description:'A thoughtful space to work with AI.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
