import "@/styles/globals.css";
import { AuthProvider } from '@/auth/AuthProvider';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';

export default function App({ Component, pageProps }) {
  return (
    <AuthProvider>
      <div className={`${GeistSans.variable} ${GeistMono.variable} font-sans`}>
        <Component {...pageProps} />
      </div>
    </AuthProvider>
  );
}