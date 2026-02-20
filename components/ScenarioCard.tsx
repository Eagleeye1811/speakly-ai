import React from 'react';
import { Scenario } from '../types';
import { ArrowRight, UserCircle, Target, MessageCircle } from 'lucide-react';

interface ScenarioCardProps {
  scenario: Scenario;
  onSelect: (scenario: Scenario) => void;
}

export default function ScenarioCard({ scenario, onSelect }: ScenarioCardProps) {
  return (
    <div 
      className="group relative bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-200 hover:border-blue-300 flex flex-col h-full cursor-pointer overflow-hidden"
      onClick={() => onSelect(scenario)}
    >
      <div className={`absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r ${scenario.bgGradient}`} />
      
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-lg bg-gradient-to-br ${scenario.bgGradient} text-white shadow-md`}>
           <MessageCircle className="w-6 h-6" />
        </div>
        <div className="px-2 py-1 bg-slate-100 rounded text-xs font-semibold text-slate-600 uppercase tracking-wide">
          {scenario.voiceName}
        </div>
      </div>

      <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
        {scenario.title}
      </h3>
      
      <p className="text-slate-600 text-sm mb-6 flex-grow leading-relaxed">
        {scenario.description}
      </p>

      <div className="space-y-3 mb-6">
        <div className="flex items-start gap-2 text-sm text-slate-500">
            <UserCircle className="w-4 h-4 mt-0.5 text-slate-400 shrink-0" />
            <span className="font-medium text-slate-700">Role: {scenario.role}</span>
        </div>
        <div className="flex items-start gap-2 text-sm text-slate-500">
            <Target className="w-4 h-4 mt-0.5 text-slate-400 shrink-0" />
            <span className="text-slate-600 line-clamp-2">{scenario.skills}</span>
        </div>
      </div>

      <button className="w-full mt-auto py-3 px-4 rounded-xl bg-slate-50 text-slate-900 font-semibold border border-slate-200 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all flex items-center justify-center gap-2">
        Start Practice
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}