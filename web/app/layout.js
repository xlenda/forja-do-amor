import "./globals.css";
import Script from "next/script";
import { Inter, Cormorant_Garamond } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--sans",
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--serif",
  display: "swap",
});

export const metadata = {
  title: "Forja del Amor — la lectura de ustedes dos y los recuerdos que los reconectan",
  description:
    "La lectura astrológica real de la pareja — compatibilidad, Sol · Luna · Ascendente y cartas — y el lugar donde guardan sus recuerdos y se reconectan.",
};

// Antes eram constantes fixas com texto de placeholder ("TU_PIXEL_ID_AQUI") —
// os scripts do Pixel/GA carregavam e chamavam fbq('init', ...)/gtag('config',
// ...) com um ID inválido de qualquer forma, então nenhum evento (nem o
// PageView automático) chegava a lugar nenhum de verdade. Lendo de env var e
// só renderizando o Script quando o ID real existir evita mandar tráfego pra
// um pixel/propriedade que não existe. Falta configurar NEXT_PUBLIC_FB_PIXEL_ID
// e NEXT_PUBLIC_GA_ID no ambiente de produção pra isso passar a funcionar de
// verdade (achado real de auditoria, 19/07/2026).
const FB_PIXEL_ID = process.env.NEXT_PUBLIC_FB_PIXEL_ID || "";
const GA_ID = process.env.NEXT_PUBLIC_GA_ID || "";

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={`${inter.variable} ${cormorant.variable}`}>
      <body>
        {FB_PIXEL_ID && (
          <Script id="fb-pixel" strategy="afterInteractive">
            {`
              !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
              n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
              document,'script','https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${FB_PIXEL_ID}');
              fbq('track', 'PageView');
            `}
          </Script>
        )}
        {GA_ID && (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
            <Script id="ga-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_ID}');
              `}
            </Script>
          </>
        )}
        {children}
      </body>
    </html>
  );
}
