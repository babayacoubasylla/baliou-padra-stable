"use client";
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function DashboardHub() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
    const router = useRouter();

    useEffect(() => {
        let timeoutId: NodeJS.Timeout;

        const checkAuthAndRedirect = async () => {
            try {
                // Sécurité : timeout 5 secondes
                timeoutId = setTimeout(() => {
                    setError("Délai d'attente dépassé. Vérifiez votre connexion.");
                    setLoading(false);
                }, 5000);

                const { data: { session } } = await supabase.auth.getSession();

                if (!session) {
                    clearTimeout(timeoutId);
                    router.push('/login');
                    return;
                }

                const { data: profileData, error: profileError } = await supabase
                    .from('membres')
                    .select('role, generation, nom_complet')
                    .eq('user_id', session.user.id)
                    .maybeSingle();

                clearTimeout(timeoutId);

                if (profileError) throw profileError;

                setProfile(profileData);
                setUser(session.user);

                const role = profileData?.role || 'membre';
                console.log("HUB - Rôle détecté:", role, "| Email:", session.user.email);

                // ─── REDIRECTIONS PAR RÔLE ───
                if (role === 'super_admin') {
                    router.push('/admin-systeme');
                } else if (role === 'baliou_padra') {
                    router.push('/admin-central');
                } else if (role === 'agent_civil') {
                    router.push('/etat-civil');
                } else if (role === 'agent_rh') {
                    router.push('/annuaire-pro');
                } else if (role === 'responsable_bd') {
                    router.push('/gestion-base-donnees'); // ← VOTRE PAGE
                } else if (role === 'chef_gen') {
                    router.push('/chef-gen/dashboard');
                } else if (role === 'tresorier') {
                    router.push('/tresorier/dashboard');
                } else if (role === 'comite_com_gen') {
                    router.push('/comite-com-gen/dashboard');
                } else if (role === 'comite_com_central') {
                    router.push('/admin-central/communication');
                } else {
                    // Membre simple : reste sur le dashboard
                    setLoading(false);
                }

            } catch (err: any) {
                clearTimeout(timeoutId);
                console.error(err);
                setError(err.message || "Erreur de chargement.");
                setLoading(false);
            }
        };

        checkAuthAndRedirect();
        return () => clearTimeout(timeoutId);
    }, [router]);

    if (error) return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
            <div className="bg-red-50 border-4 border-red-600 p-10 rounded-[2.5rem] shadow-2xl max-w-md text-center">
                <div className="text-6xl mb-6">⚠️</div>
                <h1 className="text-2xl font-black text-red-600 uppercase mb-4">Erreur</h1>
                <p className="font-bold text-gray-700">{error}</p>
                <div className="flex gap-4 justify-center mt-8">
                    <button onClick={() => window.location.reload()}
                        className="px-6 py-3 bg-black text-white font-black rounded-xl hover:bg-red-700 transition-all">Réessayer</button>
                    <button onClick={() => router.push('/login')}
                        className="px-6 py-3 border-2 border-black font-black rounded-xl hover:bg-gray-100 transition-all">Connexion</button>
                </div>
            </div>
        </div>
    );

    if (loading) return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[#146332] mb-6"></div>
            <p className="font-black uppercase text-[#146332] tracking-wider">Analyse des accès Baliou Padra...</p>
        </div>
    );

    // ─── DASHBOARD MEMBRE SIMPLE ───
    return (
        <main className="min-h-screen bg-slate-50 p-4 md:p-12 text-black">
            <div className="max-w-5xl mx-auto">
                <header className="mb-12 border-b-4 border-black pb-6">
                    <h1 className="text-4xl font-black text-[#146332] uppercase italic">Tableau de Bord</h1>
                    <p className="font-bold text-gray-500 uppercase text-xs tracking-widest mt-2">
                        Bienvenue {profile?.nom_complet || user?.email?.split('@')[0]}{profile?.generation ? ` • ${profile.generation}` : ''}
                    </p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Link href="/profil" className="bg-white border-4 border-black rounded-2xl p-6 hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,0.1)] transition-all">
                        <div className="text-4xl mb-3">👤</div>
                        <h2 className="font-black text-xl">Mon Profil</h2>
                        <p className="text-sm text-gray-600 mt-1">Consulter et modifier mes informations</p>
                    </Link>

                    <Link href="/annuaire" className="bg-white border-4 border-black rounded-2xl p-6 hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,0.1)] transition-all">
                        <div className="text-4xl mb-3">📇</div>
                        <h2 className="font-black text-xl">Annuaire</h2>
                        <p className="text-sm text-gray-600 mt-1">Voir les membres de la communauté</p>
                    </Link>

                    <Link href="/bibliotheque" className="bg-white border-4 border-black rounded-2xl p-6 hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,0.1)] transition-all">
                        <div className="text-4xl mb-3">📚</div>
                        <h2 className="font-black text-xl">Bibliothèque</h2>
                        <p className="text-sm text-gray-600 mt-1">Accès aux documents et archives</p>
                    </Link>

                    <Link href="/histoire" className="bg-white border-4 border-black rounded-2xl p-6 hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,0.1)] transition-all">
                        <div className="text-4xl mb-3">📜</div>
                        <h2 className="font-black text-xl">Histoire</h2>
                        <p className="text-sm text-gray-600 mt-1">Découvrir l'histoire de la communauté</p>
                    </Link>

                    <Link href="/finances" className="bg-white border-4 border-black rounded-2xl p-6 hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,0.1)] transition-all">
                        <div className="text-4xl mb-3">💰</div>
                        <h2 className="font-black text-xl">Mes Finances</h2>
                        <p className="text-sm text-gray-600 mt-1">Suivi de mes cotisations</p>
                    </Link>
                </div>
            </div>
        </main>
    );
}