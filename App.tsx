import React, { useState } from 'react';
import { SCENARIOS } from './constants';
import { Scenario } from './types';
import ScenarioCard from './components/ScenarioCard';
import SessionView from './components/SessionView';
import Header from './components/Header';

export default function App() {
  const [activeScenario, setActiveScenario] = useState<Scenario | null>(null);

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      <Header onHome={() => setActiveScenario(null)} isSessionActive={!!activeScenario} />

      <main className="flex-1 overflow-hidden relative">
        {!activeScenario ? (
          <div className="h-full overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
            <div className="mb-12 text-center mt-8">
              <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-6 tracking-tight">
                AI-Powered <span className="text-blue-600">Communication Coaching</span>
              </h1>
              <p className="text-lg md:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
                Practice critical conversations in realistic, real-time roleplays with advanced AI personas.
                Get immediate, actionable feedback on your speaking pace, filler words, and delivery.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-12">
              {SCENARIOS.map((scenario) => (
                <ScenarioCard
                  key={scenario.id}
                  scenario={scenario}
                  onSelect={(s) => setActiveScenario(s)}
                />
              ))}
            </div>
          </div>
        ) : (
          <SessionView
            scenario={activeScenario}
            onEndSession={() => setActiveScenario(null)}
          />
        )}
      </main>
    </div>
  );
}