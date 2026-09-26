import { headers } from "next/headers"
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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Reading the nonce via headers() here is required: it's what lets Next.js
  // attach the matching nonce to its own hydration/streaming scripts, not
  // just the ones we author ourselves.
  const nonce = (await headers()).get("x-nonce") ?? undefined

  return (
    <html lang="en" className={`${orbitron.variable} ${rajdhani.variable} ${bangers.variable} ${jetbrains.variable}`}>
      <body className="bg-skeld-void text-white antialiased font-rajdhani" data-csp-nonce={nonce}>{children}</body>
    </html>
  )
}
