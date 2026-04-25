"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Calendar, User, ArrowLeft, RefreshCw, Megaphone, Eye, Globe, Lock } from 'lucide-react';

export default function ActualitesPage() {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [annonces, setAnnonces] = useState<any[]>([]);
    const [userRole, setUserRole] = useState(null);
    const [userGeneration, setUserGeneration] = useState(null);
    const router = useRouter();

    useEffect(() => {
        checkAuthAndLoadData();
    }, []);

    const checkAuthAndLoadData = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            router.push('/login');
            return;
        }

        const { data: profile } = await supabase
            .from('membres')
            .select('role, generation')
            .eq('user_id', session.user.id)
            .maybeSingle();

        setUserRole(profile?.role || 'membre');
        setUserGeneration(profile?.generation);

        await loadAnnonces(profile?.generation, profile?.role);
        setLoading(false);
    };

    const loadAnnonces = async (generation: string | null, role: string | null) => {
        setRefreshing(true);

        let query = supabase
            .from('annonces')
            .select('*')
            .order('created_at', { ascending: false });

        if (role === 'super_admin' || role === 'baliou_padra') {
            // Admins : voient toutes les annonces
        } else {
            // Membres : 
            // - Annonces publiques (type = 'public')
            // - Annonces internes de leur génération (type = 'interne' ET generation_concernee = leur génération)
            query = query.or(`type.eq.public,and(type.eq.interne,generation_concernee.eq.${generation})`);
        }

        const { data } = await query;
        setAnnonces(data || []);
        setRefreshing(false);
    };

    const handleRefresh = async (): Promise<void> => {
        await loadAnnonces(userGeneration, userRole);
    };

    const formatDate = (dateString: any) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days === 0) return "Aujourd'hui";
        if (days === 1) return "Hier";
        if (days < 7) return `Il y a ${days} jours`;
        return date.toLocaleDateString('fr-FR');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin text-4xl mb-4">⏳</div>
                    <p className="text-2xl font-black text-black">Chargement des actualités...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white p-6">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <Link href="/dashboard" className="inline-flex items-center gap-2 text-black font-black hover:text-[#146332] transition-colors mb-4">
                        <ArrowLeft size={20} /> Retour au tableau de bord
                    </Link>
                    <div className="flex justify-between items-center flex-wrap gap-4">
                        <div>
                            <h1 className="text-4xl font-black text-[#146332] uppercase italic">
                                ACTUALITÉS
                            </h1>
                            <div className="h-1 w-20 bg-black mt-2"></div>
                            <p className="text-black/60 mt-2">Restez informés des dernières nouvelles de la communauté</p>
                        </div>
                        <button
                            onClick={handleRefresh}
                            disabled={refreshing}
                            className="flex items-center gap-2 bg-gray-100 border-2 border-black px-4 py-2 rounded-xl font-black text-sm hover:bg-gray-200 transition-all"
                        >
                            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                            Actualiser
                        </button>
                    </div>
                </div>

                {/* Liste des actualités */}
                {annonces.length === 0 ? (
                    <div className="bg-white border-4 border-black rounded-2xl p-12 text-center">
                        <Megaphone size={64} className="mx-auto text-black/30 mb-4" />
                        <p className="text-xl font-black text-black/60 italic">Aucune actualité pour le moment</p>
                        <p className="text-black/40 mt-2">Revenez plus tard pour voir les nouvelles annonces</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {annonces.map((annonce) => (
                            <div key={annonce.id} className="bg-white border-4 border-black rounded-2xl overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)]">
                                {/* Type d'annonce */}
                                <div className={`px-5 py-2 ${annonce.type === 'public' ? 'bg-green-500' : 'bg-blue-500'}`}>
                                    <span className="text-white font-black text-xs uppercase flex items-center gap-2">
                                        {annonce.type === 'public' ? (
                                            <>
                                                <Globe size={14} /> Annonce publique - Toute la communauté
                                            </>
                                        ) : (
                                            <>
                                                <Lock size={14} /> Annonce interne - {annonce.generation_concernee}
                                            </>
                                        )}
                                    </span>
                                </div>

                                {/* Contenu */}
                                <div className="p-6">
                                    <h2 className="text-2xl font-black text-black mb-3">{annonce.titre}</h2>
                                    <p className="text-black/70 text-base leading-relaxed mb-4">{annonce.contenu}</p>

                                    {/* Métadonnées */}
                                    <div className="flex flex-wrap items-center gap-4 pt-4 border-t-2 border-black/10 text-sm text-black/50">
                                        <div className="flex items-center gap-2">
                                            <Calendar size={16} />
                                            <span>Publié le {new Date(annonce.created_at).toLocaleDateString('fr-FR')} à {new Date(annonce.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <User size={16} />
                                            <span>Par {annonce.auteur || 'Bureau Central'}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-black uppercase px-2 py-1 rounded-full bg-gray-100">
                                                {formatDate(annonce.created_at)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Footer */}
                <div className="mt-8 text-center">
                    <p className="text-xs text-black/40 font-black uppercase tracking-wider">
                        Communauté Cheikh Yacouba Sylla — Baliou Padra
                    </p>
                </div>
            </div>
        </div>
    );
}