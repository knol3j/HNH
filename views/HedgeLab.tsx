import React, { useState } from 'react';
import { JobSpec } from '../types';
import { analyzeComputeRequirements } from '../services/geminiService';
import { Bot, Zap, ArrowRight, Loader2, Shield, AlertTriangle, Code, Copy, Check, LayoutTemplate, Brain, Image as ImageIcon, Mic } from 'lucide-react';
import { DEPLOYMENT_TEMPLATES } from '../services/mockData';

const DeployJob: React.FC = () => {
  const [taskInput, setTaskInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [jobSpec, setJobSpec] = useState<JobSpec | null>(null);
  const [showPayload, setShowPayload] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleAnalyze = async () => {
    if (!taskInput.trim()) return;
    setIsAnalyzing(true);
    const result = await analyzeComputeRequirements(taskInput);
    setJobSpec(result);
    setIsAnalyzing(false);
  };

  const generatePayload = () => {
    if(!jobSpec) return;
    setShowPayload(true);
  };

  const copyPayload = () => {
    if(!jobSpec) return;
    const payload = JSON.stringify(jobSpec, null, 2);
    navigator.clipboard.writeText(payload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getIcon = (name: string) => {
    switch(name) {
      case 'Brain': return <Brain size={20} className="text-purple-400" />;
      case 'Image': return <ImageIcon size={20} className="text-pink-400" />;
      case 'Mic': return <Mic size={20} className="text-blue-400" />;
      default: return <Bot size={20} />;
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
       <div className="text-center space-y-4">
         <h2 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent inline-block">
           AI Job Orchestrator
         </h2>
         <p className="text-muted text-lg max-w-2xl mx-auto">
           Describe your workload naturally. Gemini AI will analyze the requirements and generate a deployment specification compatible with the HNH Network.
         </p>
       </div>

       {/* Quick Start Templates */}
       {!showPayload && !jobSpec && (
         <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in">
           {DEPLOYMENT_TEMPLATES.map(template => (
             <button
               key={template.id}
               onClick={() => setTaskInput(template.prompt)}
               className="bg-surface border border-white/5 hover:border-primary/40 rounded-xl p-4 text-left transition-all hover:bg-white/5 group"
             >
                <div className="flex items-center gap-3 mb-2">
                   <div className="bg-white/5 p-2 rounded-lg group-hover:bg-primary/20 transition-colors">
                     {getIcon(template.icon)}
                   </div>
                   <h3 className="font-bold text-white text-sm">{template.name}</h3>
                </div>
                <p className="text-xs text-muted line-clamp-2">{template.description}</p>
             </button>
           ))}
         </div>
       )}

       {/* Input Section */}
       {!showPayload && (
         <div className="bg-surface border border-white/10 rounded-2xl p-2 relative shadow-2xl animate-fade-in">
            <textarea
              value={taskInput}
              onChange={(e) => setTaskInput(e.target.value)}
              placeholder="e.g., I need to fine-tune Llama-3-70b on a custom dataset. I need high memory bandwidth and redundancy..."
              className="w-full h-32 bg-transparent text-white p-4 text-lg focus:outline-none resize-none placeholder:text-white/20"
            />
            <div className="flex justify-between items-center px-4 pb-2">
              <span className="text-xs text-muted flex items-center gap-1">
                <Bot size={14} /> Powered by Gemini 2.5
              </span>
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing || !taskInput}
                className="bg-primary hover:bg-primary-hover text-black font-bold px-6 py-2 rounded-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
              >
                {isAnalyzing ? <Loader2 className="animate-spin" /> : <Zap size={18} fill="currentColor" />}
                {isAnalyzing ? 'Orchestrating...' : 'Analyze & Match'}
              </button>
            </div>
         </div>
       )}

       {/* Results Section */}
       {jobSpec && !showPayload && (
         <div className="animate-fade-in space-y-6">
           <div className="bg-surface/50 border border-primary/20 rounded-2xl p-8 backdrop-blur-sm relative overflow-hidden">
             
             <div className="relative z-10">
               <div className="flex items-start justify-between mb-6">
                 <div>
                   <h3 className="text-2xl font-bold text-white">{jobSpec.title}</h3>
                   <p className="text-gray-400 mt-1">{jobSpec.description}</p>
                 </div>
                 <div className="flex flex-col items-end gap-2">
                    <div className="bg-primary/10 text-primary border border-primary/20 px-4 py-2 rounded-lg font-mono font-bold text-lg">
                      {jobSpec.recommendedGpu}
                    </div>
                    <button onClick={() => setJobSpec(null)} className="text-xs text-muted hover:text-white underline">
                      Reset / New Analysis
                    </button>
                 </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                 <div className="bg-background/50 p-4 rounded-xl border border-white/5">
                   <p className="text-xs text-muted uppercase mb-1">Duration Estimate</p>
                   <p className="text-white font-medium">{jobSpec.estimatedDuration}</p>
                 </div>
                 <div className="bg-background/50 p-4 rounded-xl border border-white/5">
                   <p className="text-xs text-muted uppercase mb-1">Max Bid Price</p>
                   <p className="text-white font-medium">${jobSpec.maxPrice}/hr</p>
                 </div>
                 <div className="bg-background/50 p-4 rounded-xl border border-white/5">
                   <p className="text-xs text-muted uppercase mb-1">Risk Hedge</p>
                   <p className="text-green-500 font-medium flex items-center gap-1"><Shield size={14}/> Standard</p>
                 </div>
               </div>

               <div className="bg-white/5 rounded-xl p-5 border border-white/5 mb-6">
                 <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                   <Bot size={16} className="text-accent" /> AI Reasoning
                 </h4>
                 <p className="text-sm text-gray-300 italic">"{jobSpec.reasoning}"</p>
               </div>
               
               {/* Hedging Options */}
               <div className="flex items-center gap-4 p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-xl mb-6">
                  <AlertTriangle className="text-yellow-500" size={20} />
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-yellow-500">Spot Instance Hedge</h4>
                    <p className="text-xs text-muted">Smart contract logic will be appended to handle node preemption events.</p>
                  </div>
               </div>

               <div className="mt-8 flex justify-end">
                 <button 
                   onClick={generatePayload}
                   className="bg-white text-black font-bold text-lg px-8 py-3 rounded-xl hover:bg-gray-200 transition-colors shadow-xl flex items-center gap-2"
                 >
                   Construct Payload <ArrowRight size={20} />
                 </button>
               </div>
             </div>
           </div>
         </div>
       )}

       {/* Deployment Payload View */}
       {showPayload && jobSpec && (
         <div className="bg-black border border-white/10 rounded-2xl overflow-hidden animate-fade-in font-mono text-sm relative">
            <div className="bg-white/5 px-4 py-3 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary">
                 <Code size={16} />
                 <span className="font-bold">deployment_payload.json</span>
              </div>
              <button 
                onClick={copyPayload}
                className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded transition-colors flex items-center gap-2"
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? 'Copied' : 'Copy JSON'}
              </button>
            </div>
            <div className="p-6 overflow-auto max-h-96">
               <pre className="text-green-400">
{`{
  "network": "HNH_MAINNET",
  "version": "1.0.2",
  "job": {
    "type": "COMPUTE_ALLOCATION",
    "specs": ${JSON.stringify(jobSpec, null, 4).replace(/\n/g, '\n    ')},
    "requirements": {
      "cuda_version": ">=12.0",
      "p2p_transfer": true,
      "secure_enclave": true
    },
    "payment": {
      "token": "ETH",
      "max_bid_wei": "${(jobSpec.maxPrice * 10e15).toFixed(0)}"
    }
  }
}`}
               </pre>
            </div>
            <div className="bg-white/5 p-4 border-t border-white/5 text-center">
               <p className="text-muted text-xs mb-4">
                 Send this payload to the HNH Orchestrator Smart Contract to begin job auction.
               </p>
               <button onClick={() => { setShowPayload(false); setJobSpec(null); setTaskInput(''); alert("Broadcasted!"); }} className="text-white bg-primary/20 hover:bg-primary/30 px-6 py-2 rounded-lg text-primary font-bold transition-all">
                 Sign & Broadcast
               </button>
            </div>
         </div>
       )}
    </div>
  );
};

export default DeployJob;