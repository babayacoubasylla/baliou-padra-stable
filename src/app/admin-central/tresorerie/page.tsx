"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft,
    Landmark,
    TrendingUp,
    TrendingDown,
    Calendar,
    Download,
    RefreshCw,
    Plus,
    X,
    Eye,
    Trash2,
    CheckCircle,
    Clock,
    AlertCircle,
    Filter,
    Printer
} from 'lucide-react';

export default function TresoreriePage() {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [soldeGlobal, setSoldeGlobal] = useState(0);
    const [entrees, setEntrees] = useState(0);
    const [sorties, setSorties] = useState(0);
    const [dernierMouvement, setDernierMouvement] = useState(null);
    const [mouvementsRecents, setMouvementsRecents] = useState([]);
    const [statsParGeneration, setStatsParGeneration] = useState([]);
    const [depenses, setDepenses] = useState([]);
    const [showAjoutDepense, setShowAjoutDepense] = useState(false);
    const [nouvelleDepense, setNouvelleDepense] = useState({
        libelle: "",
        montant: "",
        description: "",
        date_depense: new Date().toISOString().split('T')[0],
        categorie: "fonctionnement"
    });
    const [filterType, setFilterType] = useState('tous'); // tous, entrees, sorties
    const [periode, setPeriode] = useState('mois');
    const [statsPeriod, setStatsPeriod] = useState({
        entreePeriode: 0,
        sortiePeriode: 0,
        evolution: 0
    });
    const router = useRouter();

    // Catégories de dépenses
    const categoriesDepenses = [
        { value: "fonctionnement", label: "🏢 Fonctionnement", icon: "🏢" },
        { value: "evenement", label: "🎉 Événement", icon: "🎉" },
        { value: "humanitaire", label: "🤝 Humanitaire", icon: "🤝" },
        { value: "infrastructure", label: "🏗️ Infrastructure", icon: "🏗️" },
        { value: "communication", label: "📢 Communication", icon: "📢" },
        { value: "autre", label: "📌 Autre", icon: "📌" }
    ];

    useEffect(() => {
        checkAuthAndLoadData();
    }, [periode]);

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

        await loadTresorerieData();
        setLoading(false);
    };

    const getDateRangeFilter = () => {
        const now = new Date();
        const startDate = new Date();

        if (periode === 'mois') {
            startDate.setMonth(now.getMonth() - 1);
        } else if (periode === 'trimestre') {
            startDate.setMonth(now.getMonth() - 3);
        } else if (periode === 'annee') {
            startDate.setFullYear(now.getFullYear() - 1);
        } else {
            startDate.setMonth(now.getMonth() - 1);
        }

        return { startDate, endDate: now };
    };

    const loadTresorerieData = async () => {
        setRefreshing(true);

        const { startDate, endDate } = getDateRangeFilter();

        // 1. Récupérer tous les versements centraux validés
        const { data: versements } = await supabase
            .from('versements_centraux')
            .select('*')
            .eq('statut', 'valide')
            .order('date_versement', { ascending: false });

        // 2. Récupérer les dépenses
        const { data: depensesData } = await supabase
            .from('depenses_centrales')
            .select('*')
            .order('date_depense', { ascending: false });

        setDepenses(depensesData || []);

        // 3. Calculer les totaux
        let totalEntrees = 0;
        let totalSorties = 0;
        let totalEntreesPeriode = 0;
        let totalSortiesPeriode = 0;
        let mouvements = [];

        if (versements) {
            versements.forEach(v => {
                totalEntrees += v.montant;
                mouvements.push({
                    ...v,
                    type: 'entree',
                    libelle: v.description || `Versement ${v.generation}`,
                    date: v.date_versement,
                    source: v.generation
                });

                // Vérifier si dans la période
                const dateVers = new Date(v.date_versement);
                if (dateVers >= startDate && dateVers <= endDate) {
                    totalEntreesPeriode += v.montant;
                }
            });
        }

        if (depensesData) {
            depensesData.forEach(d => {
                totalSorties += d.montant;
                mouvements.push({
                    ...d,
                    type: 'sortie',
                    libelle: d.libelle,
                    date: d.date_depense,
                    source: 'Bureau Central'
                });

                const dateDep = new Date(d.date_depense);
                if (dateDep >= startDate && dateDep <= endDate) {
                    totalSortiesPeriode += d.montant;
                }
            });
        }

        // 4. Trier les mouvements par date
        mouvements.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Filtrer selon le type si nécessaire
        let mouvementsFiltres = mouvements;
        if (filterType === 'entrees') {
            mouvementsFiltres = mouvements.filter(m => m.type === 'entree');
        } else if (filterType === 'sorties') {
            mouvementsFiltres = mouvements.filter(m => m.type === 'sortie');
        }

        setMouvementsRecents(mouvementsFiltres.slice(0, 20));

        // 5. Solde global
        const solde = totalEntrees - totalSorties;
        setSoldeGlobal(solde);
        setEntrees(totalEntrees);
        setSorties(totalSorties);

        // 6. Statistiques période
        setStatsPeriod({
            entreePeriode: totalEntreesPeriode,
            sortiePeriode: totalSortiesPeriode,
            evolution: totalEntreesPeriode - totalSortiesPeriode
        });

        // 7. Dernier mouvement
        if (mouvements.length > 0) {
            setDernierMouvement(mouvements[0]);
        }

        // 8. Statistiques par génération
        const statsMap = new Map();
        if (versements) {
            versements.forEach(v => {
                if (v.generation) {
                    const current = statsMap.get(v.generation) || { generation: v.generation, total: 0, nbVersements: 0 };
                    current.total += v.montant;
                    current.nbVersements += 1;
                    statsMap.set(v.generation, current);
                }
            });
        }
        setStatsParGeneration(Array.from(statsMap.values()).sort((a, b) => b.total - a.total));

        setRefreshing(false);
    };

    const handleAjouterDepense = async (e) => {
        e.preventDefault();

        const { data: { session } } = await supabase.auth.getSession();

        const { error } = await supabase
            .from('depenses_centrales')
            .insert([{
                libelle: nouvelleDepense.libelle,
                montant: parseInt(nouvelleDepense.montant),
                description: nouvelleDepense.description,
                date_depense: nouvelleDepense.date_depense,
                categorie: nouvelleDepense.categorie,
                cree_par: session?.user?.email || 'admin'
            }]);

        if (error) {
            alert("Erreur: " + error.message);
            return;
        }

        alert("Dépense ajoutée avec succès !");
        setShowAjoutDepense(false);
        setNouvelleDepense({
            libelle: "",
            montant: "",
            description: "",
            date_depense: new Date().toISOString().split('T')[0],
            categorie: "fonctionnement"
        });
        await loadTresorerieData();
    };

    const handleSupprimerDepense = async (depenseId) => {
        if (!confirm("Êtes-vous sûr de vouloir supprimer cette dépense ?")) return;

        const { error } = await supabase
            .from('depenses_centrales')
            .delete()
            .eq('id', depenseId);

        if (error) {
            alert("Erreur: " + error.message);
            return;
        }

        alert("Dépense supprimée !");
        await loadTresorerieData();
    };

    const handleRefresh = async () => {
        await loadTresorerieData();
    };

    const formatMontant = (montant) => {
        return new Intl.NumberFormat('fr-FR').format(montant) + ' FCFA';
    };

    const getCategorieLabel = (categorie) => {
        const cat = categoriesDepenses.find(c => c.value === categorie);
        return cat ? cat.label : "📌 Autre";
    };

    const getPeriodLabel = () => {
        const now = new Date();
        if (periode === 'mois') {
            return `${now.toLocaleString('fr-FR', { month: 'long' })} ${now.getFullYear()}`;
        } else if (periode === 'trimestre') {
            const trimestre = Math.floor(now.getMonth() / 3) + 1;
            return `T${trimestre} ${now.getFullYear()}`;
        }
        return `Année ${now.getFullYear()}`;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin text-4xl mb-4">⏳</div>
                    <p className="text-2xl font-black text-black">Chargement de la trésorerie...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <Link href="/admin-central" className="inline-flex items-center gap-2 text-black font-black hover:text-[#146332] transition-colors mb-4">
                        <ArrowLeft size={20} /> Retour au tableau de bord
                    </Link>
                    <div className="flex justify-between items-start flex-wrap gap-4">
                        <div>
                            <h1 className="text-4xl font-black text-[#146332] uppercase italic">
                                CAISSE CENTRALE
                            </h1>
                            <div className="h-1 w-32 bg-black mt-2"></div>
                            <p className="text-black/60 mt-2">Trésorerie globale du Bureau Central Baliou Padra</p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowAjoutDepense(true)}
                                className="flex items-center gap-2 bg-[#146332] text-white px-4 py-2 rounded-xl font-black text-sm hover:bg-black transition-all"
                            >
                                <Plus size={16} /> Nouvelle dépense
                            </button>
                            <button
                                onClick={handleRefresh}
                                disabled={refreshing}
                                className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-xl font-black text-sm hover:bg-[#146332] transition-all"
                            >
                                <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                                Actualiser
                            </button>
                        </div>
                    </div>
                </div>

                {/* Solde principal */}
                <div className="bg-black border-4 border-black rounded-2xl p-8 mb-8 shadow-[12px_12px_0px_0px_rgba(0,0,0,0.2)]">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div>
                            <Landmark size={48} className="text-[#39ff14] mb-2" />
                            <p className="text-[#39ff14] font-black uppercase text-xs tracking-wider">Solde global consolidé</p>
                            <p className="text-5xl md:text-6xl font-black text-[#39ff14] mt-2">
                                {formatMontant(soldeGlobal)}
                            </p>
                            <p className="text-white/50 text-xs mt-2">Mise à jour: {new Date().toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                            <div className="flex items-center gap-6">
                                <div>
                                    <p className="text-green-400 font-black text-xs uppercase">Entrées</p>
                                    <p className="text-green-400 font-black text-xl">{formatMontant(entrees)}</p>
                                </div>
                                <div>
                                    <p className="text-red-400 font-black text-xs uppercase">Sorties</p>
                                    <p className="text-red-400 font-black text-xl">{formatMontant(sorties)}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filtres période et type */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="bg-white border-4 border-black rounded-2xl p-4">
                        <label className="block text-black font-black text-sm mb-2">📅 Période</label>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPeriode('mois')}
                                className={`px-4 py-2 rounded-xl font-black text-sm transition-all ${periode === 'mois' ? 'bg-black text-white' : 'bg-gray-100 text-black border-2 border-black'}`}
                            >
                                Mois
                            </button>
                            <button
                                onClick={() => setPeriode('trimestre')}
                                className={`px-4 py-2 rounded-xl font-black text-sm transition-all ${periode === 'trimestre' ? 'bg-black text-white' : 'bg-gray-100 text-black border-2 border-black'}`}
                            >
                                Trimestre
                            </button>
                            <button
                                onClick={() => setPeriode('annee')}
                                className={`px-4 py-2 rounded-xl font-black text-sm transition-all ${periode === 'annee' ? 'bg-black text-white' : 'bg-gray-100 text-black border-2 border-black'}`}
                            >
                                Année
                            </button>
                        </div>
                    </div>
                    <div className="bg-white border-4 border-black rounded-2xl p-4">
                        <label className="block text-black font-black text-sm mb-2">🔍 Type de mouvement</label>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setFilterType('tous')}
                                className={`px-4 py-2 rounded-xl font-black text-sm transition-all ${filterType === 'tous' ? 'bg-black text-white' : 'bg-gray-100 text-black border-2 border-black'}`}
                            >
                                Tous
                            </button>
                            <button
                                onClick={() => setFilterType('entrees')}
                                className={`px-4 py-2 rounded-xl font-black text-sm transition-all ${filterType === 'entrees' ? 'bg-green-600 text-white' : 'bg-gray-100 text-black border-2 border-black'}`}
                            >
                                Entrées
                            </button>
                            <button
                                onClick={() => setFilterType('sorties')}
                                className={`px-4 py-2 rounded-xl font-black text-sm transition-all ${filterType === 'sorties' ? 'bg-red-600 text-white' : 'bg-gray-100 text-black border-2 border-black'}`}
                            >
                                Sorties
                            </button>
                        </div>
                    </div>
                </div>

                {/* Cartes période */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white border-4 border-black rounded-2xl p-5">
                        <p className="text-xs font-black uppercase text-black/50">Période</p>
                        <p className="text-xl font-black text-black">{getPeriodLabel()}</p>
                    </div>
                    <div className="bg-white border-4 border-black rounded-2xl p-5">
                        <p className="text-xs font-black uppercase text-black/50">Entrées période</p>
                        <p className="text-xl font-black text-green-600">{formatMontant(statsPeriod.entreePeriode)}</p>
                    </div>
                    <div className="bg-white border-4 border-black rounded-2xl p-5">
                        <p className="text-xs font-black uppercase text-black/50">Évolution période</p>
                        <p className={`text-xl font-black ${statsPeriod.evolution >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {statsPeriod.evolution >= 0 ? '+' : ''}{formatMontant(statsPeriod.evolution)}
                        </p>
                    </div>
                </div>

                {/* Dernier mouvement */}
                {dernierMouvement && (
                    <div className="bg-yellow-50 border-4 border-black rounded-2xl p-5 mb-8">
                        <p className="text-xs font-black uppercase text-black/50 mb-1">📌 Dernier mouvement</p>
                        <div className="flex justify-between items-center flex-wrap gap-4">
                            <div>
                                <p className="font-black text-black text-lg">{dernierMouvement.libelle}</p>
                                <p className="text-sm text-black/60">
                                    {dernierMouvement.source || 'Bureau Central'} • {new Date(dernierMouvement.date).toLocaleDateString()}
                                    {dernierMouvement.categorie && ` • ${getCategorieLabel(dernierMouvement.categorie)}`}
                                </p>
                            </div>
                            <span className={`font-black text-2xl ${dernierMouvement.type === 'entree' ? 'text-green-600' : 'text-red-600'}`}>
                                {dernierMouvement.type === 'entree' ? '+' : '-'} {formatMontant(dernierMouvement.montant)}
                            </span>
                        </div>
                    </div>
                )}

                {/* Liste des dépenses récentes */}
                <div className="bg-white border-4 border-black rounded-2xl overflow-hidden mb-8">
                    <div className="bg-black p-4 flex justify-between items-center">
                        <h2 className="text-white font-black uppercase text-sm">💸 Dépenses récentes</h2>
                        <button
                            onClick={() => setShowAjoutDepense(true)}
                            className="text-white font-black text-sm hover:text-[#39ff14] transition-colors flex items-center gap-1"
                        >
                            <Plus size={16} /> Ajouter
                        </button>
                    </div>
                    {depenses.length === 0 ? (
                        <div className="p-12 text-center text-black/60 italic">
                            Aucune dépense enregistrée
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="p-3 text-left font-black text-sm">Date</th>
                                        <th className="p-3 text-left font-black text-sm">Libellé</th>
                                        <th className="p-3 text-left font-black text-sm">Catégorie</th>
                                        <th className="p-3 text-left font-black text-sm">Description</th>
                                        <th className="p-3 text-right font-black text-sm">Montant</th>
                                        <th className="p-3 text-center font-black text-sm">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {depenses.slice(0, 10).map((depense, idx) => (
                                        <tr key={depense.id} className="border-b border-black/10">
                                            <td className="p-3 text-black/80 text-sm">
                                                {new Date(depense.date_depense).toLocaleDateString()}
                                            </td>
                                            <td className="p-3 font-black text-black">
                                                {depense.libelle}
                                            </td>
                                            <td className="p-3">
                                                <span className="text-sm">{getCategorieLabel(depense.categorie)}</span>
                                            </td>
                                            <td className="p-3 text-black/60 text-sm max-w-xs truncate">
                                                {depense.description || '—'}
                                            </td>
                                            <td className="p-3 text-right font-black text-red-600">
                                                - {formatMontant(depense.montant)}
                                            </td>
                                            <td className="p-3 text-center">
                                                <button
                                                    onClick={() => handleSupprimerDepense(depense.id)}
                                                    className="text-red-500 hover:text-red-700 transition-colors"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Mouvements récents */}
                <div className="bg-white border-4 border-black rounded-2xl overflow-hidden mb-8">
                    <div className="bg-black p-4">
                        <h2 className="text-white font-black uppercase text-sm">📋 Historique des mouvements</h2>
                    </div>
                    {mouvementsRecents.length === 0 ? (
                        <div className="p-12 text-center text-black/60 italic">
                            Aucun mouvement enregistré
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="p-3 text-left font-black text-sm">Date</th>
                                        <th className="p-3 text-left font-black text-sm">Source</th>
                                        <th className="p-3 text-left font-black text-sm">Libellé</th>
                                        <th className="p-3 text-left font-black text-sm">Type</th>
                                        <th className="p-3 text-right font-black text-sm">Montant</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {mouvementsRecents.map((mvt, idx) => (
                                        <tr key={idx} className="border-b border-black/10 hover:bg-gray-50 transition-colors">
                                            <td className="p-3 text-black/80 text-sm">
                                                {new Date(mvt.date).toLocaleDateString()}
                                            </td>
                                            <td className="p-3 font-black text-black text-sm">
                                                {mvt.source || mvt.generation || 'Bureau Central'}
                                            </td>
                                            <td className="p-3 text-black/80 text-sm">
                                                {mvt.libelle}
                                            </td>
                                            <td className="p-3">
                                                {mvt.type === 'entree' ? (
                                                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-black flex items-center gap-1 w-fit">
                                                        <TrendingUp size={12} /> Entrée
                                                    </span>
                                                ) : (
                                                    <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-black flex items-center gap-1 w-fit">
                                                        <TrendingDown size={12} /> Sortie
                                                    </span>
                                                )}
                                            </td>
                                            <td className={`p-3 text-right font-black ${mvt.type === 'entree' ? 'text-green-600' : 'text-red-600'}`}>
                                                {mvt.type === 'entree' ? '+' : '-'} {formatMontant(mvt.montant)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Contribution par génération */}
                {statsParGeneration.length > 0 && (
                    <div className="bg-white border-4 border-black rounded-2xl overflow-hidden mb-8">
                        <div className="bg-black p-4">
                            <h2 className="text-white font-black uppercase text-sm">🏆 Contribution par génération</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="p-3 text-left font-black text-sm">Génération</th>
                                        <th className="p-3 text-center font-black text-sm">Nombre de versements</th>
                                        <th className="p-3 text-right font-black text-sm">Montant total</th>
                                        <th className="p-3 text-right font-black text-sm">% du total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {statsParGeneration.map((stat, idx) => (
                                        <tr key={idx} className="border-b border-black/10">
                                            <td className="p-3 font-black text-black">
                                                {stat.generation}
                                            </td>
                                            <td className="p-3 text-center text-black/80">
                                                {stat.nbVersements}
                                            </td>
                                            <td className="p-3 text-right font-black text-green-600">
                                                {formatMontant(stat.total)}
                                            </td>
                                            <td className="p-3 text-right text-black/80 font-black">
                                                {entrees > 0 ? ((stat.total / entrees) * 100).toFixed(1) : 0}%
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Modal Ajout Dépense */}
                {showAjoutDepense && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white border-4 border-black rounded-2xl max-w-md w-full p-6 shadow-[15px_15px_0px_0px_rgba(0,0,0,0.2)]">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-black text-black">➕ Nouvelle dépense</h2>
                                <button
                                    onClick={() => setShowAjoutDepense(false)}
                                    className="text-black hover:text-red-500 transition-colors"
                                >
                                    <X size={24} />
                                </button>
                            </div>
                            <form onSubmit={handleAjouterDepense} className="space-y-4">
                                <div>
                                    <label className="block text-black font-black mb-1">Libellé *</label>
                                    <input
                                        type="text"
                                        value={nouvelleDepense.libelle}
                                        onChange={(e) => setNouvelleDepense({ ...nouvelleDepense, libelle: e.target.value })}
                                        className="w-full p-3 border-4 border-black rounded-xl font-black text-black bg-white focus:bg-yellow-50 outline-none"
                                        placeholder="Ex: Achat fournitures"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-black font-black mb-1">Montant (FCFA) *</label>
                                    <input
                                        type="number"
                                        value={nouvelleDepense.montant}
                                        onChange={(e) => setNouvelleDepense({ ...nouvelleDepense, montant: e.target.value })}
                                        className="w-full p-3 border-4 border-black rounded-xl font-black text-black bg-white focus:bg-yellow-50 outline-none"
                                        placeholder="0"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-black font-black mb-1">Catégorie</label>
                                    <select
                                        value={nouvelleDepense.categorie}
                                        onChange={(e) => setNouvelleDepense({ ...nouvelleDepense, categorie: e.target.value })}
                                        className="w-full p-3 border-4 border-black rounded-xl font-black text-black bg-white focus:bg-yellow-50 outline-none"
                                    >
                                        {categoriesDepenses.map(cat => (
                                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-black font-black mb-1">Date</label>
                                    <input
                                        type="date"
                                        value={nouvelleDepense.date_depense}
                                        onChange={(e) => setNouvelleDepense({ ...nouvelleDepense, date_depense: e.target.value })}
                                        className="w-full p-3 border-4 border-black rounded-xl font-black text-black bg-white focus:bg-yellow-50 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-black font-black mb-1">Description (optionnelle)</label>
                                    <textarea
                                        value={nouvelleDepense.description}
                                        onChange={(e) => setNouvelleDepense({ ...nouvelleDepense, description: e.target.value })}
                                        className="w-full p-3 border-4 border-black rounded-xl font-black text-black bg-white focus:bg-yellow-50 outline-none"
                                        rows={3}
                                        placeholder="Détails supplémentaires..."
                                    />
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowAjoutDepense(false)}
                                        className="flex-1 bg-gray-200 text-black py-3 rounded-xl font-black uppercase text-sm hover:bg-gray-300 transition-all"
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 bg-black text-white py-3 rounded-xl font-black uppercase text-sm hover:bg-[#146332] transition-all"
                                    >
                                        Enregistrer
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Pied de page */}
                <div className="mt-8 text-center">
                    <p className="text-xs text-black/40 font-black uppercase tracking-wider">
                        Bureau Central Baliou Padra — Trésorerie consolidée
                    </p>
                </div>
            </div>
        </div>
    );
}