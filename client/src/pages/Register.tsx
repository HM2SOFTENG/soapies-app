import { useEffect } from "react";
import { useLocation } from "wouter";

/**
 * Legacy Register page — redirects to the unified JoinFlow.
 * Kept for backward compatibility with any existing links to /register.
 */
export default function Register() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    setLocation("/join");
  }, [setLocation]);

  return null;
}
