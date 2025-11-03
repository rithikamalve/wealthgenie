import { useState, useEffect } from "react";
import { LoginPage } from "./components/login-page";
import { UploadPage } from "./components/upload-page";
import { Dashboard } from "./components/dashboard";
import { Toaster } from "./components/ui/sonner";
import { createClient } from "./utils/supabase/client";

type AppState = "login" | "upload" | "dashboard";

export default function App() {
  const [appState, setAppState] = useState<AppState>("login");
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const supabase = createClient();

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Session error:', error);
          setAccessToken(null);
          setAppState("login");
        } else if (session?.access_token) {
          setAccessToken(session.access_token);
          setAppState("dashboard");
        }
      } catch (error) {
        console.error('Error checking session:', error);
        setAccessToken(null);
        setAppState("login");
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, [supabase]);

  const handleLogin = (token: string) => {
    setAccessToken(token);
    // Go directly to dashboard - users can upload from there
    setAppState("dashboard");
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setAccessToken(null);
      setAppState("login");
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="size-full flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-green-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="size-full">
        {appState === "login" && (
          <LoginPage onLogin={handleLogin} />
        )}
        
        {appState === "upload" && accessToken && (
          <UploadPage 
            accessToken={accessToken}
            onUploadComplete={() => setAppState("dashboard")} 
          />
        )}
        
        {appState === "dashboard" && accessToken && (
          <Dashboard 
            accessToken={accessToken}
            onLogout={handleLogout} 
          />
        )}
      </div>
      <Toaster />
    </>
  );
}
