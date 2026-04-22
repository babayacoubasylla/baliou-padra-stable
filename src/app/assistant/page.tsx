"use client";
import React, { useState, useEffect, useRef } from 'react';

export default function AssistantPage() {
    const [messages, setMessages] = useState([{ role: 'ai', content: 'Komakhou ! Je suis l’assistant Baliou Padra. Posez-moi une question.' }]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        const userMsg = input;
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setInput("");
        setLoading(true);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userMsg }),
            });

            const data = await response.json();
            setMessages(prev => [...prev, { role: 'ai', content: data.text || data.error }]);
        } catch (error) {
            setMessages(prev => [...prev, { role: 'ai', content: "Erreur de connexion." }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-white p-4 md:p-12 text-black">
            <div className="max-w-4xl mx-auto flex flex-col h-[80vh]">
                <h1 className="text-4xl font-black text-blue-700 uppercase italic mb-6">Assistant IA</h1>

                <div className="flex-grow bg-slate-50 border-4 border-black rounded-[2.5rem] overflow-y-auto p-6 space-y-4 shadow-xl">
                    {messages.map((m, i) => (
                        <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] p-4 border-2 border-black font-bold rounded-2xl ${m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white'}`}>
                                {m.content}
                            </div>
                        </div>
                    ))}
                    {loading && <p className="animate-pulse font-black text-xs">L'IA RÉFLÉCHIT...</p>}
                    <div ref={scrollRef} />
                </div>

                <form onSubmit={handleSend} className="mt-6 flex gap-4">
                    <input type="text" value={input} onChange={e => setInput(e.target.value)} placeholder="Votre question..."
                        className="flex-grow p-4 border-4 border-black rounded-2xl font-bold outline-none" />
                    <button type="submit" className="bg-black text-white px-8 rounded-2xl font-black uppercase border-4 border-black hover:bg-blue-700 transition-all">Envoyer</button>
                </form>
            </div>
        </main>
    );
}