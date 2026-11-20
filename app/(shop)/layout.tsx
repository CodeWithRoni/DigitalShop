import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { CartProvider } from '@/components/CartProvider';

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <Header />
      <main>{children}</main>
      <Footer />
    </CartProvider>
  );
}
