"use client";
import React, { useState, useEffect, useRef } from 'react';

export default function FloatingAI() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'ai', content: 'Komakhou ! Je suis l\'assistant Baliou Padra. Comment puis-je vous aider ?' }
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll vers le bas lors de l'arrivée de nouveaux messages
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isOpen]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        const userMsg = input;
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setInput("");
        setLoading(true);

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userMsg }),
            });
            const data = await res.json();
            setMessages(prev => [...prev, { role: 'ai', content: data.text || data.error }]);
        } catch (err) {
            setMessages(prev => [...prev, { role: 'ai', content: "Erreur de connexion. Vérifiez votre réseau." }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-[100] font-sans">
            {isOpen && (
                <div className="absolute bottom-20 right-0 w-[320px] md:w-[400px] h-[550px] bg-white border-4 border-black rounded-[2.5rem] shadow-[15px_15px_0px_0px_rgba(0,0,0,1)] flex flex-col overflow-hidden animate-in slide-in-from-bottom-10">

                    {/* Header - Vert foncé Baliou Padra */}
                    <div className="bg-[#146332] p-5 border-b-4 border-black flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">🤖</span>
                            <h3 className="text-white font-black uppercase text-xs tracking-widest">Assistant BP</h3>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="bg-black text-white w-10 h-10 rounded-full font-black border-2 border-white hover:bg-red-600 transition-colors">X</button>
                    </div>

                    {/* Zone des Messages */}
                    <div ref={scrollRef} className="flex-grow p-5 overflow-y-auto space-y-6 bg-white">
                        {messages.map((m, i) => (
                            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] p-4 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${m.role === 'user' ? 'bg-[#39ff14] text-black rounded-l-2xl rounded-tr-2xl' : 'bg-slate-50 text-black rounded-r-2xl rounded-tl-2xl'}`}>

                                    {/* Étiquette du rôle (Force Noir sur Blanc) */}
                                    <p className="text-[10px] font-black uppercase mb-1 text-black border-b border-black/20 pb-1">
                                        {m.role === 'user' ? 'VOUS' : 'ASSISTANT BALIOU PADRA'}
                                    </p>

                                    {/* Contenu du message (Force Noir et Gras) */}
                                    <p className="text-sm font-black leading-relaxed text-black">
                                        {m.content}
                                    </p>
                                </div>
                            </div>
                        ))}

                        {loading && (
                            <div className="text-[10px] font-black animate-pulse uppercase text-blue-700 bg-blue-50 px-4 py-2 border-2 border-black inline-block rounded-full">
                                L'IA analyse les archives...
                            </div>
                        )}
                    </div>

                    {/* Formulaire de saisie - Forcé en Noir sur Blanc */}
                    <form onSubmit={handleSend} className="p-4 bg-white border-t-4 border-black flex flex-col gap-3">
                        <input
                            type="text"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            placeholder="Écrivez votre question ici..."
                            autoComplete="off"
                            className="w-full p-4 border-4 border-black rounded-2xl font-black text-black bg-white outline-none focus:bg-yellow-50 placeholder:text-black/40"
                        />
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-black text-white py-4 rounded-xl font-black uppercase text-xs border-2 border-black hover:bg-[#146332] shadow-md transition-all active:scale-95 disabled:opacity-50"
                        >
                            {loading ? "RÉFLEXION..." : "ENVOYER LA QUESTION"}
                        </button>
                    </form>
                </div>
            )}

            {/* BOUTON FLOTTANT (L'icône) */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-16 h-16 rounded-full border-4 border-black flex items-center justify-center text-3xl shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] transition-all hover:scale-110 active:scale-95 ${isOpen ? 'bg-black' : 'bg-[#39ff14]'}`}
            >
                {isOpen ? "❌" : "🤖"}
                {!isOpen && (
                    <span className="absolute -top-3 -left-3 bg-red-600 text-white text-[10px] font-black px-3 py-1 rounded-full border-2 border-black animate-bounce shadow-lg">
                        AIDE IA
                    </span>
                )}
            </button>
        </div>
    );
}