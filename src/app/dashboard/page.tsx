"use client";
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function DashboardHub() {
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return router.push('/login');

            const { data: p } = await supabase.from('membres').select('*').eq('user_id', user.id).maybeSingle();
            setProfile(p);
            setLoading(false);
        };
        checkAuth();
    }, []);

    if (loading) return <div className="min-h-screen bg-white flex items-center justify-center font-black animate-pulse uppercase">Baliou Padra - Chargement...</div>;

    return (
        <main className="min-h-screen bg-slate-50 p-4 md:p-12 text-black">
            <style jsx global>{`
                @keyframes focys-scroll {
                    0% { transform: translateX(100%); }
                    100% { transform: translateX(-100%); }
                }
                .animate-focys-scroll {
                    animation: focys-scroll 20s linear infinite;
                    white-space: nowrap;
                }
                .bp-card {
                    background: white;
                    border: 4px solid black;
                    border-radius: 2.5rem;
                    box-shadow: 10px 10px 0px 0px rgba(0,0,0,1);
                    transition: all 0.2s ease;
                }
                .bp-card:hover {
                    transform: translate(-4px, -4px);
                    box-shadow: 14px 14px 0px 0px rgba(0,0,0,1);
                }
                .bp-button-blue {
                    background-color: #0044ff;
                    color: white;
                    font-weight: 900;
                    padding: 1rem;
                    border-radius: 1rem;
                    border: 2px solid black;
                    text-transform: uppercase;
                    font-size: 0.75rem;
                    transition: all 0.2s ease;
                }
                .bp-button-blue:hover {
                    background-color: black;
                    transform: scale(0.98);
                }
                .bp-button-green {
                    background-color: #146332;
                    color: white;
                    font-weight: 900;
                    padding: 1rem;
                    border-radius: 1rem;
                    border: 2px solid black;
                    text-transform: uppercase;
                    font-size: 0.75rem;
                    transition: all 0.2s ease;
                }
                .bp-button-green:hover {
                    background-color: black;
                    transform: scale(0.98);
                }
            `}</style>

            <div className="max-w-6xl mx-auto">

                {/* BIENVENUE SECTION */}
                <header className="mb-12 border-b-8 border-black pb-8 flex flex-col md:flex-row justify-between items-start md:items-center">
                    <div>
                        <h1 className="text-5xl font-black uppercase italic tracking-tighter text-[#146332]">Komakhou ,</h1>
                        <p className="text-2xl font-black mt-1 uppercase">{profile?.nom_complet}</p>
                        <p className="text-blue-700 font-bold uppercase text-xs mt-2 underline italic">{profile?.generation}</p>
                    </div>
                    <div className="mt-4 md:mt-0 flex gap-4">
                        <div className="bg-black text-white px-6 py-3 border-4 border-black rounded-2xl font-black text-xs uppercase tracking-widest">
                            Rôle : {profile?.role}
                        </div>
                    </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">

                    {/* BLOC 1 : MON PROFIL (Accès pour tous) */}
                    <div className="bp-card p-8 flex flex-col items-center text-center">
                        <span className="text-5xl mb-4">👤</span>
                        <h3 className="font-black text-xl uppercase mb-2">Mon Profil</h3>
                        <p className="text-sm font-bold text-gray-500 mb-8">Gérez vos informations et consultez vos reçus de cotisations.</p>
                        <button onClick={() => router.push('/profil')} className="bp-button-blue w-full">ACCÉDER</button>
                    </div>

                    {/* BLOC 2 : VIE SPIRITUELLE (Accès pour tous) */}
                    <div className="bp-card p-8 flex flex-col items-center text-center">
                        <span className="text-5xl mb-4">📖</span>
                        <h3 className="font-black text-xl uppercase mb-2">Vie Spirituelle</h3>
                        <p className="text-sm font-bold text-gray-500 mb-8">Agenda des Haradat, Zikhr et enseignements du Cheikh.</p>
                        <button onClick={() => router.push('/actualites')} className="bp-button-green w-full">CONSULTER</button>
                    </div>

                    {/* BLOC 3 : MA GÉNÉRATION (Chefs, Trésoriers, Adjoints, Bureau Central) */}
                    {(profile?.role === 'chef_gen' || profile?.role === 'tresorier_gen' || profile?.role === 'adjoint_gen' || profile?.role === 'baliou_padra' || profile?.role === 'super_admin') && (
                        <div className="bp-card p-8 flex flex-col items-center text-center bg-yellow-50">
                            <span className="text-5xl mb-4">🏘️</span>
                            <h3 className="font-black text-xl uppercase mb-2 text-[#146332]">Ma Génération</h3>
                            <p className="text-sm font-bold text-gray-500 mb-8">Gestion des membres et de la caisse de votre famille.</p>
                            <button onClick={() => router.push('/generation')} className="bp-button-blue w-full bg-black text-white border-black">GÉRER</button>
                        </div>
                    )}

                    {/* BLOC 4 : CONSEIL CENTRAL (Uniquement Baliou Padra) */}
                    {(profile?.role === 'baliou_padra' || profile?.role === 'super_admin') && (
                        <div className="bp-card p-8 flex flex-col items-center text-center bg-blue-50">
                            <span className="text-5xl mb-4">⚖️</span>
                            <h3 className="font-black text-xl uppercase mb-2 text-blue-800">Conseil Central</h3>
                            <p className="text-sm font-bold text-gray-500 mb-8">Supervision globale des budgets et des chefs de générations.</p>
                            <button onClick={() => router.push('/admin-central')} className="bp-button-blue w-full">ENTRER</button>
                        </div>
                    )}

                    {/* BLOC 5 : BUREAU CENTRAL (Uniquement Baliou Padra) */}
                    {(profile?.role === 'baliou_padra' || profile?.role === 'super_admin') && (
                        <div className="bp-card p-8 flex flex-col items-center text-center bg-purple-50">
                            <span className="text-5xl mb-4">🏛️</span>
                            <h3 className="font-black text-xl uppercase mb-2 text-purple-800">Bureau Central</h3>
                            <p className="text-sm font-bold text-gray-500 mb-8">Gestion complète des membres et des comités.</p>
                            <button onClick={() => router.push('/admin-systeme')} className="bp-button-blue w-full bg-purple-700 hover:bg-black">ACCÉDER</button>
                        </div>
                    )}

                    {/* BLOC 6 : RÉSEAU PRO (Accès pour tous) */}
                    <div className="bp-card p-8 flex flex-col items-center text-center">
                        <span className="text-5xl mb-4">🤝</span>
                        <h3 className="font-black text-xl uppercase mb-2">Réseau Pro</h3>
                        <p className="text-sm font-bold text-gray-500 mb-8">Annuaire professionnel des membres et opportunités.</p>
                        <button onClick={() => router.push('/annuaire-pro')} className="bp-button-green w-full">DÉCOUVRIR</button>
                    </div>

                    {/* BLOC 7 : BIBLIOTHÈQUE (Accès pour tous) */}
                    <div className="bp-card p-8 flex flex-col items-center text-center">
                        <span className="text-5xl mb-4">📚</span>
                        <h3 className="font-black text-xl uppercase mb-2">Bibliothèque</h3>
                        <p className="text-sm font-bold text-gray-500 mb-8">Ressources, documents et archives de la communauté.</p>
                        <button onClick={() => router.push('/bibliotheque')} className="bp-button-blue w-full">CONSULTER</button>
                    </div>

                    {/* BLOC 8 : ASSISTANT IA (Accès pour tous) */}
                    <div className="bp-card p-8 flex flex-col items-center text-center bg-gradient-to-r from-yellow-50 to-orange-50">
                        <span className="text-5xl mb-4">🤖</span>
                        <h3 className="font-black text-xl uppercase mb-2 text-orange-700">Assistant IA</h3>
                        <p className="text-sm font-bold text-gray-500 mb-8">Posez vos questions sur Baliou Padra, l'histoire et les traditions.</p>
                        <button onClick={() => router.push('/assistant')} className="bp-button-blue w-full bg-orange-600 hover:bg-black">DISCUTER</button>
                    </div>

                    {/* BLOC 9 : FINANCES (Uniquement membres connectés) */}
                    {profile && (
                        <div className="bp-card p-8 flex flex-col items-center text-center">
                            <span className="text-5xl mb-4">💰</span>
                            <h3 className="font-black text-xl uppercase mb-2">Finances</h3>
                            <p className="text-sm font-bold text-gray-500 mb-8">Suivi des cotisations et contributions.</p>
                            <button onClick={() => router.push('/finances')} className="bp-button-green w-full">VOIR</button>
                        </div>
                    )}
                </div>

                {/* BANDEAU SPIRITUEL */}
                <div className="mt-20 bg-blue-700 py-6 rounded-[2.5rem] border-4 border-black overflow-hidden relative shadow-2xl">
                    <div className="animate-focys-scroll">
                        <span className="text-white font-black text-2xl tracking-[0.3em] uppercase px-4 inline-block italic">
                            ALLAH KANE — GNAMARIYE BATIYE — KABEHI TOKHË. BAH NAWARY — ALLAH KANE — GNAMARIYE BATIYE — KABEHI TOKHË. BAH NAWARY
                        </span>
                    </div>
                </div>
            </div>
        </main>
    );
}