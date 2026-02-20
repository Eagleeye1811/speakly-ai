import React, { useState } from 'react';
import { Scenario } from '../types';
import { X, Save, Plus } from 'lucide-react';

interface ScenarioFormProps {
    scenario?: Scenario;
    onSave: (scenario: Scenario) => void;
    onCancel: () => void;
}

const VOICES: Array<'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr'> = [
    'Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'
];

const GRADIENTS = [
    'from-blue-500 to-indigo-600',
    'from-emerald-500 to-teal-600',
    'from-orange-500 to-red-600',
    'from-violet-500 to-purple-600',
    'from-pink-500 to-rose-600',
    'from-slate-500 to-slate-800'
];

export default function ScenarioForm({ scenario, onSave, onCancel }: ScenarioFormProps) {
    const [formData, setFormData] = useState<Scenario>(
        scenario || {
            id: 'custom-' + Date.now(),
            title: '',
            role: '',
            tone: '',
            skills: '',
            description: '',
            goal: '',
            voiceName: 'Puck',
            bgGradient: GRADIENTS[0],
        }
    );

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex justify-center items-center py-10 px-4 overflow-y-auto">
            <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden mt-auto mb-auto">
                <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                    <h2 className="text-xl font-bold text-slate-800">
                        {scenario ? 'Edit Scenario' : 'Create Custom Scenario'}
                    </h2>
                    <button onClick={onCancel} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-slate-700">Title</label>
                            <input required name="title" value={formData.title} onChange={handleChange} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="e.g. Tough Investor Pitch" />
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-slate-700">Role</label>
                            <input required name="role" value={formData.role} onChange={handleChange} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="e.g. Skeptical VC" />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-semibold text-slate-700">Scenario Description</label>
                        <textarea required name="description" value={formData.description} onChange={handleChange} rows={2} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="Describe the setting and context..."></textarea>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-slate-700">AI Tone & Personality</label>
                            <input required name="tone" value={formData.tone} onChange={handleChange} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="e.g. Firm, analytical, short-tempered" />
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-slate-700">Goal for the User</label>
                            <input required name="goal" value={formData.goal} onChange={handleChange} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="e.g. Secure a follow-up meeting." />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-semibold text-slate-700">Focus Skills (Comma separated)</label>
                        <input required name="skills" value={formData.skills} onChange={handleChange} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="e.g. Active Listening, Conciseness, Objection Handling" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-slate-700">Voice Persona</label>
                            <select name="voiceName" value={formData.voiceName} onChange={handleChange} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none">
                                {VOICES.map(v => <option key={v} value={v}>{v}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-slate-700">Card Color</label>
                            <div className="flex gap-2 mt-2">
                                {GRADIENTS.map(gradient => (
                                    <button
                                        key={gradient}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, bgGradient: gradient })}
                                        className={`w-8 h-8 rounded-full bg-gradient-to-r ${gradient} ${formData.bgGradient === gradient ? 'ring-2 ring-offset-2 ring-blue-500' : ''}`}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-3 border-t border-slate-200">
                        <button type="button" onClick={onCancel} className="px-4 py-2 font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors">
                            Cancel
                        </button>
                        <button type="submit" className="px-5 py-2 font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2">
                            <Save className="w-4 h-4" /> Save Template
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
