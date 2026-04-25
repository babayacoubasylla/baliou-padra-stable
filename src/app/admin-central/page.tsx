"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminCentralDashboard() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalGenerations: 0,
        totalMembres: 0,
        totalCollecte: 0,
        totalObjectif: 0,
        progressionGlobale: 0,
        alertes: 0
    });
    const [generations, setGenerations] = useState([]);
    const [recentReversements, setRecentReversements] = useState([]);
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
            .select('role')
            .eq('user_id', session.user.id)
            .maybeSingle();

        if (profile?.role !== 'baliou_padra' && profile?.role !== 'super_admin') {
            router.push('/dashboard');
            return;
        }

        await loadData();
        setLoading(false);
    };

    const loadData = async () => {
        // 1. Charger les générations depuis la table membres
        const { data: membresData } = await supabase
            .from('membres')
            .select('generation')
            .not('generation', 'is', null);

        const uniqueGenerations = [...new Set(membresData?.map(g => g.generation) || [])];
        setStats(prev => ({ ...prev, totalGenerations: uniqueGenerations.length }));

        // 2. Charger le nombre de membres
        const { count: membresCount } = await supabase
            .from('membres')
            .select('*', { count: 'exact', head: true });
        setStats(prev => ({ ...prev, totalMembres: membresCount || 0 }));

        // 3. Charger les cotisations pour la collecte totale
        const { data: cotisations } = await supabase
            .from('cotisations')
            .select('montant');
        const totalCollecte = cotisations?.reduce((sum, c) => sum + (c.montant || 0), 0) || 0;
        setStats(prev => ({ ...prev, totalCollecte }));

        // 4. Charger les objectifs (propositions validées)
        const { data: objectifs } = await supabase
            .from('propositions_budgetaires')
            .select('montant_propose')
            .eq('statut', 'valide');
        const totalObjectif = objectifs?.reduce((sum, o) => sum + (o.montant_propose || 0), 0) || 0;
        const progressionGlobale = totalObjectif > 0 ? (totalCollecte / totalObjectif) * 100 : 0;
        setStats(prev => ({ ...prev, totalObjectif, progressionGlobale }));

        // 5. Charger les performances par génération (DONNÉES RÉELLES)
        const generationsAvecStats = await Promise.all(
            uniqueGenerations.map(async (gen) => {
                // Récupérer les membres de cette génération
                const { data: membresGen } = await supabase
                    .from('membres')
                    .select('id')
                    .eq('generation', gen);

                const membreIds = membresGen?.map(m => m.id) || [];

                // Collecte de la génération
                let collecte = 0;
                if (membreIds.length > 0) {
                    const { data: cotisationsGen } = await supabase
                        .from('cotisations')
                        .select('montant')
                        .in('membre_id', membreIds);
                    collecte = cotisationsGen?.reduce((sum, c) => sum + (c.montant || 0), 0) || 0;
                }

                // Objectif de la génération
                const { data: proposition } = await supabase
                    .from('propositions_budgetaires')
                    .select('montant_propose')
                    .eq('generation_nom', gen)
                    .eq('statut', 'valide')
                    .maybeSingle();

                const objectif = proposition?.montant_propose || 0;
                const progression = objectif > 0 ? Math.min(100, (collecte / objectif) * 100) : 0;

                return {
                    id: gen,
                    nom: gen,
                    objectif,
                    collecte,
                    progression,
                    nbMembres: membreIds.length
                };
            })
        );

        setGenerations(generationsAvecStats.sort((a, b) => b.collecte - a.collecte));

        // 6. Charger les reversements récents
        const { data: reversements } = await supabase
            .from('versements_centraux')
            .select('*')
            .order('date_versement', { ascending: false })
            .limit(5);

        if (reversements) setRecentReversements(reversements);
    };

    const formatMontant = (montant) => {
        return new Intl.NumberFormat('fr-FR').format(montant) + ' FCFA';
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <p className="text-2xl font-black text-black">Chargement...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-black text-[#146332] uppercase italic">
                        Bureau Central Baliou Padra
                    </h1>
                    <div className="h-1 w-32 bg-black mt-2"></div>
                    <p className="text-black/60 mt-2">Tableau de bord de gouvernance</p>
                </div>

                {/* Cartes Statistiques RÉELLES */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <StatCard title="Générations" value={stats.totalGenerations} icon="🏘️" color="bg-[#146332]" />
                    <StatCard title="Membres actifs" value={stats.totalMembres} icon="👥" color="bg-blue-600" />
                    <StatCard title="Collecte totale" value={formatMontant(stats.totalCollecte)} icon="💰" color="bg-green-600" />
                    <StatCard title="Progression" value={`${stats.progressionGlobale.toFixed(1)}%`} icon="📈" color="bg-purple-600" />
                </div>

                {/* Navigation rapide - TOUS TES BOUTONS CONSERVÉS */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <NavCard href="/admin-central/finance" title="Finance" icon="💰" />
                    <NavCard href="/admin-central/reversements" title="Reversements" icon="🔄" />
                    <NavCard href="/admin-central/tresorerie" title="Trésorerie" icon="📊" />
                    <NavCard href="/admin-central/roles" title="Rôles" icon="👤" />
                    <NavCard href="/admin-central/documents" title="Documents" icon="📁" />
                    <NavCard href="/admin-central/audit" title="Audit" icon="📋" />
                    <NavCard href="/admin-central/stats" title="Statistiques" icon="📈" />
                    <NavCard href="/admin-central/communication" title="Communication" icon="📢" />
                </div>

                {/* Performance des générations - DONNÉES RÉELLES (plus de données aléatoires) */}
                <div className="bg-white border-4 border-black rounded-2xl p-6 mb-8">
                    <h2 className="text-2xl font-black text-black mb-4">Performance des générations</h2>
                    <div className="space-y-4">
                        {generations.map((gen) => (
                            <GenProgressBar key={gen.id} generation={gen} formatMontant={formatMontant} />
                        ))}
                        {generations.length === 0 && (
                            <p className="text-black/60 italic text-center py-8">Aucune génération enregistrée</p>
                        )}
                    </div>
                </div>

                {/* Reversements récents */}
                <div className="bg-white border-4 border-black rounded-2xl p-6">
                    <h2 className="text-2xl font-black text-black mb-4">Derniers reversements</h2>
                    {recentReversements.length === 0 ? (
                        <p className="text-black/60 italic">En attente de reversements...</p>
                    ) : (
                        <div className="space-y-3">
                            {recentReversements.map((rev) => (
                                <div key={rev.id} className="flex justify-between items-center border-b-2 border-black/10 py-3">
                                    <div>
                                        <p className="font-black text-black">{rev.generation || 'Génération inconnue'}</p>
                                        <p className="text-sm text-black/50">{new Date(rev.date_versement).toLocaleDateString()}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-black text-green-600">{formatMontant(rev.montant)}</p>
                                        <span className={`text-xs px-2 py-1 rounded-full font-black ${rev.statut === 'valide' ? 'bg-green-100 text-green-800' : rev.statut === 'rejete' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                            {rev.statut || 'en attente'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Composant StatCard
function StatCard({ title, value, icon, color }) {
    return (
        <div className="bg-white border-4 border-black rounded-2xl p-5 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.2)]">
            <div className="flex items-center justify-between mb-3">
                <span className="text-3xl">{icon}</span>
                <span className={`text-xs font-black px-2 py-1 rounded-full ${color} text-white`}>BP</span>
            </div>
            <p className="text-2xl font-black text-black">{value}</p>
            <p className="text-xs font-bold uppercase text-black/50 mt-1">{title}</p>
        </div>
    );
}

// Composant NavCard
function NavCard({ href, title, icon }) {
    return (
        <Link href={href}>
            <div className="bg-white border-2 border-black rounded-xl p-4 text-center hover:bg-[#146332] hover:text-white transition-all cursor-pointer hover:shadow-md group">
                <div className="text-2xl mb-1 group-hover:text-white">{icon}</div>
                <p className="font-black text-sm uppercase tracking-tighter text-black group-hover:text-white">{title}</p>
            </div>
        </Link>
    );
}

// Composant GenProgressBar - AVEC DONNÉES RÉELLES (plus de random)
function GenProgressBar({ generation, formatMontant }) {
    const progression = generation.progression || 0;
    const couleurBarre = progression < 50 ? 'bg-red-500' : progression < 75 ? 'bg-orange-500' : 'bg-green-500';

    return (
        <div>
            <div className="flex justify-between mb-1">
                <div>
                    <span className="font-black text-black">{generation.nom}</span>
                    <span className="ml-2 text-xs text-black/50">({generation.nbMembres || 0} membres)</span>
                </div>
                <div className="text-right">
                    <span className="text-sm font-black text-green-600">{formatMontant(generation.collecte || 0)}</span>
                    <span className="text-xs text-black/50 mx-1">/</span>
                    <span className="text-sm font-black text-purple-600">{formatMontant(generation.objectif || 0)}</span>
                </div>
            </div>
            <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden border border-black">
                <div
                    className={`h-full ${couleurBarre} rounded-full transition-all duration-500`}
                    style={{ width: `${progression}%` }}
                ></div>
            </div>
            <div className="flex justify-between mt-1">
                <span className="text-xs text-black/50">Collecte</span>
                <span className="text-xs font-black text-black">{progression.toFixed(1)}%</span>
            </div>
        </div>
    );
}