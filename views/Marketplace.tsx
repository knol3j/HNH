import React, { useState, useEffect } from 'react';
import { Cpu, Server, Zap, Shield, Play, Terminal, Plus, Search, Filter, Layers, DollarSign, CheckCircle2, ArrowRight } from 'lucide-react';
import { notifySuccess, notifyError } from '../services/notification';

interface ComputeCluster {
    id: string;
    name: string;
    description: string;
    totalNodes: number;
    gpuModel: string;
    totalVram: number;
    totalTflops: number;
    pricePerHr: number;
    region: string;
    status: string;
}

interface WorkloadJob {
    id: string;
    title: string;
    containerImg: string;
    reqGpuModel: string;
    reqVramGb: number;
    status: string;
    escrowUsd: number;
    createdAt: string;
}

export const Marketplace: React.FC = () => {
    const [clusters, setClusters] = useState<ComputeCluster[]>([
        {
            id: 'cluster-1',
            name: 'Alpha-16x RTX 4090 Pool',
            description: 'Ultra high-throughput cluster for PyTorch / TensorFlow AI training & LLM inference.',
            totalNodes: 4,
            gpuModel: 'NVIDIA RTX 4090',
            totalVram: 96,
            totalTflops: 330,
            pricePerHr: 1.80,
            region: 'US-East (Virginia)',
            status: 'active'
        },
        {
            id: 'cluster-2',
            name: 'Enterprise A100-80GB Equivalent',
            description: 'Dedicated multi-node cluster optimized for large scale model fine-tuning and batch processing.',
            totalNodes: 8,
            gpuModel: 'NVIDIA A100-SXMP',
            totalVram: 640,
            totalTflops: 2496,
            pricePerHr: 4.50,
            region: 'EU-Central (Frankfurt)',
            status: 'active'
        },
        {
            id: 'cluster-3',
            name: 'Rendering & Graphics Farm',
            description: 'Spot instance pool ideal for Blender, OctaneRender, and Unreal Engine 5 offload.',
            totalNodes: 6,
            gpuModel: 'NVIDIA RTX 3090 Ti',
            totalVram: 144,
            totalTflops: 240,
            pricePerHr: 1.10,
            region: 'US-West (Oregon)',
            status: 'active'
        }
    ]);

    const [workloads, setWorkloads] = useState<WorkloadJob[]>([
        {
            id: 'wk-101',
            title: 'Llama-3 8B Fine-Tuning Batch',
            containerImg: 'pytorch/pytorch:2.1.0-cuda12.1-cudnn8-runtime',
            reqGpuModel: 'NVIDIA RTX 4090',
            reqVramGb: 24,
            status: 'running',
            escrowUsd: 14.40,
            createdAt: new Date().toISOString()
        }
    ]);

    const [search, setSearch] = useState('');
    const [selectedGpu, setSelectedGpu] = useState('all');
    const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);

    // Deploy Modal Form State
    const [jobTitle, setJobTitle] = useState('');
    const [containerImage, setContainerImage] = useState('pytorch/pytorch:latest');
    const [commandText, setCommandText] = useState('python3 train.py --epochs 100 --batch-size 64');
    const [durationHours, setDurationHours] = useState(4);
    const [targetGpu, setTargetGpu] = useState('NVIDIA RTX 4090');

    // Calculator State
    const [calcGpuCount, setCalcGpuCount] = useState(4);
    const [calcDuration, setCalcDuration] = useState(24);

    const calcHnhCost = calcGpuCount * 0.45 * calcDuration;
    const calcAwsCost = calcGpuCount * 2.20 * calcDuration;
    const calcSavings = calcAwsCost - calcHnhCost;
    const calcSavingsPct = Math.round((calcSavings / calcAwsCost) * 100);

    const handleDeployJob = (e: React.FormEvent) => {
        e.preventDefault();
        if (!jobTitle) {
            notifyError('Please enter a job title');
            return;
        }

        const newJob: WorkloadJob = {
            id: `wk-${Math.floor(Math.random() * 9000 + 1000)}`,
            title: jobTitle,
            containerImg: containerImage,
            reqGpuModel: targetGpu,
            reqVramGb: 24,
            status: 'running',
            escrowUsd: durationHours * 0.45,
            createdAt: new Date().toISOString()
        };

        setWorkloads([newJob, ...workloads]);
        setIsDeployModalOpen(false);
        setJobTitle('');
        notifySuccess(`Workload "${jobTitle}" deployed successfully! Active in cluster queue.`);
    };

    const filteredClusters = clusters.filter(c => {
        const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.description.toLowerCase().includes(search.toLowerCase());
        const matchesGpu = selectedGpu === 'all' || c.gpuModel.toLowerCase().includes(selectedGpu.toLowerCase());
        return matchesSearch && matchesGpu;
    });

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8 text-white">
            {/* Header Hero */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-900/80 via-purple-900/60 to-slate-900 border border-indigo-500/30 p-8 shadow-2xl backdrop-blur-xl">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-3">
                            <Zap className="w-3.5 h-3.5 text-yellow-400" />
                            DePIN Clustered Compute Marketplace
                        </div>
                        <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                            Institutional Compute <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-indigo-400">At 70% Off Cloud Costs</span>
                        </h1>
                        <p className="text-slate-300 text-sm md:text-base mt-2 max-w-2xl">
                            Deploy containerized AI/ML workloads, LLM training, and graphics rendering across thousands of aggregated GPU/CPU host clusters globally.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                        <button
                            onClick={() => setIsDeployModalOpen(true)}
                            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 shadow-lg shadow-cyan-500/20 transition-all duration-200"
                        >
                            <Plus className="w-5 h-5" />
                            Deploy Workload Container
                        </button>
                    </div>
                </div>

                {/* Key Metrics Banner */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-700/50">
                    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                        <div className="text-slate-400 text-xs font-medium">Available TFLOPS</div>
                        <div className="text-2xl font-bold text-cyan-400 mt-1">3,072 TFLOPS</div>
                    </div>
                    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                        <div className="text-slate-400 text-xs font-medium">Active GPU Nodes</div>
                        <div className="text-2xl font-bold text-indigo-400 mt-1">1,420 GPUs</div>
                    </div>
                    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                        <div className="text-slate-400 text-xs font-medium">Avg Spot Cost</div>
                        <div className="text-2xl font-bold text-green-400 mt-1">$0.45 / GPU-hr</div>
                    </div>
                    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                        <div className="text-slate-400 text-xs font-medium">Network Uptime SLA</div>
                        <div className="text-2xl font-bold text-emerald-400 mt-1">99.94%</div>
                    </div>
                </div>
            </div>

            {/* Compute Cost Savings Calculator */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-green-400" />
                        <h2 className="text-lg font-bold text-white">Enterprise Savings Calculator</h2>
                    </div>
                    <span className="text-xs text-slate-400">Comparing HashNHedge vs AWS EC2 / Google Cloud</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs text-slate-400 font-medium block mb-1">GPU Instances Count: {calcGpuCount} GPUs</label>
                            <input
                                type="range"
                                min="1"
                                max="32"
                                value={calcGpuCount}
                                onChange={e => setCalcGpuCount(parseInt(e.target.value))}
                                className="w-full accent-indigo-500 cursor-pointer"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 font-medium block mb-1">Execution Time: {calcDuration} Hours</label>
                            <input
                                type="range"
                                min="1"
                                max="168"
                                value={calcDuration}
                                onChange={e => setCalcDuration(parseInt(e.target.value))}
                                className="w-full accent-indigo-500 cursor-pointer"
                            />
                        </div>
                    </div>

                    <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/60 space-y-2">
                        <div className="flex justify-between text-xs text-slate-300">
                            <span>AWS EC2 Rate:</span>
                            <span className="font-semibold text-red-400">${calcAwsCost.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-xs text-slate-300">
                            <span>HashNHedge Rate:</span>
                            <span className="font-semibold text-green-400">${calcHnhCost.toFixed(2)}</span>
                        </div>
                        <div className="pt-2 border-t border-slate-700 flex justify-between items-center">
                            <span className="text-xs font-bold text-white">Your Net Savings:</span>
                            <span className="text-lg font-extrabold text-cyan-400">${calcSavings.toFixed(2)} ({calcSavingsPct}% Off)</span>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-indigo-950/60 to-purple-950/60 border border-indigo-500/30 p-5 rounded-xl text-center space-y-2">
                        <div className="text-xs text-indigo-300 font-semibold uppercase tracking-wider">Ready to Run Enterprise Workloads?</div>
                        <div className="text-sm text-slate-300">Lock in spot compute rates and instant orchestration.</div>
                        <button
                            onClick={() => setIsDeployModalOpen(true)}
                            className="mt-2 w-full py-2 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition"
                        >
                            Launch Workload Now &rarr;
                        </button>
                    </div>
                </div>
            </div>

            {/* Clusters Catalog Section */}
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-white">Raw Compute Cluster Pools</h2>
                        <p className="text-xs text-slate-400">Select a cluster pool matching your VRAM and TFLOPS requirements.</p>
                    </div>

                    {/* Filter Controls */}
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                            <input
                                type="text"
                                placeholder="Search clusters..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-48"
                            />
                        </div>

                        <select
                            value={selectedGpu}
                            onChange={e => setSelectedGpu(e.target.value)}
                            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                        >
                            <option value="all">All GPUs</option>
                            <option value="4090">RTX 4090</option>
                            <option value="A100">A100-SXMP</option>
                            <option value="3090">RTX 3090</option>
                        </select>
                    </div>
                </div>

                {/* Grid of Clusters */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {filteredClusters.map(cluster => (
                        <div key={cluster.id} className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 hover:border-indigo-500/50 transition-all duration-200 flex flex-col justify-between space-y-4">
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                        ● {cluster.status.toUpperCase()}
                                    </span>
                                    <span className="text-xs text-slate-400">{cluster.region}</span>
                                </div>
                                <h3 className="text-lg font-bold text-white">{cluster.name}</h3>
                                <p className="text-xs text-slate-400 mt-1 line-clamp-2">{cluster.description}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-2 bg-slate-800/50 p-3 rounded-xl border border-slate-700/50 text-xs">
                                <div>
                                    <span className="text-slate-400 block">GPU Model:</span>
                                    <span className="font-semibold text-slate-200">{cluster.gpuModel}</span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block">Total VRAM:</span>
                                    <span className="font-semibold text-cyan-400">{cluster.totalVram} GB</span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block">Performance:</span>
                                    <span className="font-semibold text-indigo-400">{cluster.totalTflops} TFLOPS</span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block">Cluster Rate:</span>
                                    <span className="font-semibold text-green-400">${cluster.pricePerHr.toFixed(2)}/hr</span>
                                </div>
                            </div>

                            <button
                                onClick={() => {
                                    setJobTitle(`Workload on ${cluster.name}`);
                                    setTargetGpu(cluster.gpuModel);
                                    setIsDeployModalOpen(true);
                                }}
                                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-indigo-600 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2"
                            >
                                <Play className="w-3.5 h-3.5" />
                                Reserve & Deploy
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Active Deployed Workloads Section */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Terminal className="w-5 h-5 text-indigo-400" />
                        <h2 className="text-lg font-bold text-white">Your Active Workload Jobs</h2>
                    </div>
                    <span className="text-xs text-slate-400">{workloads.length} Workload(s) Running</span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-300">
                        <thead className="bg-slate-800/80 text-slate-400 uppercase font-semibold">
                            <tr>
                                <th className="p-3">Job ID & Title</th>
                                <th className="p-3">Container Image</th>
                                <th className="p-3">Target Hardware</th>
                                <th className="p-3">Status</th>
                                <th className="p-3">Escrow Spent</th>
                                <th className="p-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {workloads.map(wk => (
                                <tr key={wk.id} className="hover:bg-slate-800/40">
                                    <td className="p-3 font-semibold text-white">
                                        <div className="text-indigo-300">{wk.id}</div>
                                        <div className="text-slate-400 font-normal">{wk.title}</div>
                                    </td>
                                    <td className="p-3 font-mono text-slate-400">{wk.containerImg}</td>
                                    <td className="p-3 font-medium text-slate-200">{wk.reqGpuModel} ({wk.reqVramGb}GB)</td>
                                    <td className="p-3">
                                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                                            ● {wk.status.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="p-3 font-semibold text-green-400">${wk.escrowUsd.toFixed(2)}</td>
                                    <td className="p-3 text-right space-x-2">
                                        <button
                                            onClick={() => notifySuccess(`Fetching real-time logs for ${wk.id}...`)}
                                            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium"
                                        >
                                            View Logs
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Deploy Modal */}
            {isDeployModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
                        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Terminal className="w-5 h-5 text-indigo-400" />
                                Deploy Container Workload
                            </h3>
                            <button
                                onClick={() => setIsDeployModalOpen(false)}
                                className="text-slate-400 hover:text-white font-bold"
                            >
                                &times;
                            </button>
                        </div>

                        <form onSubmit={handleDeployJob} className="space-y-4">
                            <div>
                                <label className="text-xs text-slate-400 font-medium block mb-1">Job / Workload Title</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. LLM Fine-Tuning Task #4"
                                    value={jobTitle}
                                    onChange={e => setJobTitle(e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="text-xs text-slate-400 font-medium block mb-1">Docker Container Image</label>
                                <input
                                    type="text"
                                    required
                                    value={containerImage}
                                    onChange={e => setContainerImage(e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                                />
                            </div>

                            <div>
                                <label className="text-xs text-slate-400 font-medium block mb-1">Execution Command</label>
                                <textarea
                                    rows={2}
                                    value={commandText}
                                    onChange={e => setCommandText(e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-slate-400 font-medium block mb-1">Target Hardware</label>
                                    <select
                                        value={targetGpu}
                                        onChange={e => setTargetGpu(e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                                    >
                                        <option value="NVIDIA RTX 4090">NVIDIA RTX 4090</option>
                                        <option value="NVIDIA A100-SXMP">NVIDIA A100-80GB</option>
                                        <option value="NVIDIA RTX 3090 Ti">NVIDIA RTX 3090 Ti</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-slate-400 font-medium block mb-1">Duration (Hours)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="168"
                                        value={durationHours}
                                        onChange={e => setDurationHours(parseInt(e.target.value) || 1)}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                                    />
                                </div>
                            </div>

                            <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60 flex justify-between items-center text-xs">
                                <span className="text-slate-400">Total Escrow Required:</span>
                                <span className="font-bold text-green-400">${(durationHours * 0.45).toFixed(2)} USD</span>
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsDeployModalOpen(false)}
                                    className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-xs font-bold shadow-lg"
                                >
                                    Confirm & Deploy
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Marketplace;
