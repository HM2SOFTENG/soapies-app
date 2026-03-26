import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Share, PlusSquare } from "lucide-react";

// Detect iOS Safari (not Chrome/Firefox on iOS, which can't install PWAs)
function isIOSSafari() {
  const ua = navigator.userAgent;
  const isIOS = /iphone|ipad|ipod/i.test(ua);
  const isSafari = /safari/i.test(ua) && !/chrome|crios|fxios/i.test(ua);
  return isIOS && isSafari;
}

function isStandalone() {
  return (window.navigator as any).standalone === true;
}

const DISMISSED_KEY = "soapies_install_dismissed";

export default function IOSInstallBanner() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState<"prompt" | "instructions">("prompt");

  useEffect(() => {
    // Only show on iOS Safari, not already installed, not previously dismissed
    if (!isIOSSafari() || isStandalone()) return;
    const dismissed = localStorage.getItem(DISMISSED_KEY);
    if (dismissed) return;
    // Small delay so it doesn't pop up immediately on page load
    const t = setTimeout(() => setVisible(true), 3000);
    return () => clearTimeout(t);
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, "1");
    setVisible(false);
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          className="fixed bottom-20 left-3 right-3 z-50 md:hidden"
        >
          <div className="bg-black/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden">
            {step === "prompt" ? (
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src="https://d2xsxph8kpxj0f.cloudfront.net/310519663460303717/FfTbhpP94ZvscRd7twWNT6/soapies-logo_cf3c72b2.png"
                      alt="Soapies"
                      className="w-12 h-12 rounded-xl border border-white/10"
                    />
                    <div>
                      <p className="text-white font-bold text-sm">Add Soapies to your Home Screen</p>
                      <p className="text-white/50 text-xs mt-0.5">Quick access — feels like a native app</p>
                    </div>
                  </div>
                  <button onClick={dismiss} className="text-white/30 hover:text-white/60 p-1 flex-shrink-0">
                    <X size={16} />
                  </button>
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => setStep("instructions")}
                    className="flex-1 bg-gradient-to-r from-pink-600 to-purple-600 text-white text-sm font-bold py-2.5 rounded-xl"
                  >
                    Show me how →
                  </button>
                  <button
                    onClick={dismiss}
                    className="px-4 text-white/40 text-sm hover:text-white/60"
                  >
                    Not now
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-white font-bold text-sm">Add to Home Screen</p>
                  <button onClick={dismiss} className="text-white/30 hover:text-white/60 p-1">
                    <X size={16} />
                  </button>
                </div>
                <ol className="space-y-3">
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-pink-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                    <div className="flex items-center gap-2 text-white/80 text-sm">
                      <span>Tap the</span>
                      <span className="inline-flex items-center gap-1 bg-white/10 border border-white/10 px-2 py-0.5 rounded-lg text-xs font-medium">
                        <Share size={12} className="text-blue-400" />
                        <span className="text-blue-400">Share</span>
                      </span>
                      <span>button in Safari</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-pink-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                    <div className="flex items-center gap-2 text-white/80 text-sm">
                      <span>Scroll down and tap</span>
                      <span className="inline-flex items-center gap-1 bg-white/10 border border-white/10 px-2 py-0.5 rounded-lg text-xs font-medium">
                        <PlusSquare size={12} className="text-white/70" />
                        <span>Add to Home Screen</span>
                      </span>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-pink-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                    <p className="text-white/80 text-sm">Tap <strong className="text-white">Add</strong> in the top right — done! 🎉</p>
                  </li>
                </ol>
                <button
                  onClick={dismiss}
                  className="w-full mt-4 bg-white/10 text-white/60 text-sm py-2.5 rounded-xl hover:bg-white/15"
                >
                  Got it
                </button>
              </div>
            )}
          </div>

          {/* Little arrow pointing down toward the Safari toolbar */}
          <div className="flex justify-center mt-1">
            <div className="w-3 h-3 bg-black/90 border-r border-b border-white/10 rotate-45 -mt-2" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
