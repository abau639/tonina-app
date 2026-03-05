"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { ArrowLeft, RefreshCw } from "lucide-react";

const DOLPHIN_FACTS = [
  "Dolphins use non-verbal communication and specific whistles to talk to each other.",
  "Every dolphin has a unique 'signature whistle', essentially acting as their name.",
  "Dolphins sleep with half of their brain awake so they remember to go to the surface to breathe.",
  "The Boto (Amazon river dolphin) is known as the 'Tonina' in parts of South America!",
  "Dolphins have been observed surfing waves purely for fun.",
  "A dolphin's top layer of skin regenerates entirely every two hours.",
  "Because their eyes are on the sides of their heads, they have a nearly 360-degree field of vision.",
  "Toninas (pink river dolphins) are actually born gray and turn pink as they age.",
  "Dolphins use tools! Some cover their snouts with sea sponges to protect them while foraging.",
  "They are highly altruistic, often observed helping injured members of their pod reach the surface."
];

export default function NotFound() {
  const [fact, setFact] = useState("");

  // Randomize fact on mount to avoid hydration mismatch
  useEffect(() => {
    setFact(DOLPHIN_FACTS[Math.floor(Math.random() * DOLPHIN_FACTS.length)] || "");
  }, []);

  const getNewFact = () => {
    let newFact = fact;
    while (newFact === fact) {
        newFact = DOLPHIN_FACTS[Math.floor(Math.random() * DOLPHIN_FACTS.length)] || "";
    }
    setFact(newFact);
  };

  return (
    <main className="min-h-screen bg-slate-50 font-sans flex flex-col items-center justify-center p-6 selection:bg-pink-100">
      <div className="max-w-xl w-full text-center">
        
        {/* Playful Emoji */}
        <div className="text-8xl mb-6 animate-bounce">
            🐬
        </div>

        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900 mb-4">
          404: Lost at Sea
        </h1>
        
        <p className="text-lg text-slate-500 mb-10">
          The page you're looking for has drifted off. While you're here, did you know:
        </p>

        {/* Fact Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative group mb-10">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-pink-100 text-pink-700 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border border-pink-200">
                Random Tonina Fact
            </span>
            <p className="text-slate-700 font-medium leading-relaxed italic">
                "{fact}"
            </p>
            <button 
                onClick={getNewFact}
                className="absolute -right-3 -bottom-3 p-2 bg-slate-100 text-slate-400 rounded-full hover:bg-slate-200 hover:text-slate-600 transition-colors shadow-sm"
                title="Get another fact"
            >
                <RefreshCw className="w-4 h-4" />
            </button>
        </div>

        {/* Action */}
        <Link 
            href="/" 
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-slate-900 text-white font-bold hover:bg-slate-800 transition-all shadow-md hover:shadow-lg active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" /> Return to Tonina.me
        </Link>
      </div>
    </main>
  );
}