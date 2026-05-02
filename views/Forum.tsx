import React, { useState } from 'react';
import { MessageSquare, Search, ThumbsUp, MessageCircle, Share2, Plus, Flag, User, Clock, Trash2, Pin } from 'lucide-react';
import { DynamicDiv } from '../components/DynamicDiv';
import { getCurrentUser } from '../services/authService';
import { API_BASE_URL } from '../services/apiClient';

interface Thread {
    id: string;
    title: string;
    author: string;
    avatar: string; // URL or placeholder color
    category: 'General' | 'Support' | 'Announcements' | 'Feature Request';
    replies: number;
    likes: number;
    timestamp: string;
    content: string; // Preview
    isPinned?: boolean;
}

const Forum: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('All');
    const [threads, setThreads] = useState<Thread[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [newThreadData, setNewThreadData] = useState({ title: '', content: '', category: 'General' });
    const user = getCurrentUser();

    // Fetch Real Threads
    const fetchThreads = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/public/forum`);
            if (res.ok) {
                const data = await res.json();
                setThreads(data);
            }
        } catch (e) { console.error("Forum offline"); }
    };

    React.useEffect(() => {
        fetchThreads();
        const interval = setInterval(fetchThreads, 10000); // Live updates
        return () => clearInterval(interval);
    }, []);

    const handleCreate = async () => {
        if (!newThreadData.title || !newThreadData.content) return;
        try {
            await fetch(`${API_BASE_URL}/api/public/forum`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...newThreadData,
                    author: user?.username || 'Miner'
                })
            });
            setIsCreating(false);
            setNewThreadData({ title: '', content: '', category: 'General' });
            fetchThreads(); // Refresh
        } catch (e) { alert("Failed to post"); }
    };

    const handleDelete = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (confirm('Admin Action: Are you sure you want to delete this thread?')) {
            alert(`Thread ${id} deleted.`);
        }
    };

    const handlePin = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        alert(`Thread ${id} pinned status toggled.`);
    };

    const categories = ['All', 'Announcements', 'General', 'Support', 'Feature Request'];

    const filteredThreads = threads.filter(thread => {
        const matchesSearch = thread.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            thread.content.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === 'All' || thread.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="max-w-6xl mx-auto space-y-6">

            {/* Header & Search */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                        <MessageSquare className="text-primary" /> Community Forum
                    </h1>
                    <p className="text-muted">Connect, learn, and share with other compute providers.</p>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
                        <input
                            type="text"
                            placeholder="Search topics..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
                        />
                    </div>
                    <button
                        onClick={() => setIsCreating(!isCreating)}
                        className="bg-primary text-black px-4 py-2 rounded-lg text-sm font-bold hover:bg-primary-hover flex items-center gap-2 whitespace-nowrap">
                        <Plus size={16} /> {isCreating ? 'Cancel' : 'New Topic'}
                    </button>
                </div>
            </div>

            {/* Create Post Form */}
            {isCreating && (
                <div className="bg-surface border border-white/10 rounded-xl p-4 space-y-4 animate-in fade-in slide-in-from-top-2">
                    <input
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white"
                        placeholder="Title"
                        value={newThreadData.title}
                        onChange={e => setNewThreadData({ ...newThreadData, title: e.target.value })}
                    />
                    <textarea
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white h-24"
                        placeholder="Content..."
                        value={newThreadData.content}
                        onChange={e => setNewThreadData({ ...newThreadData, content: e.target.value })}
                    />
                    <div className="flex justify-between">
                        <select
                            aria-label="Select Category"
                            className="bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white"
                            value={newThreadData.category}
                            onChange={e => setNewThreadData({ ...newThreadData, category: e.target.value })}
                        >
                            {categories.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <button onClick={handleCreate} className="bg-green-500 text-black px-6 py-2 rounded-lg font-bold">Post</button>
                    </div>
                </div>
            )}

            {/* Categories */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {categories.map(cat => (
                    <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${selectedCategory === cat
                            ? 'bg-white text-black'
                            : 'bg-white/5 text-muted hover:bg-white/10 hover:text-white'
                            }`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* Thread List */}
            <div className="space-y-4">
                {filteredThreads.map(thread => (
                    <div key={thread.id} className="bg-surface border border-white/10 rounded-xl p-6 hover:border-white/20 transition-all cursor-pointer group relative">

                        {/* Admin Controls */}
                        {user?.role === 'ADMIN' && (
                            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                <button
                                    onClick={(e) => handlePin(e, thread.id)}
                                    className={`p-2 rounded-lg ${thread.isPinned ? 'text-primary bg-primary/10' : 'text-muted hover:text-white hover:bg-white/10'}`}
                                    title="Pin Thread"
                                >
                                    <Pin size={16} />
                                </button>
                                <button
                                    onClick={(e) => handleDelete(e, thread.id)}
                                    className="p-2 rounded-lg text-red-500 hover:bg-red-500/10 hover:text-red-400"
                                    title="Delete Thread"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        )}

                        <div className="flex justify-between items-start gap-4">

                            {/* Main Content */}
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    {thread.isPinned && (
                                        <span className="bg-primary/20 text-primary text-[10px] font-bold px-2 py-0.5 rounded uppercase flex items-center gap-1">
                                            <Flag size={10} fill="currentColor" /> Pinned
                                        </span>
                                    )}
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border border-white/10 ${thread.category === 'Announcements' ? 'text-yellow-400 bg-yellow-400/10' :
                                        thread.category === 'Support' ? 'text-red-400 bg-red-400/10' :
                                            'text-blue-400 bg-blue-400/10'
                                        }`}>
                                        {thread.category}
                                    </span>
                                    <span className="text-muted text-xs flex items-center gap-1">
                                        <Clock size={12} /> {thread.timestamp}
                                    </span>
                                </div>

                                <h3 className="text-lg font-bold text-white group-hover:text-primary transition-colors mb-1">
                                    {thread.title}
                                </h3>
                                <p className="text-muted text-sm line-clamp-2 mb-4">
                                    {thread.content}
                                </p>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${thread.avatar}`}>
                                            <User size={14} className="text-white" />
                                        </div>
                                        <span className="text-sm text-gray-300 font-medium">{thread.author}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Stats */}
                            <div className="flex flex-col gap-2 min-w-[60px] text-right">
                                <div className="flex items-center justify-end gap-1 text-muted group-hover:text-white transition-colors">
                                    <span className="font-mono font-bold text-sm">{thread.likes}</span>
                                    <ThumbsUp size={14} />
                                </div>
                                <div className="flex items-center justify-end gap-1 text-muted group-hover:text-white transition-colors">
                                    <span className="font-mono font-bold text-sm">{thread.replies}</span>
                                    <MessageCircle size={14} />
                                </div>
                            </div>

                        </div>
                    </div>
                ))}

                {filteredThreads.length === 0 && (
                    <div className="text-center py-12">
                        <p className="text-muted">No topics found matching your criteria. Be the first to post!</p>
                        <button
                            onClick={() => { setSearchTerm(''); setSelectedCategory('All'); }}
                            className="text-primary hover:underline text-sm mt-2"
                        >
                            Clear filters
                        </button>
                    </div>
                )}
            </div>

        </div>
    );
};

export default Forum;
