"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    // TODO: Implement actual logout logic (clear tokens, etc.)
    console.log("Logging out user...");
    
    // Redirect to login page after a brief delay
    const timer = setTimeout(() => {
      router.push("/");
    }, 1000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-pastel-blue via-white to-pastel-pink flex items-center justify-center p-4">
      <div className="text-center">
        <div className="w-20 h-20 bg-gradient-to-br from-pastel-pink to-pastel-blue rounded-full mx-auto mb-4 flex items-center justify-center">
          <span className="text-4xl">👋</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Logging Out
        </h1>
        <p className="text-gray-700">
          Thank you for playing GBBO Fantasy League!
        </p>
        <div className="mt-4">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-pastel-blue"></div>
        </div>
      </div>
    </div>
  );
}
