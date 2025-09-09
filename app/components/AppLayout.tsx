import SideNav from "./SideNav";
import Footer from "./Footer";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex min-h-screen">
      <SideNav />
      <div className="flex-1 lg:ml-64 flex flex-col">
        <main className="flex-1">
          {children}
        </main>
        <Footer />
      </div>
    </div>
  );
}
