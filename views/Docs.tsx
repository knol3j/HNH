import React from 'react';
import { ArrowLeft, Book, Cpu, Shield, Zap, Terminal } from 'lucide-react';

interface DocsProps {
    onBack: () => void;
}

const Docs: React.FC<DocsProps> = ({ onBack }) => {
    return (
        <div className="min-h-screen bg-black text-white selection:bg-primary selection:text-black">
            {/* Navbar */}
            <nav className="border-b border-white/5 bg-black/50 backdrop-blur-xl sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onBack}
                            className="p-2 hover:bg-white/5 rounded-lg transition-colors text-muted hover:text-white"
                            title="Go Back"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div className="h-6 w-px bg-white/10" />
                        <div className="flex items-center gap-2">
                            <Book size={20} className="text-primary" />
                            <span className="font-bold">Documentation</span>
                        </div>
                    </div>
                </div>
            </nav>

            <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-4 gap-12">
                {/* Sidebar */}
                <div className="hidden lg:block space-y-8 sticky top-32 h-fit">
                    <div>
                        <h3 className="font-bold text-white mb-4">Getting Started</h3>
                        <ul className="space-y-2 text-sm text-muted">
                            <li><a href="#intro" className="hover:text-primary transition-colors">Introduction</a></li>
                            <li><a href="#quickstart" className="hover:text-primary transition-colors">Quick Start</a></li>
                            <li><a href="#requirements" className="hover:text-primary transition-colors">System Requirements</a></li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="font-bold text-white mb-4">Features</h3>
                        <ul className="space-y-2 text-sm text-muted">
                            <li><a href="#auto-switch" className="hover:text-primary transition-colors">Auto-Profit Switch</a></li>
                            <li><a href="#ai-tuning" className="hover:text-primary transition-colors">AI Tuning</a></li>
                            <li><a href="#security" className="hover:text-primary transition-colors">Security</a></li>
                        </ul>
                    </div>
                </div>

                {/* Content */}
                <div className="lg:col-span-3 space-y-16">

                    {/* Intro */}
                    <section id="intro" className="space-y-6">
                        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                            v3.0.0
                        </div>
                        <h1 className="text-4xl font-bold">Introduction</h1>
                        <p className="text-lg text-muted leading-relaxed">
                            HashNHedge is an AI-powered compute orchestration platform. It allows you to monetize your idle GPU and CPU power by automatically switching between the most profitable workloads: cryptocurrency mining and AI inference tasks.
                        </p>
                    </section>

                    {/* Quick Start */}
                    <section id="quickstart" className="space-y-6">
                        <h2 className="text-3xl font-bold flex items-center gap-3">
                            <Zap className="text-primary" /> Quick Start
                        </h2>
                        <div className="prose prose-invert max-w-none text-muted">
                            <p>Follow these steps to start earning in under 5 minutes:</p>
                            <ol className="list-decimal list-inside space-y-4 mt-4 ml-4">
                                <li>
                                    <strong className="text-white">Create an Account:</strong> Click "Start Mining" on the home page.
                                </li>
                                <li>
                                    <strong className="text-white">Download the Agent:</strong> Once logged in, go to the "Workers" tab and download the Native Agent for your OS.
                                </li>
                                <li>
                                    <strong className="text-white">Run the Installer:</strong>
                                    <pre className="bg-surface border border-white/10 p-4 rounded-lg mt-2 text-sm font-mono text-gray-300 overflow-x-auto">
                                        {`# Windows (PowerShell)
Set-ExecutionPolicy Bypass -Scope Process -Force; ./setup_miner_windows.ps1`}
                                    </pre>
                                </li>
                                <li>
                                    <strong className="text-white">Start Earning:</strong> The agent will automatically benchmark your hardware and start the most profitable workload.
                                </li>
                            </ol>
                        </div>
                    </section>

                    {/* Docs Sections */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-surface border border-white/5 p-6 rounded-2xl">
                            <Cpu className="text-purple-400 mb-4" size={32} />
                            <h3 className="text-xl font-bold mb-2">AI Optimization</h3>
                            <p className="text-sm text-muted">
                                Our proprietary Gemini-based engine analyzes your hardware telemetry (temps, power, hashrate) to optimize overclock settings safely.
                            </p>
                        </div>
                        <div className="bg-surface border border-white/5 p-6 rounded-2xl">
                            <Shield className="text-green-400 mb-4" size={32} />
                            <h3 className="text-xl font-bold mb-2">Security First</h3>
                            <p className="text-sm text-muted">
                                Your wallet keys never leave your device. The agent connects via an aggregated proxy, keeping your IP address hidden from pools.
                            </p>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default Docs;
