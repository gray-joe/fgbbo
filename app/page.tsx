"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "../lib/hooks/useAuth";
import { useRouter } from "next/navigation";

export default function Home() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signIn, signUp, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, router]);

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pastel-blue via-white to-pastel-pink flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-pastel-blue mx-auto mb-4"></div>
          <p className="text-gray-700 text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render the form if already authenticated (redirect will happen)
  if (isAuthenticated) {
    return null;
  }


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const result = await signIn(email, password);
        if (result.success) {
          setEmail("");
          setPassword("");
          setFullName("");
          router.push("/dashboard");
        } else {
          setError(result.error || "Sign in failed");
        }
      } else {
        const result = await signUp(email, password, fullName);
        if (result.success) {
          setEmail("");
          setPassword("");
          setFullName("");
          router.push("/dashboard");
        } else {
          setError(result.error || "Sign up failed");
        }
      }
    } catch (err) {
      console.error('Authentication error:', err);
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pastel-blue via-white to-pastel-pink flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-pastel-pink to-pastel-blue rounded-full mb-4 shadow-lg">
            <span className="text-4xl">🍰</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            GBBO Fantasy League
          </h1>
          <p className="text-gray-700">
            Bake your way to victory in the ultimate fantasy competition!
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-white/30">
          {/* Toggle Buttons */}
          <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
            <button
              onClick={() => {
                setIsLogin(true);
                setError(null);
                setFullName("");
              }}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                isLogin
                  ? "bg-white text-gray-800 shadow-sm"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setIsLogin(false);
                setError(null);
                setFullName("");
              }}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                !isLogin
                  ? "bg-white text-gray-800 shadow-sm"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              <strong>Error:</strong> {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label htmlFor="fullName" className="block text-sm font-semibold text-gray-800 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pastel-blue focus:border-transparent transition-all bg-white text-gray-800 placeholder-gray-500"
                  placeholder="Enter your full name"
                  required={!isLogin}
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-800 mb-2">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pastel-blue focus:border-transparent transition-all bg-white text-gray-800 placeholder-gray-500"
                placeholder="Enter your email"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-800 mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pastel-blue focus:border-transparent transition-all bg-white text-gray-800 placeholder-gray-500"
                placeholder="Enter your password"
                required
              />
            </div>

            {isLogin && (
              <div className="flex items-center justify-between">
                <label className="flex items-center">
                  <input type="checkbox" className="rounded border-gray-300 text-pastel-blue focus:ring-pastel-blue" />
                  <span className="ml-2 text-sm text-gray-700">Remember me</span>
                </label>
                <a href="#" className="text-sm text-pastel-blue hover:text-pastel-blue-dark transition-colors font-medium">
                  Forgot password?
                </a>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-pastel-blue to-pastel-pink text-gray-800 py-3 px-4 rounded-lg font-semibold hover:from-pastel-blue-dark hover:to-pastel-pink-dark transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Processing..." : (isLogin ? "Sign In" : "Create Account")}
            </button>
          </form>


        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-gray-600 text-sm">
          <p>By continuing, you agree to our</p>
          <div className="flex justify-center space-x-2 mt-1">
            <a href="#" className="text-pastel-blue hover:text-pastel-blue-dark transition-colors font-medium">
              Terms of Service
            </a>
            <span>•</span>
            <a href="#" className="text-pastel-blue hover:text-pastel-blue-dark transition-colors font-medium">
              Privacy Policy
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
