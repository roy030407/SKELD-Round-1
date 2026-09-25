import { Orbitron, Rajdhani, Bangers, JetBrains_Mono } from "next/font/google"
// import localFont from "next/font/local"
import "./globals.css"

const orbitron = Orbitron({ subsets: ["latin"], variable: "--font-orbitron" })
const rajdhani = Rajdhani({ subsets: ["latin"], weight: ["400","500","600","700"], variable: "--font-rajdhani" })
const bangers = Bangers({ subsets: ["latin"], weight: "400", variable: "--font-bangers" })
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains" })
// const vcr = localFont({
//   src: "../public/fonts/VCR_OSD_MONO_1.001.ttf",
//   variable: "--font-vcr",
//   display: "swap",
// })

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${orbitron.variable} ${rajdhani.variable} ${bangers.variable} ${jetbrains.variable}`}>
      <body className="bg-skeld-void text-white antialiased font-rajdhani">{children}</body>
    </html>
  )
}
