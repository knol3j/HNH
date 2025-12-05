import React, { useState } from 'react';
import { ComputeNode } from '../types';
import { MOCK_NODES } from '../services/mockData';
import { Server, Cpu, MapPin, Zap, Filter, BadgeCheck, ShieldCheck } from 'lucide-react';

const Marketplace: React.FC = () => {
  const [filterGpu, setFilterGpu] = useState('All');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  
  const filteredNodes = MOCK_NODES.filter(n => {
    const matchesGpu = filterGpu === 'All' || n.gpuModel.includes(filterGpu);
    const matchesVerified = verifiedOnly ? n.isVerified : true;
    return matchesGpu && matchesVerified;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Compute Marketplace</h2>
          <p className="text-muted">Rent high-performance decentralized GPU nodes for AI training and rendering.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
           {/* Trust Filter */}
           <button 
             onClick={() => setVerifiedOnly(!verifiedOnly)}
             className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
                verifiedOnly 
                ? 'bg-blue-500/20 border-blue-500 text-blue-400' 
                : 'bg-surface border-white/10 text-muted hover:text-white'
             }`}
           >
             <BadgeCheck size={16} /> Verified Only
           </button>

           <div className="flex gap-2 bg-surface p-1 rounded-xl border border-white/10 overflow-x-auto">
             {['All', 'H100', 'A100', '4090'].map(type => (
               <button
                 key={type}
                 onClick={() => setFilterGpu(type)}
                 className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                   filterGpu === type 
                   ? 'bg-primary text-black shadow-lg' 
                   : 'text-muted hover:text-white'
                 }`}
               >
                 {type}
               </button>
             ))}
           </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4">
        {filteredNodes.length === 0 && (
           <div className="text-center py-20 text-muted">
             <Server size={48} className="mx-auto mb-4 opacity-20" />
             <p>No nodes found matching criteria.</p>
           </div>
        )}
        {filteredNodes.map((node) => (
          <div key={node.id} className="bg-surface border border-white/5 rounded-xl p-5 hover:border-primary/50 transition-all group flex flex-col md:flex-row items-start md:items-center gap-6 relative overflow-hidden">
             
             {/* Verified Background Gradient */}
             {node.isVerified && <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>}

             {/* Icon/Status */}
             <div className="flex-shrink-0 relative ml-2">
               <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border border-white/10 ${node.status === 'IDLE' ? 'bg-emerald-500/10' : 'bg-amber-500/10'}`}>
                 <Server className={node.status === 'IDLE' ? 'text-emerald-500' : 'text-amber-500'} size={32} />
               </div>
               <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-surface ${node.status === 'IDLE' ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
             </div>

             {/* Details */}
             <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
               <div>
                 <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg text-white group-hover:text-primary transition-colors">{node.gpuModel}</h3>
                    {node.isVerified && (
                      <span title="Verified Provider">
                        <BadgeCheck size={16} className="text-blue-500" />
                      </span>
                    )}
                 </div>
                 <p className="text-sm text-muted">{node.name}</p>
                 <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                   <MapPin size={12} /> {node.region}
                   <span className="text-white/20">|</span>
                   <span className="font-mono text-[10px]">{node.provider}</span>
                 </div>
               </div>

               <div className="flex items-center gap-6">
                 <div>
                   <p className="text-xs text-muted uppercase">VRAM</p>
                   <p className="font-mono text-white flex items-center gap-1"><Cpu size={14} className="text-accent"/> {node.vram} GB</p>
                 </div>
                 <div>
                   <p className="text-xs text-muted uppercase">SLA Tier</p>
                   <p className={`font-mono flex items-center gap-1 text-sm ${node.slaTier === 'Enterprise' ? 'text-purple-400 font-bold' : 'text-white'}`}>
                      <ShieldCheck size={14} /> {node.slaTier}
                   </p>
                 </div>
               </div>

               <div className="flex flex-col items-end justify-center">
                  <p className="text-2xl font-bold text-white">${node.pricePerHour.toFixed(2)}<span className="text-sm text-muted font-normal">/hr</span></p>
                  <p className="text-xs text-green-500 mb-2">{node.availability}% Availability</p>
               </div>
             </div>

             {/* Action */}
             <div>
               <button 
                 disabled={node.status !== 'IDLE'}
                 className={`px-6 py-3 rounded-xl font-bold min-w-[120px] transition-all ${
                   node.status === 'IDLE' 
                   ? 'bg-white text-black hover:bg-primary hover:text-white shadow-lg hover:shadow-primary/20' 
                   : 'bg-white/5 text-muted cursor-not-allowed border border-white/5'
                 }`}
               >
                 {node.status === 'IDLE' ? 'Rent Node' : 'Busy'}
               </button>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Marketplace;