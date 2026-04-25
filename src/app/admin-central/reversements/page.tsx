"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ReversementsPage() {
    const [loading, setLoading] = useState(true);
    const [reversements, setReversements] = useState([]);
    const [filter, setFilter] = useState('tous'); // tous, en_attente, valide, rejete
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

        await loadReversements();
        setLoading(false);
    };

    const loadReversements = async () => {
        // Récupérer tous les reversements avec les infos de génération
        const { data: reversementsData, error } = await supabase
            .from('versements_centraux')
            .select('*')
            .order('date_versement', { ascending: false });

        if (error) {
            console.error("Erreur chargement reversements:", error);
            return;
        }

        // Pour chaque reversement, récupérer le nom de la génération depuis la table membres
        const reversementsAvecNoms = await Promise.all(
            (reversementsData || []).map(async (rev) => {
                let generationNom = rev.generation;

                // Si le nom de génération n'est pas stocké, essayer de le récupérer
                if (!generationNom && rev.generation_id) {
                    const { data: membres } = await supabase
                        .from('membres')
                        .select('generation')
                        .eq('generation_id', rev.generation_id)
                        .limit(1);

                    if (membres && membres.length > 0) {
                        generationNom = membres[0].generation;
                    }
                }

                return {
                    ...rev,
                    generation_nom: generationNom || 'Génération inconnue'
                };
            })
        );

        setReversements(reversementsAvecNoms);
    };

    const handleValidation = async (reversementId, nouveauStatut) => {
        const { error } = await supabase
            .from('versements_centraux')
            .update({
                statut: nouveauStatut,
                date_validation: new Date().toISOString()
            })
            .eq('id', reversementId);

        if (error) {
            alert("Erreur lors de la validation: " + error.message);
            return;
        }

        // Recharger la liste
        await loadReversements();
        alert(`Reversement ${nouveauStatut === 'valide' ? 'validé' : 'rejeté'} avec succès`);
    };

    const getStatutBadge = (statut) => {
        switch (statut) {
            case 'valide':
                return <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full font-black text-xs">Validé</span>;
            case 'rejete':
                return <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full font-black text-xs">Rejeté</span>;
            default:
                return <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full font-black text-xs">En attente</span>;
        }
    };

    const getMontantBadge = (montant) => {
        if (montant >= 1000000) {
            return <span className="text-purple-600 font-black">💰 {montant.toLocaleString()} FCFA</span>;
        } else if (montant >= 500000) {
            return <span className="text-blue-600 font-black">💵 {montant.toLocaleString()} FCFA</span>;
        }
        return <span className="text-green-600 font-black">{montant.toLocaleString()} FCFA</span>;
    };

    const reversementsFiltres = reversements.filter(rev => {
        if (filter === 'tous') return true;
        if (filter === 'en_attente') return !rev.statut || rev.statut === 'en_attente';
        return rev.statut === filter;
    });

    const stats = {
        total: reversements.length,
        enAttente: reversements.filter(r => !r.statut || r.statut === 'en_attente').length,
        valides: reversements.filter(r => r.statut === 'valide').length,
        rejetes: reversements.filter(r => r.statut === 'rejete').length,
        montantTotal: reversements.reduce((sum, r) => sum + (r.montant || 0), 0)
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
                <div className="mb-6">
                    <Link href="/admin-central" className="inline-flex items-center gap-2 text-black font-black hover:text-[#146332] transition-colors mb-4">
                        <span>←</span> Retour au tableau de bord
                    </Link>
                    <h1 className="text-4xl font-black text-[#146332] uppercase italic">
                        VALIDATION DES REVERSEMENTS
                    </h1>
                    <div className="h-1 w-32 bg-black mt-2"></div>
                    <p className="text-black/60 mt-2">Gérez les transferts financiers des générations vers le Bureau Central</p>
                </div>

                {/* Cartes statistiques */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                    <StatCard title="Total" value={stats.total} icon="📊" color="bg-gray-800" />
                    <StatCard title="En attente" value={stats.enAttente} icon="⏳" color="bg-yellow-500" />
                    <StatCard title="Validés" value={stats.valides} icon="✅" color="bg-green-600" />
                    <StatCard title="Rejetés" value={stats.rejetes} icon="❌" color="bg-red-600" />
                    <StatCard title="Montant total" value={`${stats.montantTotal.toLocaleString()} FCFA`} icon="💰" color="bg-blue-600" />
                </div>

                {/* Filtres */}
                <div className="bg-white border-4 border-black rounded-2xl p-4 mb-6">
                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={() => setFilter('tous')}
                            className={`px-6 py-2 rounded-xl font-black uppercase text-sm transition-all ${filter === 'tous' ? 'bg-black text-white' : 'bg-gray-100 text-black border-2 border-black'}`}
                        >
                            Tous
                        </button>
                        <button
                            onClick={() => setFilter('en_attente')}
                            className={`px-6 py-2 rounded-xl font-black uppercase text-sm transition-all ${filter === 'en_attente' ? 'bg-yellow-500 text-white' : 'bg-gray-100 text-black border-2 border-black'}`}
                        >
                            En attente
                        </button>
                        <button
                            onClick={() => setFilter('valide')}
                            className={`px-6 py-2 rounded-xl font-black uppercase text-sm transition-all ${filter === 'valide' ? 'bg-green-600 text-white' : 'bg-gray-100 text-black border-2 border-black'}`}
                        >
                            Validés
                        </button>
                        <button
                            onClick={() => setFilter('rejete')}
                            className={`px-6 py-2 rounded-xl font-black uppercase text-sm transition-all ${filter === 'rejete' ? 'bg-red-600 text-white' : 'bg-gray-100 text-black border-2 border-black'}`}
                        >
                            Rejetés
                        </button>
                    </div>
                </div>

                {/* Liste des reversements */}
                <div className="bg-white border-4 border-black rounded-2xl overflow-hidden">
                    {reversementsFiltres.length === 0 ? (
                        <div className="p-12 text-center">
                            <p className="text-xl font-black text-black/60 italic">Aucun reversement trouvé</p>
                            <p className="text-black/40 mt-2">Les demandes de reversement apparaîtront ici</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-black text-white">
                                    <tr>
                                        <th className="p-4 text-left font-black uppercase text-sm">Date</th>
                                        <th className="p-4 text-left font-black uppercase text-sm">Génération</th>
                                        <th className="p-4 text-left font-black uppercase text-sm">Montant</th>
                                        <th className="p-4 text-left font-black uppercase text-sm">Description</th>
                                        <th className="p-4 text-left font-black uppercase text-sm">Statut</th>
                                        <th className="p-4 text-center font-black uppercase text-sm">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reversementsFiltres.map((rev, idx) => (
                                        <tr key={rev.id} className={`border-b-2 border-black/10 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                                            <td className="p-4 font-black text-black">
                                                {new Date(rev.date_versement).toLocaleDateString()}
                                            </td>
                                            <td className="p-4 font-black text-black">
                                                {rev.generation_nom}
                                            </td>
                                            <td className="p-4">
                                                {getMontantBadge(rev.montant)}
                                            </td>
                                            <td className="p-4 text-black/80 max-w-xs truncate">
                                                {rev.description || '—'}
                                            </td>
                                            <td className="p-4">
                                                {getStatutBadge(rev.statut)}
                                            </td>
                                            <td className="p-4 text-center">
                                                {(!rev.statut || rev.statut === 'en_attente') && (
                                                    <div className="flex gap-2 justify-center">
                                                        <button
                                                            onClick={() => handleValidation(rev.id, 'valide')}
                                                            className="bg-green-500 text-white px-4 py-2 rounded-xl font-black text-xs hover:bg-green-600 transition-all flex items-center gap-1"
                                                        >
                                                            ✅ Valider
                                                        </button>
                                                        <button
                                                            onClick={() => handleValidation(rev.id, 'rejete')}
                                                            className="bg-red-500 text-white px-4 py-2 rounded-xl font-black text-xs hover:bg-red-600 transition-all flex items-center gap-1"
                                                        >
                                                            ❌ Rejeter
                                                        </button>
                                                    </div>
                                                )}
                                                {rev.statut === 'valide' && (
                                                    <span className="text-green-600 font-black text-sm">✅ Validé</span>
                                                )}
                                                {rev.statut === 'rejete' && (
                                                    <span className="text-red-600 font-black text-sm">❌ Rejeté</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Pied de page */}
                <div className="mt-6 text-right">
                    <p className="text-xs text-black/40 font-black uppercase tracking-wider">
                        Bureau Central Baliou Padra — Supervision des reversements
                    </p>
                </div>
            </div>
        </div>
    );
}

// Composant carte statistique
function StatCard({ title, value, icon, color }) {
    return (
        <div className="bg-white border-4 border-black rounded-2xl p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.1)]">
            <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">{icon}</span>
                <span className={`text-xs font-black px-2 py-1 rounded-full ${color} text-white`}>BP</span>
            </div>
            <p className="text-2xl font-black text-black">{typeof value === 'number' ? value : value}</p>
            <p className="text-xs font-black uppercase text-black/50 mt-1">{title}</p>
        </div>
    );
}