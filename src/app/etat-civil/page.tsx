"use client";
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function EtatCivilDashboard() {
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            router.push('/login');
            return;
        }

        const { data: profile } = await supabase
            .from('membres')
            .select('role')
            .eq('user_id', session.user.id)
            .maybeSingle();

        if (profile?.role !== 'agent_civil' && profile?.role !== 'super_admin') {
            router.push('/dashboard');
            return;
        }

        setLoading(false);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <p className="text-2xl font-black text-black">Chargement...</p>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-slate-50 p-4 md:p-12 text-black font-sans">
            <div className="max-w-6xl mx-auto">
                <header className="mb-12 border-b-8 border-black pb-4">
                    <h1 className="text-5xl font-black text-orange-600 uppercase italic tracking-tighter">
                        Registre Civil
                    </h1>
                    <p className="font-bold text-sm mt-2">GESTION DES NAISSANCES, MARIAGES ET DÉCÈS</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Carte Naissances */}
                    <Link href="/etat-civil/naissances">
                        <div className="bg-white border-4 border-black p-8 rounded-[2.5rem] shadow-[10px_10px_0px_0px_rgba(255,102,0,1)] text-center cursor-pointer hover:scale-105 transition-all">
                            <span className="text-6xl">👶</span>
                            <h2 className="text-2xl font-black uppercase mt-4">Naissances</h2>
                            <p className="text-xs font-bold text-gray-400 mt-2 mb-6">Enregistrer un nouvel enfant</p>
                            <div className="w-full py-4 bg-black text-white font-black rounded-xl text-[10px] uppercase text-center">
                                OUVRIR LE REGISTRE
                            </div>
                        </div>
                    </Link>

                    {/* Carte Mariages */}
                    <Link href="/etat-civil/mariages">
                        <div className="bg-white border-4 border-black p-8 rounded-[2.5rem] shadow-[10px_10px_0px_0px_rgba(0,102,255,1)] text-center cursor-pointer hover:scale-105 transition-all">
                            <span className="text-6xl">💍</span>
                            <h2 className="text-2xl font-black uppercase mt-4">Mariages</h2>
                            <p className="text-xs font-bold text-gray-400 mt-2 mb-6">Enregistrer une union</p>
                            <div className="w-full py-4 bg-black text-white font-black rounded-xl text-[10px] uppercase text-center">
                                OUVRIR LE REGISTRE
                            </div>
                        </div>
                    </Link>

                    {/* Carte Décès */}
                    <Link href="/etat-civil/deces">
                        <div className="bg-white border-4 border-black p-8 rounded-[2.5rem] shadow-[10px_10px_0px_0px_rgba(255,0,0,1)] text-center cursor-pointer hover:scale-105 transition-all">
                            <span className="text-6xl">🕊️</span>
                            <h2 className="text-2xl font-black uppercase mt-4">Décès</h2>
                            <p className="text-xs font-bold text-gray-400 mt-2 mb-6">Mettre à jour le registre</p>
                            <div className="w-full py-4 bg-black text-white font-black rounded-xl text-[10px] uppercase text-center">
                                DÉCLARER
                            </div>
                        </div>
                    </Link>
                </div>

                <div className="mt-12 bg-black text-white p-10 rounded-[3rem] flex flex-col md:flex-row justify-between items-center gap-6 shadow-2xl border-4 border-orange-600">
                    <div className="text-center md:text-left">
                        <h3 className="text-3xl font-black uppercase italic">Généalogie de la Lignée</h3>
                        <p className="font-bold text-gray-400 uppercase text-xs mt-2">Consulter l'arbre des familles Baliou Padra</p>
                    </div>
                    <Link href="/etat-civil/arbre" className="bg-orange-600 text-white px-10 py-5 rounded-2xl font-black uppercase border-4 border-black shadow-[6px_6px_0px_0px_rgba(255,255,255,0.3)] hover:scale-105 transition-all">
                        VOIR L'ARBRE →
                    </Link>
                </div>
            </div>
        </main>
    );
}