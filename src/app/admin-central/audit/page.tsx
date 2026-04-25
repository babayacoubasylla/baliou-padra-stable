"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft,
    Shield,
    Activity,
    Users,
    FileText,
    DollarSign,
    Calendar,
    Search,
    Filter,
    Download,
    RefreshCw,
    Eye,
    AlertTriangle,
    CheckCircle,
    Clock,
    TrendingUp,
    TrendingDown,
    Wallet,
    CreditCard,
    Receipt,
    Landmark,
    PieChart,
    BarChart3,
    X
} from 'lucide-react';

export default function AuditFinancierPage() {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState('versements');
    const [versements, setVersements] = useState([]);
    const [cotisations, setCotisations] = useState([]);
    const [depenses, setDepenses] = useState([]);
    const [propositions, setPropositions] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [stats, setStats] = useState({
        totalVersements: 0,
        totalCotisations: 0,
        totalDepenses: 0,
        soldeGlobal: 0,
        parGeneration: [],
        parMois: [],
        alertes: []
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [filterGeneration, setFilterGeneration] = useState('tous');
    const [filterStatut, setFilterStatut] = useState('tous');
    const [dateRange, setDateRange] = useState('tous');
    const [selectedItem, setSelectedItem] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [generations, setGenerations] = useState([]);
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

        await loadAllFinancialData();
        setLoading(false);
    };

    const loadAllFinancialData = async () => {
        setRefreshing(true);

        // 1. Charger les versements centraux
        const { data: versementsData } = await supabase
            .from('versements_centraux')
            .select('*')
            .order('date_versement', { ascending: false });

        setVersements(versementsData || []);

        // 2. Charger les cotisations
        const { data: cotisationsData } = await supabase
            .from('cotisations')
            .select('*, membres(nom_complet, generation)')
            .order('date_cotisation', { ascending: false });

        setCotisations(cotisationsData || []);

        // 3. Charger les dépenses centrales
        const { data: depensesData } = await supabase
            .from('depenses_centrales')
            .select('*')
            .order('date_depense', { ascending: false });

        setDepenses(depensesData || []);

        // 4. Charger les propositions budgétaires
        const { data: propositionsData } = await supabase
            .from('propositions_budgetaires')
            .select('*')
            .order('date_proposition', { ascending: false });

        setPropositions(propositionsData || []);

        // 5. Calculer les statistiques
        await calculateStats(versementsData || [], cotisationsData || [], depensesData || []);

        setGenerations(generationsList);
        setRefreshing(false);
    };

    const calculateStats = async (versementsData, cotisationsData, depensesData) => {
        // Total des versements validés
        const totalVersements = versementsData
            .filter(v => v.statut === 'valide')
            .reduce((sum, v) => sum + (v.montant || 0), 0);

        // Total des cotisations
        const totalCotisations = cotisationsData.reduce((sum, c) => sum + (c.montant || 0), 0);

        // Total des dépenses
        const totalDepenses = depensesData.reduce((sum, d) => sum + (d.montant || 0), 0);

        // Solde global
        const soldeGlobal = totalVersements + totalCotisations - totalDepenses;

        // Par génération
        const parGeneration = {};
        cotisationsData.forEach(c => {
            const gen = c.membres?.generation || 'Inconnu';
            parGeneration[gen] = (parGeneration[gen] || 0) + (c.montant || 0);
        });
        versementsData.forEach(v => {
            const gen = v.generation || 'Inconnu';
            parGeneration[gen] = (parGeneration[gen] || 0) + (v.montant || 0);
        });

        // Par mois
        const parMois = {};
        const allTransactions = [
            ...cotisationsData.map(c => ({ montant: c.montant, date: c.date_cotisation, type: 'cotisation' })),
            ...versementsData.map(v => ({ montant: v.montant, date: v.date_versement, type: 'versement' })),
            ...depensesData.map(d => ({ montant: -d.montant, date: d.date_depense, type: 'depense' }))
        ];
        allTransactions.forEach(t => {
            if (t.date) {
                const mois = new Date(t.date).toLocaleString('fr-FR', { month: 'long', year: 'numeric' });
                parMois[mois] = (parMois[mois] || 0) + t.montant;
            }
        });

        // Alertes financières
        const alertes = [];

        // Détecter les générations avec peu de cotisations
        for (const gen of generationsList) {
            const totalGen = parGeneration[gen] || 0;
            if (totalGen < 100000 && totalGen > 0) {
                alertes.push({
                    type: 'warning',
                    message: `${gen} a une collecte faible (${totalGen.toLocaleString()} FCFA)`,
                    generation: gen
                });
            }
        }

        // Vérifier les reversements en attente
        const enAttente = versementsData.filter(v => v.statut === 'en_attente').length;
        if (enAttente > 0) {
            alertes.push({
                type: 'info',
                message: `${enAttente} reversement(s) en attente de validation`
            });
        }

        // Vérifier le solde
        if (soldeGlobal < 0) {
            alertes.push({
                type: 'critical',
                message: `Solde négatif ! Déficit de ${Math.abs(soldeGlobal).toLocaleString()} FCFA`
            });
        }

        setStats({
            totalVersements,
            totalCotisations,
            totalDepenses,
            soldeGlobal,
            parGeneration: Object.entries(parGeneration).map(([gen, montant]) => ({ generation: gen, montant })).sort((a, b) => b.montant - a.montant),
            parMois: Object.entries(parMois).map(([mois, montant]) => ({ mois, montant })).slice(-12),
            alertes
        });
    };

    const applyFilters = () => {
        let data = [];

        if (activeTab === 'versements') {
            data = [...versements];

            if (filterGeneration !== 'tous') {
                data = data.filter(v => v.generation === filterGeneration);
            }
            if (filterStatut !== 'tous') {
                data = data.filter(v => v.statut === filterStatut);
            }
            if (searchTerm) {
                data = data.filter(v =>
                    v.generation?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    v.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    v.montant?.toString().includes(searchTerm)
                );
            }
        }
        else if (activeTab === 'cotisations') {
            data = [...cotisations];

            if (filterGeneration !== 'tous') {
                data = data.filter(c => c.membres?.generation === filterGeneration);
            }
            if (searchTerm) {
                data = data.filter(c =>
                    c.membres?.nom_complet?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    c.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    c.montant?.toString().includes(searchTerm)
                );
            }
        }
        else if (activeTab === 'depenses') {
            data = [...depenses];

            if (searchTerm) {
                data = data.filter(d =>
                    d.libelle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    d.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    d.montant?.toString().includes(searchTerm)
                );
            }
        }
        else if (activeTab === 'propositions') {
            data = [...propositions];

            if (filterGeneration !== 'tous') {
                data = data.filter(p => p.generation_nom === filterGeneration);
            }
            if (filterStatut !== 'tous') {
                data = data.filter(p => p.statut === filterStatut);
            }
        }

        // Filtre par date
        if (dateRange !== 'tous') {
            const now = new Date();
            let startDate;
            if (dateRange === 'aujourdhui') {
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            } else if (dateRange === 'semaine') {
                startDate = new Date(now);
                startDate.setDate(now.getDate() - 7);
            } else if (dateRange === 'mois') {
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            }
            if (startDate) {
                data = data.filter(item => new Date(item.date_versement || item.date_cotisation || item.date_depense || item.date_proposition) >= startDate);
            }
        }

        setFilteredData(data);
    };

    useEffect(() => {
        applyFilters();
    }, [activeTab, versements, cotisations, depenses, propositions, filterGeneration, filterStatut, searchTerm, dateRange]);

    const formatMontant = (montant) => {
        return new Intl.NumberFormat('fr-FR').format(montant) + ' FCFA';
    };

    const getStatutBadge = (statut) => {
        switch (statut) {
            case 'valide':
                return <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-black flex items-center gap-1"><CheckCircle size={12} /> Validé</span>;
            case 'rejete':
                return <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-black flex items-center gap-1"><AlertTriangle size={12} /> Rejeté</span>;
            case 'en_attente':
                return <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-black flex items-center gap-1"><Clock size={12} /> En attente</span>;
            default:
                return <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs font-black">{statut || '—'}</span>;
        }
    };

    const getTypeBadge = (type) => {
        switch (type) {
            case 'sibity':
                return <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-black">📿 Sibity</span>;
            case 'mensualite':
                return <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-black">📅 Mensualité</span>;
            default:
                return <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs font-black">{type}</span>;
        }
    };

    const exportData = () => {
        let dataToExport = filteredData;
        let headers = [];
        let rows = [];

        if (activeTab === 'versements') {
            headers = ['Date', 'Génération', 'Montant', 'Statut', 'Description'];
            rows = dataToExport.map(v => [
                new Date(v.date_versement).toLocaleDateString(),
                v.generation,
                v.montant,
                v.statut,
                v.description || ''
            ]);
        } else if (activeTab === 'cotisations') {
            headers = ['Date', 'Membre', 'Génération', 'Type', 'Montant'];
            rows = dataToExport.map(c => [
                new Date(c.date_cotisation).toLocaleDateString(),
                c.membres?.nom_complet || 'Inconnu',
                c.membres?.generation || 'Inconnu',
                c.type,
                c.montant
            ]);
        } else if (activeTab === 'depenses') {
            headers = ['Date', 'Libellé', 'Montant', 'Catégorie', 'Description'];
            rows = dataToExport.map(d => [
                new Date(d.date_depense).toLocaleDateString(),
                d.libelle,
                d.montant,
                d.categorie || '—',
                d.description || ''
            ]);
        }

        const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit_financier_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin text-4xl mb-4">⏳</div>
                    <p className="text-2xl font-black text-black">Chargement de l'audit financier...</p>
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
                                AUDIT FINANCIER
                            </h1>
                            <div className="h-1 w-32 bg-black mt-2"></div>
                            <p className="text-black/60 mt-2">Traçabilité complète des flux financiers</p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={exportData}
                                className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-xl font-black text-sm hover:bg-[#146332] transition-all"
                                disabled={filteredData.length === 0}
                            >
                                <Download size={16} /> Exporter CSV
                            </button>
                            <button
                                onClick={loadAllFinancialData}
                                disabled={refreshing}
                                className="flex items-center gap-2 bg-gray-200 text-black px-4 py-2 rounded-xl font-black text-sm hover:bg-gray-300 transition-all"
                            >
                                <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                                Actualiser
                            </button>
                        </div>
                    </div>
                </div>

                {/* Alertes financières */}
                {stats.alertes.length > 0 && (
                    <div className="mb-6 space-y-2">
                        {stats.alertes.map((alerte, idx) => (
                            <div key={idx} className={`border-4 border-black rounded-2xl p-4 ${alerte.type === 'critical' ? 'bg-red-50 border-red-500' :
                                    alerte.type === 'warning' ? 'bg-yellow-50 border-yellow-500' :
                                        'bg-blue-50 border-blue-500'
                                }`}>
                                <div className="flex items-center gap-3">
                                    {alerte.type === 'critical' && <AlertTriangle className="text-red-600" size={20} />}
                                    {alerte.type === 'warning' && <AlertTriangle className="text-yellow-600" size={20} />}
                                    {alerte.type === 'info' && <Clock className="text-blue-600" size={20} />}
                                    <p className={`font-black ${alerte.type === 'critical' ? 'text-red-800' :
                                            alerte.type === 'warning' ? 'text-yellow-800' :
                                                'text-blue-800'
                                        }`}>{alerte.message}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Cartes de synthèse financière */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white border-4 border-black rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <TrendingUp size={18} className="text-green-600" />
                            <p className="text-xs font-black uppercase text-black/50">Total versements</p>
                        </div>
                        <p className="text-xl font-black text-green-600">{formatMontant(stats.totalVersements)}</p>
                    </div>
                    <div className="bg-white border-4 border-black rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Receipt size={18} className="text-blue-600" />
                            <p className="text-xs font-black uppercase text-black/50">Total cotisations</p>
                        </div>
                        <p className="text-xl font-black text-blue-600">{formatMontant(stats.totalCotisations)}</p>
                    </div>
                    <div className="bg-white border-4 border-black rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <TrendingDown size={18} className="text-red-600" />
                            <p className="text-xs font-black uppercase text-black/50">Total dépenses</p>
                        </div>
                        <p className="text-xl font-black text-red-600">{formatMontant(stats.totalDepenses)}</p>
                    </div>
                    <div className="bg-white border-4 border-black rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Landmark size={18} className="text-black" />
                            <p className="text-xs font-black uppercase text-black/50">Solde global</p>
                        </div>
                        <p className={`text-xl font-black ${stats.soldeGlobal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatMontant(stats.soldeGlobal)}
                        </p>
                    </div>
                </div>

                {/* Graphique par génération */}
                <div className="bg-white border-4 border-black rounded-2xl p-6 mb-6">
                    <h3 className="font-black text-black mb-4 flex items-center gap-2">
                        <BarChart3 size={18} /> Contribution par génération
                    </h3>
                    <div className="space-y-3">
                        {stats.parGeneration.slice(0, 10).map((item, idx) => (
                            <div key={item.generation}>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="font-black text-black">{item.generation}</span>
                                    <span className="font-black text-black/60">{formatMontant(item.montant)}</span>
                                </div>
                                <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden border border-black">
                                    <div
                                        className="h-full bg-green-500 rounded-full"
                                        style={{ width: `${Math.min(100, (item.montant / (stats.totalVersements + stats.totalCotisations)) * 100)}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Évolution mensuelle */}
                <div className="bg-white border-4 border-black rounded-2xl p-6 mb-6">
                    <h3 className="font-black text-black mb-4 flex items-center gap-2">
                        <TrendingUp size={18} /> Évolution mensuelle des flux
                    </h3>
                    <div className="space-y-3">
                        {stats.parMois.map((item, idx) => (
                            <div key={idx}>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="font-black text-black">{item.mois}</span>
                                    <span className={`font-black ${item.montant >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {item.montant >= 0 ? '+' : '-'}{formatMontant(Math.abs(item.montant))}
                                    </span>
                                </div>
                                <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden border border-black">
                                    <div
                                        className={`h-full ${item.montant >= 0 ? 'bg-green-500' : 'bg-red-500'} rounded-full`}
                                        style={{ width: `${Math.min(100, Math.abs(item.montant) / 1000000)}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Filtres */}
                <div className="bg-white border-4 border-black rounded-2xl p-6 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-black font-black text-sm mb-1">🔍 Recherche</label>
                            <input
                                type="text"
                                placeholder="Génération, montant..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full p-2 border-4 border-black rounded-xl font-black text-sm text-black bg-white focus:bg-yellow-50 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-black font-black text-sm mb-1">🏷️ Génération</label>
                            <select
                                value={filterGeneration}
                                onChange={(e) => setFilterGeneration(e.target.value)}
                                className="w-full p-2 border-4 border-black rounded-xl font-black text-sm text-black bg-white focus:bg-yellow-50 outline-none"
                            >
                                <option value="tous">Toutes les générations</option>
                                {generationsList.map(gen => (
                                    <option key={gen} value={gen}>{gen}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-black font-black text-sm mb-1">⚡ Statut</label>
                            <select
                                value={filterStatut}
                                onChange={(e) => setFilterStatut(e.target.value)}
                                className="w-full p-2 border-4 border-black rounded-xl font-black text-sm text-black bg-white focus:bg-yellow-50 outline-none"
                            >
                                <option value="tous">Tous les statuts</option>
                                <option value="valide">Validé</option>
                                <option value="en_attente">En attente</option>
                                <option value="rejete">Rejeté</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-black font-black text-sm mb-1">📅 Période</label>
                            <select
                                value={dateRange}
                                onChange={(e) => setDateRange(e.target.value)}
                                className="w-full p-2 border-4 border-black rounded-xl font-black text-sm text-black bg-white focus:bg-yellow-50 outline-none"
                            >
                                <option value="tous">Toute la période</option>
                                <option value="aujourdhui">Aujourd'hui</option>
                                <option value="semaine">Cette semaine</option>
                                <option value="mois">Ce mois</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Onglets */}
                <div className="flex flex-wrap gap-2 border-b-4 border-black mb-6">
                    <button
                        onClick={() => setActiveTab('versements')}
                        className={`px-6 py-3 font-black uppercase text-sm transition-all flex items-center gap-2 ${activeTab === 'versements' ? 'bg-black text-white rounded-t-2xl' : 'text-black'}`}
                    >
                        <DollarSign size={16} /> Reversements
                    </button>
                    <button
                        onClick={() => setActiveTab('cotisations')}
                        className={`px-6 py-3 font-black uppercase text-sm transition-all flex items-center gap-2 ${activeTab === 'cotisations' ? 'bg-black text-white rounded-t-2xl' : 'text-black'}`}
                    >
                        <Receipt size={16} /> Cotisations
                    </button>
                    <button
                        onClick={() => setActiveTab('depenses')}
                        className={`px-6 py-3 font-black uppercase text-sm transition-all flex items-center gap-2 ${activeTab === 'depenses' ? 'bg-black text-white rounded-t-2xl' : 'text-black'}`}
                    >
                        <Wallet size={16} /> Dépenses
                    </button>
                    <button
                        onClick={() => setActiveTab('propositions')}
                        className={`px-6 py-3 font-black uppercase text-sm transition-all flex items-center gap-2 ${activeTab === 'propositions' ? 'bg-black text-white rounded-t-2xl' : 'text-black'}`}
                    >
                        <FileText size={16} /> Propositions budgétaires
                    </button>
                </div>

                {/* Tableau des données */}
                <div className="bg-white border-4 border-black rounded-2xl overflow-hidden">
                    <div className="bg-black p-4">
                        <h2 className="text-white font-black uppercase text-sm">
                            {activeTab === 'versements' && '💰 Historique des reversements'}
                            {activeTab === 'cotisations' && '📋 Historique des cotisations'}
                            {activeTab === 'depenses' && '💸 Historique des dépenses'}
                            {activeTab === 'propositions' && '📝 Propositions budgétaires'}
                        </h2>
                    </div>
                    {filteredData.length === 0 ? (
                        <div className="p-12 text-center">
                            <Shield size={48} className="mx-auto text-black/30 mb-4" />
                            <p className="text-xl font-black text-black/60 italic">Aucune donnée trouvée</p>
                            <p className="text-black/40 mt-2">Modifiez les filtres pour voir plus de résultats</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-100">
                                    <tr>
                                        {activeTab === 'versements' && (
                                            <>
                                                <th className="p-3 text-left font-black text-sm">Date</th>
                                                <th className="p-3 text-left font-black text-sm">Génération</th>
                                                <th className="p-3 text-right font-black text-sm">Montant</th>
                                                <th className="p-3 text-left font-black text-sm">Statut</th>
                                                <th className="p-3 text-left font-black text-sm">Description</th>
                                            </>
                                        )}
                                        {activeTab === 'cotisations' && (
                                            <>
                                                <th className="p-3 text-left font-black text-sm">Date</th>
                                                <th className="p-3 text-left font-black text-sm">Membre</th>
                                                <th className="p-3 text-left font-black text-sm">Génération</th>
                                                <th className="p-3 text-left font-black text-sm">Type</th>
                                                <th className="p-3 text-right font-black text-sm">Montant</th>
                                            </>
                                        )}
                                        {activeTab === 'depenses' && (
                                            <>
                                                <th className="p-3 text-left font-black text-sm">Date</th>
                                                <th className="p-3 text-left font-black text-sm">Libellé</th>
                                                <th className="p-3 text-left font-black text-sm">Catégorie</th>
                                                <th className="p-3 text-right font-black text-sm">Montant</th>
                                                <th className="p-3 text-left font-black text-sm">Description</th>
                                            </>
                                        )}
                                        {activeTab === 'propositions' && (
                                            <>
                                                <th className="p-3 text-left font-black text-sm">Date</th>
                                                <th className="p-3 text-left font-black text-sm">Génération</th>
                                                <th className="p-3 text-right font-black text-sm">Montant</th>
                                                <th className="p-3 text-left font-black text-sm">Statut</th>
                                                <th className="p-3 text-left font-black text-sm">Description</th>
                                            </>
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredData.slice(0, 50).map((item, idx) => (
                                        <tr key={idx} className="border-b border-black/10 hover:bg-gray-50 transition-colors">
                                            {activeTab === 'versements' && (
                                                <>
                                                    <td className="p-3 text-black/60 text-sm">{new Date(item.date_versement).toLocaleDateString()}</td>
                                                    <td className="p-3 font-black text-black">{item.generation}</td>
                                                    <td className="p-3 text-right font-black text-green-600">{formatMontant(item.montant)}</td>
                                                    <td className="p-3">{getStatutBadge(item.statut)}</td>
                                                    <td className="p-3 text-black/70 text-sm">{item.description || '—'}</td>
                                                </>
                                            )}
                                            {activeTab === 'cotisations' && (
                                                <>
                                                    <td className="p-3 text-black/60 text-sm">{new Date(item.date_cotisation).toLocaleDateString()}</td>
                                                    <td className="p-3 font-black text-black">{item.membres?.nom_complet || 'Inconnu'}</td>
                                                    <td className="p-3 text-black/70">{item.membres?.generation || 'Inconnu'}</td>
                                                    <td className="p-3">{getTypeBadge(item.type)}</td>
                                                    <td className="p-3 text-right font-black text-green-600">{formatMontant(item.montant)}</td>
                                                </>
                                            )}
                                            {activeTab === 'depenses' && (
                                                <>
                                                    <td className="p-3 text-black/60 text-sm">{new Date(item.date_depense).toLocaleDateString()}</td>
                                                    <td className="p-3 font-black text-black">{item.libelle}</td>
                                                    <td className="p-3 text-black/70">{item.categorie || '—'}</td>
                                                    <td className="p-3 text-right font-black text-red-600">{formatMontant(item.montant)}</td>
                                                    <td className="p-3 text-black/70 text-sm">{item.description || '—'}</td>
                                                </>
                                            )}
                                            {activeTab === 'propositions' && (
                                                <>
                                                    <td className="p-3 text-black/60 text-sm">{new Date(item.date_proposition).toLocaleDateString()}</td>
                                                    <td className="p-3 font-black text-black">{item.generation_nom}</td>
                                                    <td className="p-3 text-right font-black text-blue-600">{formatMontant(item.montant_propose)}</td>
                                                    <td className="p-3">{getStatutBadge(item.statut)}</td>
                                                    <td className="p-3 text-black/70 text-sm">{item.description || '—'}</td>
                                                </>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Pied de page */}
                <div className="mt-6 text-center">
                    <p className="text-xs text-black/40 font-black uppercase tracking-wider">
                        Bureau Central Baliou Padra — Audit financier complet
                    </p>
                </div>
            </div>
        </div>
    );
}