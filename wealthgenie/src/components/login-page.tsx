import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Sparkles, TrendingUp, PiggyBank, Shield } from "lucide-react";
import { useState } from "react";
import { createClient } from "../utils/supabase/client";
import { authApi } from "../utils/api";
import { toast } from "sonner@2.0.3";

export function LoginPage({ onLogin }: { onLogin: (token: string) => void }) {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const supabase = createClient();

  // Quick test account generator
  const fillTestAccount = () => {
    const randomId = Math.floor(Math.random() * 10000);
    setEmail(`user${randomId}@test.com`);
    setPassword("password123");
    setName(`Test User ${randomId}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isSignup) {
        // Sign up
        if (!name) {
          toast.error("Please enter your name");
          setIsLoading(false);
          return;
        }

        await authApi.signup(email, password, name);
        toast.success("Account created successfully! Please sign in.");
        setIsSignup(false);
        setPassword("");
      } else {
        // Sign in
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          throw error;
        }

        if (!data.session?.access_token) {
          throw new Error("No access token received");
        }

        toast.success("Signed in successfully!");
        onLogin(data.session.access_token);
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      
      // Provide user-friendly error messages
      let errorMessage = error.message || 'Authentication failed';
      
      if (errorMessage.includes('Invalid login credentials')) {
        errorMessage = isSignup 
          ? 'Failed to create account. Please try again.'
          : 'Invalid email or password. Please check your credentials or create a new account.';
      } else if (errorMessage.includes('User already registered')) {
        errorMessage = 'This email is already registered. Please sign in instead.';
      }
      
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center p-4">
      <div className="max-w-6xl w-full grid md:grid-cols-2 gap-12 items-center">
        {/* Left side - Branding */}
        <div className="text-center md:text-left space-y-6">
          <div className="flex items-center justify-center md:justify-start gap-3">
            <div className="bg-gradient-to-br from-blue-600 to-green-600 p-3 rounded-2xl">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
              WealthGenie
            </h1>
          </div>
          
          <div className="space-y-2">
            <h2 className="text-3xl text-gray-900">Track. Analyze. Improve your finances.</h2>
            <p className="text-gray-600">
              Your AI-powered financial companion for smarter money management
            </p>
          </div>

          <div className="grid gap-4 pt-4">
            <div className="flex items-start gap-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-gray-900">Track Income & Expenses</h3>
                <p className="text-sm text-gray-600">Visualize your financial flow with interactive charts</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="bg-green-100 p-2 rounded-lg">
                <PiggyBank className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="text-gray-900">Smart Savings Goals</h3>
                <p className="text-sm text-gray-600">Set and achieve your financial targets</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="bg-purple-100 p-2 rounded-lg">
                <Shield className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="text-gray-900">AI-Powered Insights</h3>
                <p className="text-sm text-gray-600">Get personalized financial recommendations</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Login Card */}
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-200">
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-2xl text-gray-900">
                {isSignup ? "Create Account" : "Welcome Back"}
              </h3>
              <p className="text-gray-600 mt-2">
                {isSignup 
                  ? "Sign up to start tracking your finances" 
                  : "Sign in to access your financial dashboard"}
              </p>
              {!isSignup && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-left">
                  <p className="text-xs text-blue-900 mb-1">
                    <strong>New User?</strong>
                  </p>
                  <p className="text-xs text-blue-700">
                    Click "Create New Account" below to get started. It only takes a few seconds!
                  </p>
                </div>
              )}
              {isSignup && (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="text-left flex-1">
                      <p className="text-xs text-green-900 mb-1">
                        <strong>Quick Setup</strong>
                      </p>
                      <p className="text-xs text-green-700">
                        Fill in the form or try a test account
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={fillTestAccount}
                      className="ml-2 text-xs bg-white hover:bg-green-100 border-green-300"
                    >
                      Use Test Account
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignup && (
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  minLength={6}
                />
                {isSignup && (
                  <p className="text-xs text-gray-500">Password must be at least 6 characters</p>
                )}
              </div>

              <Button 
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white py-6"
              >
                {isLoading 
                  ? "Please wait..." 
                  : isSignup 
                    ? "Create Account" 
                    : "Sign In"}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center">
                  <span className="px-4 bg-white text-sm text-gray-500">or</span>
                </div>
              </div>

              <Button 
                type="button"
                variant="outline" 
                className="w-full py-6 border-gray-300"
                onClick={() => setIsSignup(!isSignup)}
              >
                {isSignup ? "Already have an account? Sign In" : "Create New Account"}
              </Button>
            </form>

            <p className="text-xs text-center text-gray-500 pt-4">
              By continuing, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
