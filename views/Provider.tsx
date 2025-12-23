import React from 'react';
import './Provider.css';

const Provider: React.FC = () => {
    return (
        <div className="provider-container">
            <h1 className="text-3xl font-bold mb-6 text-primary">Compute Provider</h1>
            <div className="bg-surface p-6 rounded-xl border border-white/10">
                <p className="text-gray-300">
                    Share your idle GPU resources and earn HNH tokens.
                    <br />
                    Provider dashboard coming soon.
                </p>
                <div className="mt-4">
                    <button className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg transition-colors">
                        Register as Provider
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Provider;
