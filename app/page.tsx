import { Suspense } from 'react';
import TnbCalculator from "../components/TnbCalculator";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
        <TnbCalculator />
      </Suspense>
    </div>
  );
}
