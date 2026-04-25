"use client";
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function DashboardHub() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        let timeoutId: NodeJS.Timeout;

        const checkRedirect = async () => {
            try {
                // Timeout de 5 secondes maximum pour éviter le blocage infini
                timeoutId = setTimeout(() => {
                    setError("Délai d'attente dépassé (5 secondes). Vérifiez votre connexion réseau.");
                    setLoading(false);
                }, 5000);

                const { data: { user } } = await supabase.auth.getUser();

                if (!user) {
                    clearTimeout(timeoutId);
                    router.push('/login');
                    return;
                }

                const { data: p, error: dbError } = await supabase
                    .from('membres')
                    .select('role')
                    .eq('user_id', user.id)
                    .maybeSingle();

                clearTimeout(timeoutId);

                if (dbError) throw dbError;

                if (p) {
                    // REDIRECTION FORCEE SELON LE ROLE
                    if (p.role === 'agent_civil') {
                        router.push('/etat-civil');
                    } else if (p.role === 'agent_rh') {
                        router.push('/annuaire');
                    } else if (p.role === 'super_admin') {
                        router.push('/admin-systeme');
                    } else if (p.role === 'baliou_padra') {
                        router.push('/admin-central');
                    } else if (p.role === 'chef_generation') {
                        router.push('/admin-central');
                    } else if (p.role === 'tresorier') {
                        router.push('/tresorerie');
                    } else {
                        // Si c'est un membre simple, il reste ici
                        setLoading(false);
                    }
                } else {
                    setError("Profil membre introuvable dans la base de données.");
                    setLoading(false);
                }
            } catch (err: any) {
                clearTimeout(timeoutId);
                setError(err.message || "Une erreur est survenue lors de la vérification.");
                setLoading(false);
            }
        };

        checkRedirect();

        return () => {
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [router]);

    // Affichage de l'erreur avec bouton de réessai
    if (error) return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
            <div className="bg-red-50 border-4 border-red-600 p-10 rounded-[2.5rem] shadow-2xl max-w-md">
                <div className="text-6xl mb-6">⏰</div>
                <h1 className="text-2xl font-black text-red-600 uppercase mb-4">Erreur de Liaison</h1>
                <p className="mt-2 font-bold text-gray-700">{error}</p>
                <p className="mt-4 text-sm text-gray-500">Vérifiez votre connexion internet et réessayez.</p>
                <div className="flex gap-4 justify-center mt-8">
                    <button
                        onClick={() => window.location.reload()}
                        className="px-6 py-3 bg-black text-white font-black rounded-xl hover:bg-red-700 transition-all active:scale-95"
                    >
                        Réessayer
                    </button>
                    <button
                        onClick={() => router.push('/login')}
                        className="px-6 py-3 border-2 border-black font-black rounded-xl hover:bg-gray-100 transition-all active:scale-95"
                    >
                        Retour à la connexion
                    </button>
                </div>
            </div>
        </div>
    );

    // Affichage du chargement avec spinner
    if (loading) return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center font-black uppercase text-[#146332]">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[#146332] mb-6"></div>
            <p className="text-lg tracking-wider">Analyse des accès Baliou Padra...</p>
            <p className="text-xs text-gray-400 mt-2">Vérification de vos droits</p>
        </div>
    );

    // Dashboard pour membres simples
    return (
        <main className="min-h-screen bg-slate-50 p-4 md:p-12 flex items-center justify-center">
            <style jsx global>{`
                ::selection {
                    background-color: black !important;
                    color: white !important;
                }
                ::-moz-selection {
                    background-color: black !important;
                    color: white !important;
                }
            `}</style>

            <div className="max-w-4xl mx-auto">
                <div className="bg-white border-4 border-black p-10 rounded-[2.5rem] shadow-[15px_15px_0px_0px_rgba(0,0,0,1)] text-center">
                    <div className="text-7xl mb-6">🏠</div>
                    <h1 className="text-4xl font-black uppercase italic text-[#146332]">Baliou Padra</h1>
                    <p className="mt-4 text-xl font-bold uppercase">Espace Membre</p>
                    <p className="mt-2 text-gray-600">Bienvenue dans votre espace personnel.</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
                        <button
                            onClick={() => router.push('/profil')}
                            className="px-8 py-4 bg-[#0044ff] text-white font-black rounded-2xl border-2 border-black shadow-xl hover:bg-black transition-all active:scale-95"
                        >
                            👤 Voir mon profil
                        </button>
                        <button
                            onClick={() => router.push('/actualites')}
                            className="px-8 py-4 bg-[#146332] text-white font-black rounded-2xl border-2 border-black shadow-xl hover:bg-black transition-all active:scale-95"
                        >
                            📖 Vie Spirituelle
                        </button>
                        <button
                            onClick={() => router.push('/annuaire-pro')}
                            className="px-8 py-4 bg-orange-600 text-white font-black rounded-2xl border-2 border-black shadow-xl hover:bg-black transition-all active:scale-95"
                        >
                            🤝 Réseau Pro
                        </button>
                        <button
                            onClick={() => router.push('/bibliotheque')}
                            className="px-8 py-4 bg-purple-600 text-white font-black rounded-2xl border-2 border-black shadow-xl hover:bg-black transition-all active:scale-95"
                        >
                            📚 Bibliothèque
                        </button>
                    </div>

                    <div className="mt-10 pt-6 border-t-2 border-gray-200">
                        <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
                            ALLAH KANE — GNAMARIYE BATIYE — KABEHI TOKHË
                        </p>
                    </div>
                </div>
            </div>
        </main>
    );
}