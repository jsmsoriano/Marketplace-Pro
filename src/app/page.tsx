import { FinanceProvider } from "@/components/finance/FinanceProvider";
import { AppShell } from "@/components/finance/AppShell";

export default function Home() {
  return (
    <FinanceProvider>
      <AppShell />
    </FinanceProvider>
  );
}
