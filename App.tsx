import React, { useState } from 'react';
import { SCENARIOS } from './constants';
import { Scenario } from './types';
import ScenarioCard from './components/ScenarioCard';
import SessionView from './components/SessionView';
import Header from './components/Header';
import ScenarioForm from './components/ScenarioForm';
import { Plus } from 'lucide-react';

export default function App() {
  const [activeScenario, setActiveScenario] = useState<Scenario | null>(null);

  // Custom scenario state (hydrated from localStorage)
  const [scenarios, setScenarios] = useState<Scenario[]>(() => {
    const saved = localStorage.getItem('speakly_scenarios');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return SCENARIOS;
      }
    }
    return SCENARIOS;
  });

  const [editingScenario, setEditingScenario] = useState<Scenario | null | 'new'>(null);

  const handleSaveScenario = (scenario: Scenario) => {
    let updated: Scenario[];
    if (editingScenario === 'new') {
      updated = [scenario, ...scenarios];
    } else {
      updated = scenarios.map(s => s.id === scenario.id ? scenario : s);
    }
    setScenarios(updated);
    localStorage.setItem('speakly_scenarios', JSON.stringify(updated));
    setEditingScenario(null);
  };

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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-12 relative">

              {/* Add New Card */}
              <div
                onClick={() => setEditingScenario('new')}
                className="group relative bg-slate-100 rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border-2 border-dashed border-slate-300 hover:border-blue-400 flex flex-col items-center justify-center h-full cursor-pointer overflow-hidden min-h-[300px]"
              >
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Plus className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-700 group-hover:text-blue-600">Create Template</h3>
                <p className="text-slate-500 text-sm mt-2 text-center">Design a custom role-play scenario for your specific needs.</p>
              </div>

              {scenarios.map((scenario) => (
                <ScenarioCard
                  key={scenario.id}
                  scenario={scenario}
                  onSelect={(s) => setActiveScenario(s)}
                  onEdit={(s) => setEditingScenario(s)}
                />
              ))}
            </div>

            {editingScenario && (
              <ScenarioForm
                scenario={editingScenario === 'new' ? undefined : editingScenario}
                onSave={handleSaveScenario}
                onCancel={() => setEditingScenario(null)}
              />
            )}
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