import React, { useState } from 'react';
import { MessageSquare, Search, ThumbsUp, MessageCircle, Share2, Plus, Flag, User, Clock, Trash2, Pin } from 'lucide-react';
import { DynamicDiv } from '../components/DynamicDiv';
import { getCurrentUser } from '../services/authService';

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

const MOCK_THREADS: Thread[] = [
    {
        id: '1',
        title: 'Welcome to the HashNHedge Community!',
        author: 'Admin',
        avatar: 'bg-primary',
        category: 'Announcements',
        replies: 45,
        likes: 128,
        timestamp: '2h ago',
        content: 'We are excited to launch our new community forum. Please read the rules before posting...',
        isPinned: true
    },
    {
        id: '2',
        title: 'How to optimize RTX 4090 for maximum RNDR yield?',
        author: 'MinerMike',
        avatar: 'bg-purple-500',
        category: 'General',
        replies: 12,
        likes: 34,
        timestamp: '5h ago',
        content: 'I have been tweaking my OC settings but only getting 85% efficiency. Anyone have a stable config?'
    },
    {
        id: '3',
        title: '[Feature Request] Mobile App Dark Mode',
        author: 'DarkThemeLover',
        avatar: 'bg-gray-700',
        category: 'Feature Request',
        replies: 8,
        likes: 56,
        timestamp: '1d ago',
        content: 'My eyes hurt at night checking my miner stats. Please add dark mode to the mobile app!'
    },
    {
        id: '4',
        title: 'Worker showing offline but still hashing?',
        author: 'NewbieMiner',
        avatar: 'bg-blue-500',
        category: 'Support',
        replies: 3,
        likes: 2,
        timestamp: '3d ago',
        content: 'My dashboard says offline but the console shows accepted shares. Is this a bug?'
    }
];

const Forum: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('All');

    const categories = ['All', 'Announcements', 'General', 'Support', 'Feature Request'];

    const filteredThreads = MOCK_THREADS.filter(thread => {
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
                    <button className="bg-primary text-black px-4 py-2 rounded-lg text-sm font-bold hover:bg-primary-hover flex items-center gap-2 whitespace-nowrap">
                        <Plus size={16} /> New Topic
                    </button>
                </div>
            </div>

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
                    <div key={thread.id} className="bg-surface border border-white/10 rounded-xl p-6 hover:border-white/20 transition-all cursor-pointer group">
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
                        <p className="text-muted">No topics found matching your criteria.</p>
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
