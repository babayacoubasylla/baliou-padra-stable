"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft,
    Wallet,
    TrendingUp,
    TrendingDown,
    Users,
    Calendar,
    Download,
    RefreshCw,
    Plus,
    X,
    Search,
    DollarSign,
    Receipt,
    CreditCard,
    CheckCircle,
    Clock,
    AlertCircle,
    Printer,
    Eye,
    FileText,
    Send,
    Landmark,
    PieChart
} from 'lucide-react';

export default function TresorierDashboard() {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [user, setUser] = useState(null);
    const [generation, setGeneration] = useState(null);
    const [membres, setMembres] = useState([]);
    const [cotisations, setCotisations] = useState([]);
    const [stats, setStats] = useState({
        totalSibity: 0,
        totalMensualite: 0,
        totalGlobal: 0,
        objectif: 0,
        progression: 0,
        membresActifs: 0,
        tauxParticipation: 0
    });
    const [showAjoutModal, setShowAjoutModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedCotisation, setSelectedCotisation] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('tous');
    const [filterMois, setFilterMois] = useState('tous');
    const [formData, setFormData] = useState({
        membre_id: '',
        type: 'sibity',
        montant: '',
        date_cotisation: new Date().toISOString().split('T')[0],
        description: ''
    });
    const [visibilite, setVisibilite] = useState('prive');
    const router = useRouter();

    // Types de cotisation
    const typesCotisation = [
        { value: 'sibity', label: '📿 Sibity', montant_defaut: 5000 },
        { value: 'mensualite', label: '📅 Mensualité', montant_defaut: 10000 }
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

        // Vérifier que l'utilisateur est bien un trésorier
        const { data: profile } = await supabase
            .from('membres')
            .select('*')
            .eq('user_id', session.user.id)
            .maybeSingle();

        if (profile?.role !== 'tresorier') {
            router.push('/dashboard');
            return;
        }

        setUser(profile);

        if (profile.generation) {
            await loadGenerationData(profile.generation);
            await loadMembres(profile.generation);
            await loadCotisations(profile.generation);
        }

        setLoading(false);
    };

    const loadGenerationData = async (generationNom) => {
        const { data: genData } = await supabase
            .from('generations')
            .select('*')
            .eq('nom', generationNom)
            .maybeSingle();

        if (genData) {
            setGeneration(genData);
            setVisibilite(genData.visibilite_finances || 'prive');
        }
    };

    const loadMembres = async (generationNom) => {
        const { data } = await supabase
            .from('membres')
            .select('*')
            .eq('generation', generationNom)
            .eq('est_valide', true)
            .order('nom_complet', { ascending: true });

        setMembres(data || []);
    };

    const loadCotisations = async (generationNom) => {
        setRefreshing(true);

        // Récupérer les membres de la génération
        const { data: membresGen } = await supabase
            .from('membres')
            .select('id')
            .eq('generation', generationNom);

        const membreIds = membresGen?.map(m => m.id) || [];

        if (membreIds.length > 0) {
            const { data: cotisationsData } = await supabase
                .from('cotisations')
                .select('*, membres(nom_complet)')
                .in('membre_id', membreIds)
                .order('date_cotisation', { ascending: false });

            setCotisations(cotisationsData || []);
            await calculateStats(cotisationsData || [], membreIds);
        } else {
            setCotisations([]);
            setStats({
                totalSibity: 0,
                totalMensualite: 0,
                totalGlobal: 0,
                objectif: generation?.objectif_annuel || 0,
                progression: 0,
                membresActifs: 0,
                tauxParticipation: 0
            });
        }

        setRefreshing(false);
    };

    const calculateStats = async (cotisationsData, membreIds) => {
        let totalSibity = 0;
        let totalMensualite = 0;
        const membresPayeurs = new Set();

        cotisationsData.forEach(c => {
            if (c.type === 'sibity') {
                totalSibity += c.montant;
            } else if (c.type === 'mensualite') {
                totalMensualite += c.montant;
            }
            membresPayeurs.add(c.membre_id);
        });

        const totalGlobal = totalSibity + totalMensualite;
        const objectif = generation?.objectif_annuel || 0;
        const progression = objectif > 0 ? (totalGlobal / objectif) * 100 : 0;
        const membresActifs = membresPayeurs.size;
        const tauxParticipation = membreIds.length > 0 ? (membresActifs / membreIds.length) * 100 : 0;

        setStats({
            totalSibity,
            totalMensualite,
            totalGlobal,
            objectif,
            progression,
            membresActifs,
            tauxParticipation
        });
    };

    const handleAjouterCotisation = async (e) => {
        e.preventDefault();

        if (!formData.membre_id || !formData.montant) {
            alert("Veuillez remplir tous les champs obligatoires");
            return;
        }

        const { error } = await supabase
            .from('cotisations')
            .insert([{
                membre_id: formData.membre_id,
                type: formData.type,
                montant: parseInt(formData.montant),
                date_cotisation: formData.date_cotisation,
                description: formData.description || null
            }]);

        if (error) {
            alert("Erreur: " + error.message);
            return;
        }

        alert("Cotisation enregistrée avec succès !");
        setShowAjoutModal(false);
        setFormData({
            membre_id: '',
            type: 'sibity',
            montant: '',
            date_cotisation: new Date().toISOString().split('T')[0],
            description: ''
        });
        await loadCotisations(user.generation);
    };

    const handleSupprimerCotisation = async (cotisationId) => {
        if (!confirm("Êtes-vous sûr de vouloir supprimer cette cotisation ?")) return;

        const { error } = await supabase
            .from('cotisations')
            .delete()
            .eq('id', cotisationId);

        if (error) {
            alert("Erreur: " + error.message);
        } else {
            alert("Cotisation supprimée");
            await loadCotisations(user.generation);
        }
    };

    const handleTypeChange = (type) => {
        const typeInfo = typesCotisation.find(t => t.value === type);
        setFormData({
            ...formData,
            type,
            montant: typeInfo?.montant_defaut?.toString() || ''
        });
    };

    const getMembreNom = (membreId) => {
        const membre = membres.find(m => m.id === membreId);
        return membre?.nom_complet || 'Inconnu';
    };

    const formatMontant = (montant) => {
        return new Intl.NumberFormat('fr-FR').format(montant) + ' FCFA';
    };

    const exportCotisations = () => {
        const data = cotisationsFiltered.map(c => ({
            Date: new Date(c.date_cotisation).toLocaleDateString(),
            Membre: c.membres?.nom_complet || 'Inconnu',
            Type: c.type === 'sibity' ? 'Sibity' : 'Mensualité',
            Montant: c.montant,
            Description: c.description || ''
        }));

        const csv = [Object.keys(data[0] || {}).join(','), ...data.map(row => Object.values(row).join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cotisations_${user?.generation}_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const imprimerRecu = (cotisation) => {
        const recuHtml = `
            <html>
            <head>
                <title>Reçu de cotisation</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 40px; }
                    .header { text-align: center; margin-bottom: 30px; }
                    .title { font-size: 24px; font-weight: bold; color: #146332; }
                    .content { border: 2px solid black; padding: 20px; }
                    .field { margin: 10px 0; }
                    .label { font-weight: bold; }
                    .footer { text-align: center; margin-top: 30px; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="title">BALIOU PADRA</div>
                    <div>Communauté Cheikh Yacouba Sylla</div>
                </div>
                <div class="content">
                    <h2>REÇU DE COTISATION</h2>
                    <div class="field"><span class="label">Date :</span> ${new Date(cotisation.date_cotisation).toLocaleDateString()}</div>
                    <div class="field"><span class="label">Membre :</span> ${cotisation.membres?.nom_complet}</div>
                    <div class="field"><span class="label">Génération :</span> ${user?.generation}</div>
                    <div class="field"><span class="label">Type :</span> ${cotisation.type === 'sibity' ? 'Sibity' : 'Mensualité'}</div>
                    <div class="field"><span class="label">Montant :</span> ${formatMontant(cotisation.montant)}</div>
                    ${cotisation.description ? `<div class="field"><span class="label">Description :</span> ${cotisation.description}</div>` : ''}
                </div>
                <div class="footer">
                    Merci pour votre contribution à la communauté
                </div>
            </body>
            </html>
        `;

        const win = window.open();
        win.document.write(recuHtml);
        win.document.close();
        win.print();
    };

    // Filtrer les cotisations
    const cotisationsFiltered = cotisations.filter(c => {
        const matchSearch = searchTerm === '' ||
            c.membres?.nom_complet?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchType = filterType === 'tous' || c.type === filterType;
        const matchMois = filterMois === 'tous' ||
            (c.date_cotisation && new Date(c.date_cotisation).toLocaleString('fr-FR', { month: 'year' }) === filterMois);
        return matchSearch && matchType && matchMois;
    });

    // Liste des mois uniques pour le filtre
    const moisUniques = [...new Set(cotisations.map(c =>
        c.date_cotisation ? new Date(c.date_cotisation).toLocaleString('fr-FR', { month: 'long', year: 'numeric' }) : null
    ).filter(Boolean))];

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin text-4xl mb-4">⏳</div>
                    <p className="text-2xl font-black text-black">Chargement de l'espace trésorier...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <div className="flex justify-between items-start flex-wrap gap-4">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <Wallet size={32} className="text-blue-600" />
                                <h1 className="text-4xl font-black text-[#146332] uppercase italic">
                                    ESPACE TRÉSORIER
                                </h1>
                            </div>
                            <div className="h-1 w-32 bg-black mt-2"></div>
                            <p className="text-black/60 mt-2">
                                {user?.generation} • {user?.nom_complet}
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowAjoutModal(true)}
                                className="flex items-center gap-2 bg-[#146332] text-white px-4 py-2 rounded-xl font-black text-sm hover:bg-black transition-all"
                            >
                                <Plus size={16} /> Nouvelle cotisation
                            </button>
                            <button
                                onClick={exportCotisations}
                                className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-xl font-black text-sm hover:bg-[#146332] transition-all"
                                disabled={cotisations.length === 0}
                            >
                                <Download size={16} /> Exporter
                            </button>
                            <button
                                onClick={() => loadCotisations(user.generation)}
                                disabled={refreshing}
                                className="flex items-center gap-2 bg-gray-200 text-black px-4 py-2 rounded-xl font-black text-sm hover:bg-gray-300 transition-all"
                            >
                                <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                                Actualiser
                            </button>
                        </div>
                    </div>
                </div>

                {/* Indicateur de visibilité */}
                <div className="mb-6 p-3 rounded-xl text-center text-sm font-black"
                    style={{ backgroundColor: visibilite === 'public' ? '#dcfce7' : '#fef3c7', color: visibilite === 'public' ? '#166534' : '#92400e' }}>
                    {visibilite === 'public' ? (
                        <span className="flex items-center justify-center gap-2">🌍 Les finances de la génération sont visibles par tous les membres</span>
                    ) : (
                        <span className="flex items-center justify-center gap-2">🔒 Les finances sont visibles uniquement par le Chef et le Trésorier</span>
                    )}
                </div>

                {/* Cartes KPI */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white border-4 border-black rounded-2xl p-5">
                        <div className="flex items-center gap-2 mb-2">
                            <DollarSign size={18} className="text-black" />
                            <p className="text-xs font-black uppercase text-black/50">Total Sibity</p>
                        </div>
                        <p className="text-xl font-black text-black">{formatMontant(stats.totalSibity)}</p>
                    </div>
                    <div className="bg-white border-4 border-black rounded-2xl p-5">
                        <div className="flex items-center gap-2 mb-2">
                            <CreditCard size={18} className="text-black" />
                            <p className="text-xs font-black uppercase text-black/50">Total Mensualités</p>
                        </div>
                        <p className="text-xl font-black text-black">{formatMontant(stats.totalMensualite)}</p>
                    </div>
                    <div className="bg-white border-4 border-black rounded-2xl p-5">
                        <div className="flex items-center gap-2 mb-2">
                            <Landmark size={18} className="text-black" />
                            <p className="text-xs font-black uppercase text-black/50">Collecte globale</p>
                        </div>
                        <p className="text-xl font-black text-black">{formatMontant(stats.totalGlobal)}</p>
                    </div>
                    <div className="bg-white border-4 border-black rounded-2xl p-5">
                        <div className="flex items-center gap-2 mb-2">
                            <Users size={18} className="text-black" />
                            <p className="text-xs font-black uppercase text-black/50">Taux participation</p>
                        </div>
                        <p className="text-xl font-black text-black">{stats.tauxParticipation.toFixed(0)}%</p>
                    </div>
                </div>

                {/* Barre progression objectif */}
                <div className="bg-white border-4 border-black rounded-2xl p-6 mb-6">
                    <div className="flex justify-between mb-2">
                        <span className="font-black text-black">Progression vers l'objectif annuel</span>
                        <span className="font-black text-black">{stats.progression.toFixed(1)}%</span>
                    </div>
                    <div className="w-full h-6 bg-gray-200 rounded-full overflow-hidden border-2 border-black">
                        <div className="h-full bg-green-500 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, stats.progression)}%` }}></div>
                    </div>
                    <div className="flex justify-between mt-2 text-sm">
                        <span className="text-black/60">0 FCFA</span>
                        <span className="font-black text-black">{formatMontant(stats.objectif)}</span>
                    </div>
                </div>

                {/* Filtres */}
                <div className="bg-white border-4 border-black rounded-2xl p-6 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-black font-black text-sm mb-1">🔍 Recherche</label>
                            <div className="relative">
                                <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-black/40" />
                                <input
                                    type="text"
                                    placeholder="Membre..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-3 py-2 border-4 border-black rounded-xl font-black text-sm text-black bg-white focus:bg-yellow-50 outline-none"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-black font-black text-sm mb-1">📋 Type</label>
                            <select
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value)}
                                className="w-full p-2 border-4 border-black rounded-xl font-black text-sm text-black bg-white focus:bg-yellow-50 outline-none"
                            >
                                <option value="tous">Tous les types</option>
                                <option value="sibity">📿 Sibity</option>
                                <option value="mensualite">📅 Mensualité</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-black font-black text-sm mb-1">📅 Mois</label>
                            <select
                                value={filterMois}
                                onChange={(e) => setFilterMois(e.target.value)}
                                className="w-full p-2 border-4 border-black rounded-xl font-black text-sm text-black bg-white focus:bg-yellow-50 outline-none"
                            >
                                <option value="tous">Tous les mois</option>
                                {moisUniques.map(mois => (
                                    <option key={mois} value={mois}>{mois}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-end">
                            <button
                                onClick={() => {
                                    setSearchTerm('');
                                    setFilterType('tous');
                                    setFilterMois('tous');
                                }}
                                className="w-full p-2 border-4 border-black rounded-xl font-black text-sm bg-gray-100 hover:bg-gray-200 transition-all"
                            >
                                Réinitialiser
                            </button>
                        </div>
                    </div>
                </div>

                {/* Liste des cotisations */}
                <div className="bg-white border-4 border-black rounded-2xl overflow-hidden">
                    <div className="bg-black p-4 flex justify-between items-center">
                        <h2 className="text-white font-black uppercase text-sm">📋 Historique des cotisations</h2>
                        <span className="text-white/70 text-sm font-black">{cotisationsFiltered.length} enregistrement(s)</span>
                    </div>
                    {cotisationsFiltered.length === 0 ? (
                        <div className="p-12 text-center">
                            <Receipt size={48} className="mx-auto text-black/30 mb-4" />
                            <p className="text-xl font-black text-black/60 italic">Aucune cotisation enregistrée</p>
                            <p className="text-black/40 mt-2">Cliquez sur "Nouvelle cotisation" pour commencer</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="p-3 text-left font-black text-sm">Date</th>
                                        <th className="p-3 text-left font-black text-sm">Membre</th>
                                        <th className="p-3 text-left font-black text-sm">Type</th>
                                        <th className="p-3 text-right font-black text-sm">Montant</th>
                                        <th className="p-3 text-center font-black text-sm">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cotisationsFiltered.map((cotisation) => (
                                        <tr key={cotisation.id} className="border-b border-black/10 hover:bg-gray-50 transition-colors">
                                            <td className="p-3 text-black/60 text-sm">
                                                {new Date(cotisation.date_cotisation).toLocaleDateString()}
                                            </td>
                                            <td className="p-3 font-black text-black">
                                                {cotisation.membres?.nom_complet || 'Inconnu'}
                                            </td>
                                            <td className="p-3">
                                                <span className={`text-xs px-2 py-1 rounded-full font-black ${cotisation.type === 'sibity' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                                                    }`}>
                                                    {cotisation.type === 'sibity' ? '📿 Sibity' : '📅 Mensualité'}
                                                </span>
                                            </td>
                                            <td className="p-3 text-right font-black text-black">
                                                {formatMontant(cotisation.montant)}
                                            </td>
                                            <td className="p-3 text-center">
                                                <div className="flex gap-2 justify-center">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedCotisation(cotisation);
                                                            setShowDetailsModal(true);
                                                        }}
                                                        className="text-blue-500 hover:text-blue-700"
                                                        title="Détails"
                                                    >
                                                        <Eye size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => imprimerRecu(cotisation)}
                                                        className="text-gray-500 hover:text-gray-700"
                                                        title="Imprimer le reçu"
                                                    >
                                                        <Printer size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleSupprimerCotisation(cotisation.id)}
                                                        className="text-red-500 hover:text-red-700"
                                                        title="Supprimer"
                                                    >
                                                        <X size={18} />
                                                    </button>
                                                </div>
                                            </td>
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
                        Espace Trésorier — Génération {user?.generation}
                    </p>
                </div>
            </div>

            {/* Modal Ajout Cotisation */}
            {
                showAjoutModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white border-4 border-black rounded-2xl max-w-md w-full p-6 shadow-[15px_15px_0px_0px_rgba(0,0,0,0.2)]">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-black text-black">💰 Nouvelle cotisation</h2>
                                <button onClick={() => setShowAjoutModal(false)} className="text-black hover:text-red-500">
                                    <X size={24} />
                                </button>
                            </div>
                            <form onSubmit={handleAjouterCotisation} className="space-y-4">
                                <div>
                                    <label className="block text-black font-black mb-1">Membre *</label>
                                    <select
                                        value={formData.membre_id}
                                        onChange={(e) => setFormData({ ...formData, membre_id: e.target.value })}
                                        className="w-full p-3 border-4 border-black rounded-xl font-black text-black bg-white focus:bg-yellow-50 outline-none"
                                        required
                                    >
                                        <option value="">-- Sélectionner un membre --</option>
                                        {membres.map(m => (
                                            <option key={m.id} value={m.id}>{m.nom_complet}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-black font-black mb-1">Type de cotisation *</label>
                                    <select
                                        value={formData.type}
                                        onChange={(e) => handleTypeChange(e.target.value)}
                                        className="w-full p-3 border-4 border-black rounded-xl font-black text-black bg-white focus:bg-yellow-50 outline-none"
                                    >
                                        {typesCotisation.map(t => (
                                            <option key={t.value} value={t.value}>{t.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-black font-black mb-1">Montant (FCFA) *</label>
                                    <input
                                        type="number"
                                        value={formData.montant}
                                        onChange={(e) => setFormData({ ...formData, montant: e.target.value })}
                                        className="w-full p-3 border-4 border-black rounded-xl font-black text-black bg-white focus:bg-yellow-50 outline-none"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-black font-black mb-1">Date</label>
                                    <input
                                        type="date"
                                        value={formData.date_cotisation}
                                        onChange={(e) => setFormData({ ...formData, date_cotisation: e.target.value })}
                                        className="w-full p-3 border-4 border-black rounded-xl font-black text-black bg-white focus:bg-yellow-50 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-black font-black mb-1">Description (optionnelle)</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full p-3 border-4 border-black rounded-xl font-black text-black bg-white focus:bg-yellow-50 outline-none"
                                        rows={2}
                                        placeholder="Mois de janvier, Événement spécial..."
                                    />
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button type="button" onClick={() => setShowAjoutModal(false)} className="flex-1 bg-gray-200 py-3 rounded-xl font-black">Annuler</button>
                                    <button type="submit" className="flex-1 bg-black text-white py-3 rounded-xl font-black hover:bg-[#146332]">Enregistrer</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Modal Détails Cotisation */}
            {
                showDetailsModal && selectedCotisation && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white border-4 border-black rounded-2xl max-w-md w-full p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-black text-black">📄 Détails de la cotisation</h2>
                                <button onClick={() => setShowDetailsModal(false)} className="text-black hover:text-red-500">
                                    <X size={24} />
                                </button>
                            </div>
                            <div className="space-y-3">
                                <div className="border-b border-black/10 pb-2">
                                    <p className="text-xs font-black uppercase text-black/50">Date</p>
                                    <p className="font-black text-black">{new Date(selectedCotisation.date_cotisation).toLocaleDateString()}</p>
                                </div>
                                <div className="border-b border-black/10 pb-2">
                                    <p className="text-xs font-black uppercase text-black/50">Membre</p>
                                    <p className="font-black text-black">{getMembreNom(selectedCotisation.membre_id)}</p>
                                </div>
                                <div className="border-b border-black/10 pb-2">
                                    <p className="text-xs font-black uppercase text-black/50">Type</p>
                                    <p className="font-black text-black">{selectedCotisation.type === 'sibity' ? '📿 Sibity' : '📅 Mensualité'}</p>
                                </div>
                                <div className="border-b border-black/10 pb-2">
                                    <p className="text-xs font-black uppercase text-black/50">Montant</p>
                                    <p className="font-black text-green-600">{formatMontant(selectedCotisation.montant)}</p>
                                </div>
                                {selectedCotisation.description && (
                                    <div className="border-b border-black/10 pb-2">
                                        <p className="text-xs font-black uppercase text-black/50">Description</p>
                                        <p className="text-black/70">{selectedCotisation.description}</p>
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-3 pt-6">
                                <button onClick={() => {
                                    imprimerRecu(selectedCotisation);
                                    setShowDetailsModal(false);
                                }} className="flex-1 bg-black text-white py-3 rounded-xl font-black hover:bg-[#146332]">
                                    Imprimer le reçu
                                </button>
                                <button onClick={() => setShowDetailsModal(false)} className="flex-1 bg-gray-200 py-3 rounded-xl font-black">
                                    Fermer
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}