"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft,
    TrendingUp,
    TrendingDown,
    Users,
    DollarSign,
    Calendar,
    Download,
    RefreshCw,
    PieChart,
    BarChart3,
    LineChart,
    Activity,
    Award,
    Clock,
    CheckCircle,
    XCircle,
    Wallet,
    Landmark,
    Receipt,
    CreditCard,
    UserCheck,
    UserPlus,
    UserX,
    Building2,
    Target,
    AlertTriangle,
    Crown,
    Medal,
    Star,
    Zap
} from 'lucide-react';

export default function StatsPage() {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activePeriod, setActivePeriod] = useState('year'); // month, quarter, year, all
    const [stats, setStats] = useState({
        // Membres
        membres: {
            total: 0,
            actifs: 0,
            nouveauxMois: 0,
            nouveauxAnnee: 0,
            parGeneration: [],
            parVille: [],
            parRole: [],
            evolutionMensuelle: []
        },
        // Finances
        finances: {
            totalCotisations: 0,
            totalVersements: 0,
            totalDepenses: 0,
            soldeGlobal: 0,
            parType: { sibity: 0, mensualite: 0, extraordinaire: 0 },
            parGeneration: [],
            evolutionMensuelle: [],
            objectifs: {
                atteints: 0,
                enCours: 0,
                nonAtteints: 0
            }
        },
        // Reversements
        reversements: {
            total: 0,
            valides: 0,
            enAttente: 0,
            rejetes: 0,
            montantTotal: 0,
            parGeneration: [],
            tendance: 0
        },
        // Cotisations extraordinaires
        cotisationsExtra: {
            total: 0,
            actives: 0,
            terminees: 0,
            collecteTotale: 0
        },
        // Performance
        performance: {
            meilleureGeneration: '',
            meilleureCollecte: 0,
            membrePlusActif: '',
            moisRecord: '',
            tauxValidation: 0,
            progressionAnnuelle: 0
        }
    });
    const router = useRouter();

    // Liste des générations
    const generationsList = [
        "Génération Wassalah dramane",
        "Génération Dramane konté",
        "Génération kissima",
        "Génération maramou basseyabané",
        "Génération khadja bah baya",
        "Génération antankhoulé passokhona",
        "Génération Mamery",
        "Génération makhadja baliou",
        "Génération kissima bah",
        "Génération tchamba",
        "Diaspora"
    ];

    useEffect(() => {
        checkAuthAndLoadData();
    }, [activePeriod]);

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

        await loadAllStats();
        setLoading(false);
    };

    const getDateFilter = () => {
        const now = new Date();
        if (activePeriod === 'month') {
            const start = new Date(now.getFullYear(), now.getMonth(), 1);
            return { start, end: now };
        } else if (activePeriod === 'quarter') {
            const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
            return { start: quarterStart, end: now };
        } else if (activePeriod === 'year') {
            const start = new Date(now.getFullYear(), 0, 1);
            return { start, end: now };
        }
        return { start: null, end: now };
    };

    const loadAllStats = async () => {
        setRefreshing(true);
        const { start, end } = getDateFilter();

        // 1. Statistiques des membres
        const { data: membresData } = await supabase
            .from('membres')
            .select('*');

        const membres = membresData || [];

        // Membres par génération
        const parGeneration = {};
        const parVille = {};
        const parRole = {};
        membres.forEach(m => {
            if (m.generation) parGeneration[m.generation] = (parGeneration[m.generation] || 0) + 1;
            if (m.ville_residence) parVille[m.ville_residence] = (parVille[m.ville_residence] || 0) + 1;
            if (m.role) parRole[m.role] = (parRole[m.role] || 0) + 1;
        });

        // Nouveaux membres sur la période
        let nouveauxMois = 0;
        let nouveauxAnnee = 0;
        if (start) {
            nouveauxMois = membres.filter(m => new Date(m.created_at) >= start).length;
        }
        nouveauxAnnee = membres.filter(m => new Date(m.created_at).getFullYear() === new Date().getFullYear()).length;

        // Évolution mensuelle des inscriptions
        const evolutionMensuelle = {};
        membres.forEach(m => {
            if (m.created_at) {
                const mois = new Date(m.created_at).toLocaleString('fr-FR', { month: 'short', year: 'numeric' });
                evolutionMensuelle[mois] = (evolutionMensuelle[mois] || 0) + 1;
            }
        });

        // 2. Statistiques financières
        const { data: cotisationsData } = await supabase
            .from('cotisations')
            .select('*, membres(generation)');

        const { data: versementsData } = await supabase
            .from('versements_centraux')
            .select('*');

        const { data: depensesData } = await supabase
            .from('depenses_centrales')
            .select('*');

        const cotisations = cotisationsData || [];
        const versements = versementsData || [];
        const depenses = depensesData || [];

        // Totaux par type
        let totalSibity = 0;
        let totalMensualite = 0;
        let totalExtra = 0;
        cotisations.forEach(c => {
            if (c.type === 'sibity') totalSibity += c.montant || 0;
            else if (c.type === 'mensualite') totalMensualite += c.montant || 0;
        });
        versements.forEach(v => {
            if (v.type === 'extraordinaire') totalExtra += v.montant || 0;
        });

        const totalCotisations = totalSibity + totalMensualite;
        const totalVersements = versements.filter(v => v.statut === 'valide').reduce((s, v) => s + (v.montant || 0), 0);
        const totalDepensesVal = depenses.reduce((s, d) => s + (d.montant || 0), 0);
        const soldeGlobal = totalCotisations + totalVersements - totalDepensesVal;

        // Finances par génération
        const financesParGeneration = {};
        cotisations.forEach(c => {
            const gen = c.membres?.generation || 'Inconnu';
            financesParGeneration[gen] = (financesParGeneration[gen] || 0) + (c.montant || 0);
        });
        versements.forEach(v => {
            if (v.statut === 'valide') {
                const gen = v.generation || 'Inconnu';
                financesParGeneration[gen] = (financesParGeneration[gen] || 0) + (v.montant || 0);
            }
        });

        // Évolution financière mensuelle
        const evolutionFinanciere = {};
        const allTransactions = [
            ...cotisations.map(c => ({ montant: c.montant, date: c.date_cotisation })),
            ...versements.map(v => ({ montant: v.montant, date: v.date_versement })),
            ...depenses.map(d => ({ montant: -d.montant, date: d.date_depense }))
        ];
        allTransactions.forEach(t => {
            if (t.date) {
                const mois = new Date(t.date).toLocaleString('fr-FR', { month: 'short', year: 'numeric' });
                evolutionFinanciere[mois] = (evolutionFinanciere[mois] || 0) + (t.montant || 0);
            }
        });

        // Objectifs
        const { data: propositionsData } = await supabase
            .from('propositions_budgetaires')
            .select('*');

        const propositions = propositionsData || [];
        const objectifsAtteints = propositions.filter(p => p.statut === 'valide').length;
        const objectifsEnCours = propositions.filter(p => p.statut === 'en_attente').length;
        const objectifsNonAtteints = propositions.filter(p => p.statut === 'rejete').length;

        // 3. Statistiques des reversements
        const reversementsValides = versements.filter(v => v.statut === 'valide').length;
        const reversementsEnAttente = versements.filter(v => v.statut === 'en_attente').length;
        const reversementsRejetes = versements.filter(v => v.statut === 'rejete').length;

        const reversementsParGeneration = {};
        versements.forEach(v => {
            if (v.statut === 'valide') {
                const gen = v.generation || 'Inconnu';
                reversementsParGeneration[gen] = (reversementsParGeneration[gen] || 0) + (v.montant || 0);
            }
        });

        // 4. Cotisations extraordinaires
        const { data: cotisationsExtraData } = await supabase
            .from('cotisations_extraordinaires')
            .select('*');

        const cotisationsExtra = cotisationsExtraData || [];
        const cotisExtraActives = cotisationsExtra.filter(c => c.statut === 'active').length;
        const cotisExtraTerminees = cotisationsExtra.filter(c => c.statut === 'terminee').length;
        const collecteExtraTotale = cotisationsExtra.reduce((s, c) => s + (c.montant_requis || 0), 0);

        // 5. Performance
        let meilleureGeneration = '';
        let meilleureCollecte = 0;
        Object.entries(financesParGeneration).forEach(([gen, montant]) => {
            if (montant > meilleureCollecte) {
                meilleureCollecte = montant;
                meilleureGeneration = gen;
            }
        });

        // Membre le plus actif
        let membrePlusActif = '';
        let maxCotisations = 0;
        const cotisationsParMembre = {};
        cotisations.forEach(c => {
            const nom = c.membres?.nom_complet || 'Inconnu';
            cotisationsParMembre[nom] = (cotisationsParMembre[nom] || 0) + 1;
            if (cotisationsParMembre[nom] > maxCotisations) {
                maxCotisations = cotisationsParMembre[nom];
                membrePlusActif = nom;
            }
        });

        // Mois record
        let moisRecord = '';
        let maxMoisMontant = 0;
        Object.entries(evolutionFinanciere).forEach(([mois, montant]) => {
            if (montant > maxMoisMontant) {
                maxMoisMontant = montant;
                moisRecord = mois;
            }
        });

        // Taux de validation des reversements
        const tauxValidation = versements.length > 0 ? (reversementsValides / versements.length) * 100 : 0;

        // Progression annuelle
        const anneeDerniere = new Date().getFullYear() - 1;
        const cotisationsAnneeDerniere = cotisations.filter(c => new Date(c.date_cotisation).getFullYear() === anneeDerniere).reduce((s, c) => s + (c.montant || 0), 0);
        const progressionAnnuelle = cotisationsAnneeDerniere > 0 ? ((totalCotisations - cotisationsAnneeDerniere) / cotisationsAnneeDerniere) * 100 : 0;

        setStats({
            membres: {
                total: membres.length,
                actifs: membres.filter(m => m.est_valide === true).length,
                nouveauxMois,
                nouveauxAnnee,
                parGeneration: Object.entries(parGeneration).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
                parVille: Object.entries(parVille).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 10),
                parRole: Object.entries(parRole).map(([name, count]) => ({ name, count })),
                evolutionMensuelle: Object.entries(evolutionMensuelle).map(([mois, count]) => ({ mois, count })).slice(-12)
            },
            finances: {
                totalCotisations,
                totalVersements,
                totalDepenses: totalDepensesVal,
                soldeGlobal,
                parType: { sibity: totalSibity, mensualite: totalMensualite, extraordinaire: totalExtra },
                parGeneration: Object.entries(financesParGeneration).map(([name, montant]) => ({ name, montant })).sort((a, b) => b.montant - a.montant),
                evolutionMensuelle: Object.entries(evolutionFinanciere).map(([mois, montant]) => ({ mois, montant })).slice(-12),
                objectifs: {
                    atteints: objectifsAtteints,
                    enCours: objectifsEnCours,
                    nonAtteints: objectifsNonAtteints
                }
            },
            reversements: {
                total: versements.length,
                valides: reversementsValides,
                enAttente: reversementsEnAttente,
                rejetes: reversementsRejetes,
                montantTotal: totalVersements,
                parGeneration: Object.entries(reversementsParGeneration).map(([name, montant]) => ({ name, montant })).sort((a, b) => b.montant - a.montant),
                tendance: reversementsValides > reversementsEnAttente ? 1 : -1
            },
            cotisationsExtra: {
                total: cotisationsExtra.length,
                actives: cotisExtraActives,
                terminees: cotisExtraTerminees,
                collecteTotale: collecteExtraTotale
            },
            performance: {
                meilleureGeneration,
                meilleureCollecte,
                membrePlusActif: membrePlusActif || 'Aucun',
                moisRecord,
                tauxValidation,
                progressionAnnuelle
            }
        });

        setRefreshing(false);
    };

    const formatMontant = (montant) => {
        return new Intl.NumberFormat('fr-FR').format(montant) + ' FCFA';
    };

    const exportStats = () => {
        const data = {
            date: new Date().toISOString(),
            periode: activePeriod,
            stats
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `statistiques_baliou_padra_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin text-4xl mb-4">⏳</div>
                    <p className="text-2xl font-black text-black">Chargement des statistiques...</p>
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
                                TABLEAU DE BORD STATISTIQUE
                            </h1>
                            <div className="h-1 w-32 bg-black mt-2"></div>
                            <p className="text-black/60 mt-2">Analyse complète des données de la communauté</p>
                        </div>
                        <div className="flex gap-3">
                            <div className="flex border-4 border-black rounded-xl overflow-hidden">
                                <button
                                    onClick={() => setActivePeriod('month')}
                                    className={`px-4 py-2 font-black text-sm ${activePeriod === 'month' ? 'bg-black text-white' : 'bg-white text-black'}`}
                                >
                                    Mois
                                </button>
                                <button
                                    onClick={() => setActivePeriod('quarter')}
                                    className={`px-4 py-2 font-black text-sm ${activePeriod === 'quarter' ? 'bg-black text-white' : 'bg-white text-black'}`}
                                >
                                    Trimestre
                                </button>
                                <button
                                    onClick={() => setActivePeriod('year')}
                                    className={`px-4 py-2 font-black text-sm ${activePeriod === 'year' ? 'bg-black text-white' : 'bg-white text-black'}`}
                                >
                                    Année
                                </button>
                                <button
                                    onClick={() => setActivePeriod('all')}
                                    className={`px-4 py-2 font-black text-sm ${activePeriod === 'all' ? 'bg-black text-white' : 'bg-white text-black'}`}
                                >
                                    Total
                                </button>
                            </div>
                            <button
                                onClick={exportStats}
                                className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-xl font-black text-sm hover:bg-[#146332] transition-all"
                            >
                                <Download size={16} /> Exporter
                            </button>
                            <button
                                onClick={loadAllStats}
                                disabled={refreshing}
                                className="flex items-center gap-2 bg-gray-200 text-black px-4 py-2 rounded-xl font-black text-sm hover:bg-gray-300 transition-all"
                            >
                                <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                                Actualiser
                            </button>
                        </div>
                    </div>
                </div>

                {/* KPIs Principaux */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
                    <KpiCard
                        title="Membres"
                        value={stats.membres.total}
                        subtitle={`+${stats.membres.nouveauxMois} ce mois`}
                        icon={<Users size={20} />}
                        color="bg-blue-500"
                    />
                    <KpiCard
                        title="Cotisations"
                        value={formatMontant(stats.finances.totalCotisations)}
                        icon={<Receipt size={20} />}
                        color="bg-green-500"
                    />
                    <KpiCard
                        title="Versements"
                        value={formatMontant(stats.finances.totalVersements)}
                        icon={<TrendingUp size={20} />}
                        color="bg-purple-500"
                    />
                    <KpiCard
                        title="Dépenses"
                        value={formatMontant(stats.finances.totalDepenses)}
                        icon={<TrendingDown size={20} />}
                        color="bg-red-500"
                    />
                    <KpiCard
                        title="Solde"
                        value={formatMontant(stats.finances.soldeGlobal)}
                        icon={<Landmark size={20} />}
                        color={stats.finances.soldeGlobal >= 0 ? 'bg-green-600' : 'bg-red-600'}
                    />
                    <KpiCard
                        title="Validation"
                        value={`${stats.performance.tauxValidation.toFixed(1)}%`}
                        icon={<CheckCircle size={20} />}
                        color="bg-yellow-500"
                    />
                </div>

                {/* Performance et Records */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <RecordCard
                        title="Meilleure génération"
                        value={stats.performance.meilleureGeneration || '—'}
                        subtitle={formatMontant(stats.performance.meilleureCollecte)}
                        icon={<Crown size={24} className="text-yellow-500" />}
                    />
                    <RecordCard
                        title="Membre le plus actif"
                        value={stats.performance.membrePlusActif}
                        subtitle="Plus grand nombre de cotisations"
                        icon={<Medal size={24} className="text-blue-500" />}
                    />
                    <RecordCard
                        title="Mois record"
                        value={stats.performance.moisRecord || '—'}
                        subtitle={formatMontant(stats.evolutionFinanciere?.find(e => e.mois === stats.performance.moisRecord)?.montant || 0)}
                        icon={<Zap size={24} className="text-orange-500" />}
                    />
                    <RecordCard
                        title="Progression annuelle"
                        value={`${stats.performance.progressionAnnuelle >= 0 ? '+' : ''}${stats.performance.progressionAnnuelle.toFixed(1)}%`}
                        subtitle="vs année précédente"
                        icon={<TrendingUp size={24} className={stats.performance.progressionAnnuelle >= 0 ? 'text-green-500' : 'text-red-500'} />}
                    />
                </div>

                {/* Graphique principal - Évolution financière */}
                <div className="bg-white border-4 border-black rounded-2xl p-6 mb-6">
                    <h3 className="font-black text-black mb-4 flex items-center gap-2">
                        <LineChart size={18} /> Évolution financière
                    </h3>
                    <div className="space-y-3">
                        {stats.finances.evolutionMensuelle.map((item, idx) => (
                            <div key={idx}>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="font-black text-black">{item.mois}</span>
                                    <span className={`font-black ${item.montant >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {item.montant >= 0 ? '+' : '-'}{formatMontant(Math.abs(item.montant))}
                                    </span>
                                </div>
                                <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden border border-black">
                                    <div
                                        className={`h-full ${item.montant >= 0 ? 'bg-green-500' : 'bg-red-500'} rounded-full transition-all duration-500`}
                                        style={{ width: `${Math.min(100, Math.abs(item.montant) / 1000000)}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* Répartition des cotisations par type */}
                    <div className="bg-white border-4 border-black rounded-2xl p-6">
                        <h3 className="font-black text-black mb-4 flex items-center gap-2">
                            <PieChart size={18} /> Répartition des cotisations
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between mb-1">
                                    <span className="font-black text-black">📿 Sibity</span>
                                    <span className="font-black text-black/70">{formatMontant(stats.finances.parType.sibity)}</span>
                                </div>
                                <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                                    <div className="h-full bg-purple-500 rounded-full" style={{ width: `${(stats.finances.parType.sibity / (stats.finances.totalCotisations || 1)) * 100}%` }}></div>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between mb-1">
                                    <span className="font-black text-black">📅 Mensualités</span>
                                    <span className="font-black text-black/70">{formatMontant(stats.finances.parType.mensualite)}</span>
                                </div>
                                <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(stats.finances.parType.mensualite / (stats.finances.totalCotisations || 1)) * 100}%` }}></div>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between mb-1">
                                    <span className="font-black text-black">⚡ Extraordinaire</span>
                                    <span className="font-black text-black/70">{formatMontant(stats.finances.parType.extraordinaire)}</span>
                                </div>
                                <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                                    <div className="h-full bg-orange-500 rounded-full" style={{ width: `${(stats.finances.parType.extraordinaire / (stats.finances.totalCotisations || 1)) * 100}%` }}></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Top générations par contribution */}
                    <div className="bg-white border-4 border-black rounded-2xl p-6">
                        <h3 className="font-black text-black mb-4 flex items-center gap-2">
                            <Award size={18} /> Top générations par contribution
                        </h3>
                        <div className="space-y-3">
                            {stats.finances.parGeneration.slice(0, 5).map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center border-b border-black/10 py-2">
                                    <div className="flex items-center gap-3">
                                        <span className="text-xl font-black text-black/40">#{idx + 1}</span>
                                        <span className="font-black text-black">{item.name}</span>
                                    </div>
                                    <span className="font-black text-green-600">{formatMontant(item.montant)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                    {/* Évolution des membres */}
                    <div className="bg-white border-4 border-black rounded-2xl p-6">
                        <h3 className="font-black text-black mb-4 flex items-center gap-2">
                            <Users size={18} /> Évolution des membres
                        </h3>
                        <div className="space-y-2">
                            {stats.membres.evolutionMensuelle.slice(-6).map((item, idx) => (
                                <div key={idx} className="flex justify-between text-sm">
                                    <span className="text-black/70">{item.mois}</span>
                                    <span className="font-black text-black">+{item.count}</span>
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 pt-3 border-t-2 border-black/10">
                            <div className="flex justify-between">
                                <span className="text-black/70">Nouveaux ce mois</span>
                                <span className="font-black text-green-600">+{stats.membres.nouveauxMois}</span>
                            </div>
                            <div className="flex justify-between mt-1">
                                <span className="text-black/70">Nouveaux cette année</span>
                                <span className="font-black text-green-600">+{stats.membres.nouveauxAnnee}</span>
                            </div>
                        </div>
                    </div>

                    {/* État des reversements */}
                    <div className="bg-white border-4 border-black rounded-2xl p-6">
                        <h3 className="font-black text-black mb-4 flex items-center gap-2">
                            <Activity size={18} /> État des reversements
                        </h3>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="flex items-center gap-2"><CheckCircle size={16} className="text-green-500" /> Validés</span>
                                <span className="font-black text-green-600">{stats.reversements.valides}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="flex items-center gap-2"><Clock size={16} className="text-yellow-500" /> En attente</span>
                                <span className="font-black text-yellow-600">{stats.reversements.enAttente}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="flex items-center gap-2"><XCircle size={16} className="text-red-500" /> Rejetés</span>
                                <span className="font-black text-red-600">{stats.reversements.rejetes}</span>
                            </div>
                        </div>
                        <div className="mt-4 pt-3 border-t-2 border-black/10">
                            <div className="flex justify-between">
                                <span className="text-black/70">Montant total reversé</span>
                                <span className="font-black text-purple-600">{formatMontant(stats.reversements.montantTotal)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Objectifs budgétaires */}
                    <div className="bg-white border-4 border-black rounded-2xl p-6">
                        <h3 className="font-black text-black mb-4 flex items-center gap-2">
                            <Target size={18} /> Objectifs budgétaires
                        </h3>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="flex items-center gap-2"><CheckCircle size={16} className="text-green-500" /> Atteints</span>
                                <span className="font-black text-green-600">{stats.finances.objectifs.atteints}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="flex items-center gap-2"><Clock size={16} className="text-yellow-500" /> En cours</span>
                                <span className="font-black text-yellow-600">{stats.finances.objectifs.enCours}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="flex items-center gap-2"><AlertTriangle size={16} className="text-red-500" /> Non atteints</span>
                                <span className="font-black text-red-600">{stats.finances.objectifs.nonAtteints}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tableau des générations */}
                <div className="bg-white border-4 border-black rounded-2xl overflow-hidden">
                    <div className="bg-black p-4">
                        <h2 className="text-white font-black uppercase text-sm">📊 Performance par génération</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="p-3 text-left font-black text-sm">Génération</th>
                                    <th className="p-3 text-center font-black text-sm">Membres</th>
                                    <th className="p-3 text-right font-black text-sm">Cotisations</th>
                                    <th className="p-3 text-right font-black text-sm">Reversements</th>
                                    <th className="p-3 text-right font-black text-sm">Total</th>
                                    <th className="p-3 text-center font-black text-sm">Performance</th>
                                </tr>
                            </thead>
                            <tbody>
                                {generationsList.map((gen, idx) => {
                                    const membresCount = stats.membres.parGeneration.find(m => m.name === gen)?.count || 0;
                                    const cotisationsMontant = stats.finances.parGeneration.find(f => f.name === gen)?.montant || 0;
                                    const reversementsMontant = stats.reversements.parGeneration.find(r => r.name === gen)?.montant || 0;
                                    const total = cotisationsMontant + reversementsMontant;
                                    const maxTotal = stats.finances.parGeneration[0]?.montant || 1;
                                    const performance = (total / maxTotal) * 100;

                                    return (
                                        <tr key={idx} className="border-b border-black/10 hover:bg-gray-50 transition-colors">
                                            <td className="p-3 font-black text-black">{gen}</td>
                                            <td className="p-3 text-center text-black/70">{membresCount}</td>
                                            <td className="p-3 text-right text-green-600 font-black">{formatMontant(cotisationsMontant)}</td>
                                            <td className="p-3 text-right text-purple-600 font-black">{formatMontant(reversementsMontant)}</td>
                                            <td className="p-3 text-right text-blue-600 font-black">{formatMontant(total)}</td>
                                            <td className="p-3 text-center">
                                                <div className="w-full bg-gray-200 rounded-full h-2">
                                                    <div className="bg-green-500 h-2 rounded-full" style={{ width: `${performance}%` }}></div>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Pied de page */}
                <div className="mt-6 text-center">
                    <p className="text-xs text-black/40 font-black uppercase tracking-wider">
                        Bureau Central Baliou Padra — Tableau de bord statistique
                    </p>
                </div>
            </div>
        </div>
    );
}

// Composants auxiliaires
function KpiCard({ title, value, subtitle, icon, color }) {
    return (
        <div className="bg-white border-4 border-black rounded-2xl p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.1)]">
            <div className="flex items-center justify-between mb-2">
                <div className={`${color} p-2 rounded-xl text-white`}>
                    {icon}
                </div>
                <span className="text-xs font-black uppercase text-black/40">KPI</span>
            </div>
            <p className="text-xl font-black text-black">{value}</p>
            <p className="text-xs font-black uppercase text-black/50 mt-1">{title}</p>
            <p className="text-xl font-black text-black">{value}</p>
            <p className="text-xs font-black uppercase text-black/50 mt-1">{title}</p>
            {subtitle && <p className="text-xs text-black/40 mt-2">{subtitle}</p>}
        </div>
    );
}

function RecordCard({ title, value, subtitle, icon }) {
    return (
        <div className="bg-white border-4 border-black rounded-2xl p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.1)]">
            <div className="flex items-center gap-3 mb-2">
                {icon}
                <span className="text-xs font-black uppercase text-black/40">Record</span>
            </div>
            <p className="text-lg font-black text-black truncate">{value}</p>
            <p className="text-sm font-black text-black/70">{title}</p>
            {subtitle && <p className="text-xs text-black/40 mt-1">{subtitle}</p>}
        </div>
    );
}