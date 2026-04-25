"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import {
    Users,
    Wallet,
    TrendingUp,
    CheckCircle,
    AlertCircle,
    Crown,
    UserPlus,
    UserCheck,
    X,
    ChevronDown,
    UserCog,
    Megaphone,
    BarChart3,
    LogOut,
    User,
    Settings,
    BookOpen,
    Users as UsersIcon,
    Receipt,
    FileText,
    RefreshCw
} from 'lucide-react';

export default function ChefGenDashboard() {
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [profile, setProfile] = useState(null);
    const [membres, setMembres] = useState([]);
    const [demandesAttente, setDemandesAttente] = useState([]);
    const [tresoriers, setTresoriers] = useState([]);
    const [comiteCom, setComiteCom] = useState([]);
    const [mesCotisations, setMesCotisations] = useState([]);
    const [propositionsBudget, setPropositionsBudget] = useState([]);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showNominationModal, setShowNominationModal] = useState(false);
    const [nominationType, setNominationType] = useState('tresorier');
    const [selectedMembre, setSelectedMembre] = useState(null);
    const [selectedProposition, setSelectedProposition] = useState(null);
    const [showNegociationModal, setShowNegociationModal] = useState(false);
    const [showRejetModal, setShowRejetModal] = useState(false);
    const [montantNegocie, setMontantNegocie] = useState('');
    const [commentaireAccept, setCommentaireAccept] = useState('');
    const [commentaireNegocie, setCommentaireNegocie] = useState('');
    const [commentaireRejet, setCommentaireRejet] = useState('');
    const [stats, setStats] = useState({
        totalMembres: 0,
        collecteTotale: 0,
        objectif: 0,
        progression: 0,
        sibity: 0,
        mensualites: 0,
        mesCotisationsTotal: 0,
        mesCotisationsSibity: 0,
        mesCotisationsMensualite: 0
    });
    const router = useRouter();

    useEffect(() => {
        checkAuthAndLoadData();
    }, []);

    useEffect(() => {
        if (activeTab === 'budget' && profile?.generation && profile.generation !== 'A définir') {
            loadPropositionsBudget();
        }
    }, [activeTab, profile?.generation]);

    const checkAuthAndLoadData = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            router.push('/login');
            return;
        }

        const { data: profileData } = await supabase
            .from('membres')
            .select('*')
            .eq('user_id', session.user.id)
            .maybeSingle();

        if (profileData?.role !== 'chef_gen') {
            router.push('/profil');
            return;
        }

        setProfile(profileData);

        if (profileData.generation && profileData.generation !== 'A définir') {
            await loadAllData(profileData.generation, profileData.id);
            await loadMesCotisations(profileData.id);
            await loadPropositionsBudget();
        }

        setLoading(false);
    };

    const loadAllData = async (generationNom: any, membreId: any) => {
        const { data: membresData } = await supabase
            .from('membres')
            .select('*')
            .eq('generation', generationNom)
            .order('nom_complet', { ascending: true });

        setMembres(membresData || []);

        const attente = (membresData || []).filter(m => !m.est_valide && m.role === 'membre' && m.id !== membreId);
        setDemandesAttente(attente);

        const tres = (membresData || []).filter(m => (m.role === 'tresorier' || m.role === 'tresorier_adjoint') && m.id !== membreId);
        setTresoriers(tres);

        const com = (membresData || []).filter(m => (m.role === 'comite_com_gen' || m.role === 'comite_com_adjoint') && m.id !== membreId);
        setComiteCom(com);

        await calculateStats(membresData || [], membreId);
    };

    const loadMesCotisations = async (membreId: any) => {
        const { data: cotisations } = await supabase
            .from('cotisations')
            .select('*')
            .eq('membre_id', membreId)
            .order('date_cotisation', { ascending: false });

        setMesCotisations(cotisations || []);

        let totalSibity = 0;
        let totalMensualite = 0;
        cotisations?.forEach(c => {
            if (c.type === 'sibity') totalSibity += c.montant;
            else if (c.type === 'mensualite') totalMensualite += c.montant;
        });

        setStats(prev => ({
            ...prev,
            mesCotisationsTotal: totalSibity + totalMensualite,
            mesCotisationsSibity: totalSibity,
            mesCotisationsMensualite: totalMensualite
        }));
    };

    const loadPropositionsBudget = async () => {
        if (!profile?.generation) return;

        const { data, error } = await supabase
            .from('propositions_budgetaires')
            .select('*')
            .eq('generation_nom', profile.generation);

        if (error) {
            console.error("Erreur:", error);
            setPropositionsBudget([]);
        } else if (data && data.length > 0) {
            setPropositionsBudget(data);
        } else {
            setPropositionsBudget([]);
        }
    };

    const calculateStats = async (membresData: any, membreId: any) => {
        const membreIds = membresData.map(m => m.id);
        let totalSibity = 0;
        let totalMensualites = 0;

        if (membreIds.length > 0) {
            const { data: cotisations } = await supabase
                .from('cotisations')
                .select('montant, type')
                .in('membre_id', membreIds);

            if (cotisations) {
                cotisations.forEach(c => {
                    if (c.type === 'sibity') totalSibity += c.montant;
                    else if (c.type === 'mensualite') totalMensualites += c.montant;
                });
            }
        }

        const collecteTotale = totalSibity + totalMensualites;
        const objectif = 5000000;
        const progression = objectif > 0 ? (collecteTotale / objectif) * 100 : 0;

        setStats(prev => ({
            ...prev,
            totalMembres: membresData.length,
            collecteTotale,
            objectif,
            progression,
            sibity: totalSibity,
            mensualites: totalMensualites
        }));
    };

    const handleValiderMembre = async (membreId: any) => {
        const { error } = await supabase
            .from('membres')
            .update({ est_valide: true })
            .eq('id', membreId);

        if (error) {
            alert("Erreur: " + error.message);
        } else {
            alert("Membre validé !");
            await loadAllData(profile.generation, profile.id);
        }
    };

    const handleRejeterMembre = async (membreId: any) => {
        if (!confirm("Rejeter cette demande ?")) return;

        const { error } = await supabase
            .from('membres')
            .delete()
            .eq('id', membreId);

        if (error) {
            alert("Erreur: " + error.message);
        } else {
            alert("Demande rejetée");
            await loadAllData(profile.generation, profile.id);
        }
    };

    const handleNommerResponsable = async () => {
        if (!selectedMembre) return;

        let nouveauRole = '';
        if (nominationType === 'tresorier_titulaire') nouveauRole = 'tresorier';
        else if (nominationType === 'tresorier_adjoint') nouveauRole = 'tresorier_adjoint';
        else if (nominationType === 'comite_com_titulaire') nouveauRole = 'comite_com_gen';
        else if (nominationType === 'comite_com_adjoint') nouveauRole = 'comite_com_adjoint';

        const { error } = await supabase
            .from('membres')
            .update({ role: nouveauRole })
            .eq('id', selectedMembre);

        if (error) {
            alert("Erreur: " + error.message);
        } else {
            alert("Responsable nommé !");
            setShowNominationModal(false);
            setSelectedMembre(null);
            await loadAllData(profile.generation, profile.id);
        }
    };

    const handleRetirerResponsable = async (membreId: any, nomMembre: any) => {
        if (!confirm(`Retirer ${nomMembre} ?`)) return;

        const { error } = await supabase
            .from('membres')
            .update({ role: 'membre' })
            .eq('id', membreId);

        if (error) {
            alert("Erreur: " + error.message);
        } else {
            alert("Responsable retiré");
            await loadAllData(profile.generation, profile.id);
        }
    };

    const handleAccepterProposition = async () => {
        const { error } = await supabase
            .from('propositions_budgetaires')
            .update({
                statut_chef: 'accepte',
                commentaire_chef: commentaireAccept,
                date_reponse: new Date().toISOString()
            })
            .eq('id', selectedProposition.id);

        if (error) {
            alert("Erreur: " + error.message);
        } else {
            alert("✅ Proposition acceptée ! Le Bureau Central a été notifié.");
            setSelectedProposition(null);
            setCommentaireAccept('');
            await loadPropositionsBudget();
        }
    };

    const handleNegocierProposition = async () => {
        if (!montantNegocie) {
            alert("Entrez un montant");
            return;
        }
        const { error } = await supabase
            .from('propositions_budgetaires')
            .update({
                statut_chef: 'negociation',
                montant_corrige: parseInt(montantNegocie),
                commentaire_chef: commentaireNegocie,
                date_reponse: new Date().toISOString()
            })
            .eq('id', selectedProposition.id);

        if (error) {
            alert("Erreur: " + error.message);
        } else {
            alert("💬 Proposition de négociation envoyée au Bureau Central !");
            setShowNegociationModal(false);
            setSelectedProposition(null);
            setMontantNegocie('');
            setCommentaireNegocie('');
            await loadPropositionsBudget();
        }
    };

    const handleRejeterProposition = async () => {
        if (!commentaireRejet) {
            alert("Indiquez un motif");
            return;
        }
        const { error } = await supabase
            .from('propositions_budgetaires')
            .update({
                statut_chef: 'rejete',
                commentaire_chef: commentaireRejet,
                date_reponse: new Date().toISOString()
            })
            .eq('id', selectedProposition.id);

        if (error) {
            alert("Erreur: " + error.message);
        } else {
            alert("❌ Proposition rejetée. Le Bureau Central a été notifié.");
            setShowRejetModal(false);
            setSelectedProposition(null);
            setCommentaireRejet('');
            await loadPropositionsBudget();
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    const getMembresDisponibles = () => {
        const responsablesIds = [...tresoriers, ...comiteCom].map(r => r.id);
        return membres.filter(m =>
            !responsablesIds.includes(m.id) &&
            m.est_valide &&
            m.role === 'membre' &&
            m.id !== profile?.id
        );
    };

    const getRoleBadge = (role: any) => {
        switch (role) {
            case 'tresorier':
                return <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-black">💰 Trésorier Titulaire</span>;
            case 'tresorier_adjoint':
                return <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded-full text-xs font-black">💰 Trésorier Adjoint</span>;
            case 'comite_com_gen':
                return <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-black">📢 Comité Titulaire</span>;
            case 'comite_com_adjoint':
                return <span className="bg-purple-50 text-purple-600 px-2 py-1 rounded-full text-xs font-black">📢 Comité Adjoint</span>;
            case 'chef_gen':
                return <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-black">👑 Chef Génération</span>;
            default:
                return <span className="bg-gray-100 text-black px-2 py-1 rounded-full text-xs font-black">👤 Membre</span>;
        }
    };

    const formatMontant = (montant: any) => {
        if (!montant && montant !== 0) return '0 FCFA';
        return new Intl.NumberFormat('fr-FR').format(montant) + ' FCFA';
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin text-4xl mb-4">⏳</div>
                    <p className="text-2xl font-black text-black">Chargement...</p>
                </div>
            </div>
        );
    }

    if (!profile?.generation || profile.generation === 'A définir') {
        return (
            <div className="min-h-screen bg-white p-6 flex items-center justify-center">
                <div className="bg-yellow-50 border-4 border-yellow-500 rounded-2xl p-8 text-center">
                    <AlertCircle size={48} className="mx-auto text-yellow-600 mb-4" />
                    <h1 className="text-2xl font-black text-yellow-800">⚠️ Génération non définie</h1>
                    <button onClick={() => router.push('/profil')} className="mt-6 bg-black text-white px-6 py-3 rounded-xl font-black">
                        Retour à mon profil
                    </button>
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
                                <Crown size={32} className="text-yellow-600" />
                                <h1 className="text-4xl font-black text-[#146332] uppercase italic">ESPACE CHEF DE GÉNÉRATION</h1>
                            </div>
                            <div className="h-1 w-32 bg-black mt-2"></div>
                            <p className="text-black font-medium mt-2">{profile.generation} • Bienvenue {profile.nom_complet}</p>
                        </div>

                        <div className="relative">
                            <button onClick={() => setShowUserMenu(!showUserMenu)} className="flex items-center gap-3 bg-black text-white px-4 py-2 rounded-xl font-black text-sm">
                                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-black font-black">
                                    {profile.nom_complet?.charAt(0).toUpperCase() || 'U'}
                                </div>
                                <span className="text-white">{profile.nom_complet?.split(' ')[0] || 'Utilisateur'}</span>
                                <ChevronDown size={16} className="text-white" />
                            </button>

                            {showUserMenu && (
                                <div className="absolute right-0 mt-2 w-64 bg-white border-4 border-black rounded-2xl shadow-lg z-50">
                                    <div className="p-3 border-b-2 border-black/10">
                                        <p className="font-black text-black">{profile.nom_complet}</p>
                                        <p className="text-sm text-black/60">{profile.email}</p>
                                        <p className="text-xs text-black/40">👑 Chef de Génération</p>
                                    </div>
                                    <div className="py-2">
                                        <button onClick={() => router.push('/profil')} className="flex items-center gap-3 px-4 py-2 w-full text-left hover:bg-gray-100 text-black font-medium"><User size={16} /> Mon profil membre</button>
                                        <button onClick={() => router.push('/profil/editer')} className="flex items-center gap-3 px-4 py-2 w-full text-left hover:bg-gray-100 text-black font-medium"><Settings size={16} /> Modifier mon profil</button>
                                        <button onClick={() => router.push('/finances')} className="flex items-center gap-3 px-4 py-2 w-full text-left hover:bg-gray-100 text-black font-medium"><Receipt size={16} /> Mes cotisations</button>
                                        <button onClick={() => router.push('/annuaire')} className="flex items-center gap-3 px-4 py-2 w-full text-left hover:bg-gray-100 text-black font-medium"><UsersIcon size={16} /> Annuaire</button>
                                        <button onClick={() => router.push('/bibliotheque')} className="flex items-center gap-3 px-4 py-2 w-full text-left hover:bg-gray-100 text-black font-medium"><BookOpen size={16} /> Bibliothèque</button>
                                        <div className="border-t-2 border-black/10 my-1"></div>
                                        <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-2 w-full text-left hover:bg-red-50 text-red-600 font-medium"><LogOut size={16} /> Se déconnecter</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Cartes KPI */}
                <div className="bg-[#146332] border-4 border-black rounded-2xl p-4 mb-6">
                    <div className="flex items-center gap-2 mb-3">
                        <Crown size={20} className="text-yellow-400" />
                        <h3 className="font-black text-white uppercase text-sm">👑 Mes cotisations personnelles</h3>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white/10 rounded-xl p-3">
                            <p className="text-xs font-black text-white/70">Total versé</p>
                            <p className="text-xl font-black text-yellow-400">{formatMontant(stats.mesCotisationsTotal)}</p>
                        </div>
                        <div className="bg-white/10 rounded-xl p-3">
                            <p className="text-xs font-black text-white/70">📿 Sibity</p>
                            <p className="text-lg font-black text-white">{formatMontant(stats.mesCotisationsSibity)}</p>
                        </div>
                        <div className="bg-white/10 rounded-xl p-3">
                            <p className="text-xs font-black text-white/70">📅 Mensualités</p>
                            <p className="text-lg font-black text-white">{formatMontant(stats.mesCotisationsMensualite)}</p>
                        </div>
                        <div className="bg-white/10 rounded-xl p-3 flex items-center justify-center">
                            <button onClick={() => router.push('/finances')} className="text-sm font-black text-yellow-400 hover:underline">Voir détails →</button>
                        </div>
                    </div>
                </div>

                {/* Alertes */}
                {demandesAttente.length > 0 && (
                    <div className="bg-yellow-50 border-4 border-yellow-500 rounded-2xl p-4 mb-6 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <AlertCircle className="text-yellow-600" size={24} />
                            <div>
                                <p className="font-black text-yellow-800">{demandesAttente.length} demande(s) en attente</p>
                                <p className="text-sm text-yellow-700">Cliquez sur l'onglet "Validations"</p>
                            </div>
                        </div>
                        <button onClick={() => setActiveTab('validations')} className="bg-yellow-600 text-white px-4 py-2 rounded-xl font-black text-sm">Voir</button>
                    </div>
                )}

                {/* Onglets */}
                <div className="flex flex-wrap gap-2 border-b-4 border-black mb-6 overflow-x-auto">
                    <button onClick={() => setActiveTab('overview')} className={`px-6 py-3 font-black uppercase text-sm ${activeTab === 'overview' ? 'bg-black text-white rounded-t-2xl' : 'text-black'}`}><BarChart3 size={16} /> Vue d'ensemble</button>
                    <button onClick={() => setActiveTab('validations')} className={`px-6 py-3 font-black uppercase text-sm ${activeTab === 'validations' ? 'bg-black text-white rounded-t-2xl' : 'text-black'}`}><UserCheck size={16} /> Validations ({demandesAttente.length})</button>
                    <button onClick={() => setActiveTab('tresorerie')} className={`px-6 py-3 font-black uppercase text-sm ${activeTab === 'tresorerie' ? 'bg-black text-white rounded-t-2xl' : 'text-black'}`}><Wallet size={16} /> Finances génération</button>
                    <button onClick={() => setActiveTab('budget')} className={`px-6 py-3 font-black uppercase text-sm ${activeTab === 'budget' ? 'bg-black text-white rounded-t-2xl' : 'text-black'}`}><FileText size={16} /> Budget ({propositionsBudget.length})</button>
                    <button onClick={() => setActiveTab('nomination')} className={`px-6 py-3 font-black uppercase text-sm ${activeTab === 'nomination' ? 'bg-black text-white rounded-t-2xl' : 'text-black'}`}><UserCog size={16} /> Nomination</button>
                    <button onClick={() => setActiveTab('membres')} className={`px-6 py-3 font-black uppercase text-sm ${activeTab === 'membres' ? 'bg-black text-white rounded-t-2xl' : 'text-black'}`}><Users size={16} /> Membres ({stats.totalMembres})</button>
                </div>
                {/* Vue d'ensemble */}
                {activeTab === 'overview' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-white border-4 border-black rounded-2xl p-5"><p className="text-xs font-black uppercase text-black/50">👥 Membres</p><p className="text-3xl font-black text-black">{stats.totalMembres}</p></div>
                            <div className="bg-white border-4 border-black rounded-2xl p-5"><p className="text-xs font-black uppercase text-black/50">💰 Collecte</p><p className="text-xl font-black text-green-600">{formatMontant(stats.collecteTotale)}</p></div>
                            <div className="bg-white border-4 border-black rounded-2xl p-5"><p className="text-xs font-black uppercase text-black/50">📈 Progression</p><p className="text-2xl font-black text-blue-600">{stats.progression.toFixed(1)}%</p></div>
                            <div className="bg-white border-4 border-black rounded-2xl p-5"><p className="text-xs font-black uppercase text-black/50">📿 / 📅</p><p className="text-sm font-black text-black">{formatMontant(stats.sibity)} / {formatMontant(stats.mensualites)}</p></div>
                        </div>
                        <div className="bg-white border-4 border-black rounded-2xl p-6">
                            <div className="flex justify-between mb-2"><span className="font-black text-black">Progression</span><span className="font-black text-black">{stats.progression.toFixed(1)}%</span></div>
                            <div className="w-full h-6 bg-gray-200 rounded-full overflow-hidden border-2 border-black"><div className="h-full bg-green-500" style={{ width: `${Math.min(100, stats.progression)}%` }}></div></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white border-4 border-black rounded-2xl p-6"><h3 className="font-black text-black mb-4"><Wallet size={18} /> Trésorerie</h3>{tresoriers.length === 0 ? <p className="text-black/60 italic">Aucun trésorier</p> : tresoriers.map(t => (<div key={t.id} className="flex justify-between items-center py-2 border-b border-black/10"><div><p className="font-black text-black">{t.nom_complet}</p><p className="text-xs text-black/60">{t.role === 'tresorier' ? 'Titulaire' : 'Adjoint'}</p></div>{getRoleBadge(t.role)}</div>))}</div>
                            <div className="bg-white border-4 border-black rounded-2xl p-6"><h3 className="font-black text-black mb-4"><Megaphone size={18} /> Communication</h3>{comiteCom.length === 0 ? <p className="text-black/60 italic">Aucun membre</p> : comiteCom.map(c => (<div key={c.id} className="flex justify-between items-center py-2 border-b border-black/10"><div><p className="font-black text-black">{c.nom_complet}</p><p className="text-xs text-black/60">{c.role === 'comite_com_gen' ? 'Titulaire' : 'Adjoint'}</p></div>{getRoleBadge(c.role)}</div>))}</div>
                            <div className="bg-white border-4 border-black rounded-2xl p-6"><h3 className="font-black text-black mb-4">⚡ Accès rapide</h3><div className="space-y-2"><button onClick={() => router.push('/profil')} className="flex items-center gap-3 w-full text-left text-black hover:text-[#146332]"><User size={16} /> Mon profil</button><button onClick={() => router.push('/finances')} className="flex items-center gap-3 w-full text-left text-black hover:text-[#146332]"><Receipt size={16} /> Mes cotisations</button><button onClick={() => router.push('/annuaire')} className="flex items-center gap-3 w-full text-left text-black hover:text-[#146332]"><UsersIcon size={16} /> Annuaire</button><button onClick={() => router.push('/bibliotheque')} className="flex items-center gap-3 w-full text-left text-black hover:text-[#146332]"><BookOpen size={16} /> Bibliothèque</button></div></div>
                        </div>
                    </div>
                )}

                {/* Validations */}
                {activeTab === 'validations' && (
                    <div className="bg-white border-4 border-black rounded-2xl overflow-hidden">
                        <div className="bg-black p-4"><h2 className="text-white font-black uppercase">📋 Demandes en attente</h2></div>
                        {demandesAttente.length === 0 ? <div className="p-12 text-center"><CheckCircle size={48} className="mx-auto text-green-500 mb-4" /><p className="text-xl font-black text-black/60 italic">Aucune demande</p></div> : demandesAttente.map(d => (<div key={d.id} className="p-5 flex justify-between items-center border-b border-black/10"><div><p className="font-black text-black text-lg">{d.nom_complet}</p><p className="text-sm text-black/60">{d.email}</p></div><div className="flex gap-3"><button onClick={() => handleValiderMembre(d.id)} className="bg-green-500 text-white px-4 py-2 rounded-xl font-black text-sm">✅ Valider</button><button onClick={() => handleRejeterMembre(d.id)} className="bg-red-500 text-white px-4 py-2 rounded-xl font-black text-sm">❌ Rejeter</button></div></div>))}
                    </div>
                )}

                {/* Finances */}
                {activeTab === 'tresorerie' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white border-4 border-black rounded-2xl p-6"><h3 className="font-black text-black mb-4">📊 Collectes</h3><div className="space-y-3"><div className="flex justify-between py-2 border-b border-black/10"><span className="font-black text-black">📿 Sibity</span><span className="font-black text-black">{formatMontant(stats.sibity)}</span></div><div className="flex justify-between py-2 border-b border-black/10"><span className="font-black text-black">📅 Mensualités</span><span className="font-black text-black">{formatMontant(stats.mensualites)}</span></div><div className="flex justify-between py-2 pt-3"><span className="font-black text-black">Total</span><span className="font-black text-black">{formatMontant(stats.collecteTotale)}</span></div></div></div>
                        <div className="bg-white border-4 border-black rounded-2xl p-6"><h3 className="font-black text-black mb-4">💳 Mes cotisations</h3>{mesCotisations.slice(0, 5).length === 0 ? <p className="text-black font-black italic">Aucune</p> : mesCotisations.slice(0, 5).map(c => (<div key={c.id} className="flex justify-between py-2 border-b border-black/10"><div><p className="text-sm font-black">{c.type === 'sibity' ? '📿 Sibity' : '📅 Mensualité'}</p><p className="text-xs text-black/60">{new Date(c.date_cotisation).toLocaleDateString()}</p></div><span className="font-black text-green-600">{formatMontant(c.montant)}</span></div>))}<button onClick={() => router.push('/finances')} className="mt-4 text-sm font-black text-black hover:underline">Voir tout →</button></div>
                    </div>
                )}

                {/* Budget */}
                {activeTab === 'budget' && (
                    <div className="bg-white border-4 border-black rounded-2xl p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-2xl font-black text-black">Propositions Budgétaires du Bureau Central</h2>
                            <button onClick={() => loadPropositionsBudget()} className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-xl font-black text-sm"><RefreshCw size={14} /> Rafraîchir</button>
                        </div>
                        {propositionsBudget.length === 0 ? (
                            <div className="text-center py-12">
                                <FileText size={48} className="mx-auto text-black/30 mb-4" />
                                <p className="text-xl font-black text-black/60 italic">Aucune proposition budgétaire</p>
                                <p className="text-black/40 mt-2">Le Bureau Central n'a pas encore fait de proposition pour votre génération</p>
                            </div>
                        ) : (
                            propositionsBudget.map((prop) => {
                                const montant = prop.montant_propose || 0;
                                const isEnAttente = prop.statut_chef === 'en_attente' || !prop.statut_chef;
                                const isAccepte = prop.statut_chef === 'accepte';
                                const isRejete = prop.statut_chef === 'rejete';
                                const isNegociation = prop.statut_chef === 'negociation';
                                return (
                                    <div key={prop.id} className={`border-2 rounded-xl p-5 mb-4 ${isAccepte ? 'border-green-500 bg-green-50' : isRejete ? 'border-red-500 bg-red-50' : isNegociation ? 'border-orange-500 bg-orange-50' : 'border-yellow-500 bg-yellow-50'}`}>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-sm text-black/60">Proposition du {new Date(prop.date_proposition).toLocaleDateString()}</p>
                                                <p className="font-black text-black text-2xl">{formatMontant(montant)}</p>
                                                <p className="text-xs text-black/40">Année {prop.annee}</p>
                                                {prop.description && <p className="text-sm text-black/70 italic mt-2">{prop.description}</p>}
                                            </div>
                                            <span className={`px-3 py-1 rounded-full text-xs font-black ${isAccepte ? 'bg-green-500 text-white' : isRejete ? 'bg-red-500 text-white' : isNegociation ? 'bg-orange-500 text-white' : 'bg-yellow-500 text-white'}`}>
                                                {isAccepte ? '✅ Accepté' : isRejete ? '❌ Rejeté' : isNegociation ? '🔄 Négociation' : '⏳ En attente'}
                                            </span>
                                        </div>
                                        {isEnAttente && (
                                            <div className="mt-4 pt-3 border-t border-black/10 flex gap-3">
                                                <button
                                                    onClick={() => {
                                                        setSelectedProposition(prop);
                                                        setCommentaireAccept('');
                                                        handleAccepterProposition();
                                                    }}
                                                    className="flex-1 bg-green-500 text-white py-2 rounded-xl text-sm font-black hover:bg-green-600"
                                                >
                                                    ✅ Accepter
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setSelectedProposition(prop);
                                                        setMontantNegocie('');
                                                        setCommentaireNegocie('');
                                                        setShowNegociationModal(true);
                                                    }}
                                                    className="flex-1 bg-orange-500 text-white py-2 rounded-xl text-sm font-black hover:bg-orange-600"
                                                >
                                                    💬 Négocier
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setSelectedProposition(prop);
                                                        setCommentaireRejet('');
                                                        setShowRejetModal(true);
                                                    }}
                                                    className="flex-1 bg-red-500 text-white py-2 rounded-xl text-sm font-black hover:bg-red-600"
                                                >
                                                    ❌ Rejeter
                                                </button>
                                            </div>
                                        )}
                                        {isNegociation && prop.montant_corrige && (
                                            <div className="mt-4 p-3 bg-orange-100 rounded-xl">
                                                <p className="font-black text-orange-800">Votre proposition : {formatMontant(prop.montant_corrige)}</p>
                                                {prop.commentaire_chef && <p className="text-sm text-orange-700 mt-1">"{prop.commentaire_chef}"</p>}
                                                <p className="text-xs text-orange-600 mt-2">En attente de validation par le Bureau Central</p>
                                            </div>
                                        )}
                                        {isRejete && prop.commentaire_chef && (
                                            <div className="mt-4 p-3 bg-red-100 rounded-xl">
                                                <p className="font-black text-red-800">Motif du rejet :</p>
                                                <p className="text-sm text-red-700">"{prop.commentaire_chef}"</p>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}

                {/* Nomination */}
                {activeTab === 'nomination' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white border-4 border-black rounded-2xl p-6"><h3 className="font-black text-black mb-4">💰 Nommer un Trésorier</h3><button onClick={() => { setNominationType('tresorier_titulaire'); setShowNominationModal(true); }} className="w-full bg-blue-600 text-white py-2 rounded-xl mb-2 font-black">+ Trésorier Titulaire</button><button onClick={() => { setNominationType('tresorier_adjoint'); setShowNominationModal(true); }} className="w-full bg-blue-400 text-white py-2 rounded-xl font-black">+ Trésorier Adjoint</button>{tresoriers.length > 0 && (<div className="mt-4 pt-3 border-t border-black/10"><h4 className="font-black text-black mb-2">Trésoriers actuels</h4>{tresoriers.map(t => (<div key={t.id} className="flex justify-between py-1"><span className="font-black text-black">{t.nom_complet}</span><button onClick={() => handleRetirerResponsable(t.id, t.nom_complet)} className="text-red-500 text-sm font-black">Retirer</button></div>))}</div>)}</div>
                        <div className="bg-white border-4 border-black rounded-2xl p-6"><h3 className="font-black text-black mb-4">📢 Nommer Comité Communication</h3><button onClick={() => { setNominationType('comite_com_titulaire'); setShowNominationModal(true); }} className="w-full bg-purple-600 text-white py-2 rounded-xl mb-2 font-black">+ Comité Titulaire</button><button onClick={() => { setNominationType('comite_com_adjoint'); setShowNominationModal(true); }} className="w-full bg-purple-400 text-white py-2 rounded-xl font-black">+ Comité Adjoint</button>{comiteCom.length > 0 && (<div className="mt-4 pt-3 border-t border-black/10"><h4 className="font-black text-black mb-2">Comité actuel</h4>{comiteCom.map(c => (<div key={c.id} className="flex justify-between py-1"><span className="font-black text-black">{c.nom_complet}</span><button onClick={() => handleRetirerResponsable(c.id, c.nom_complet)} className="text-red-500 text-sm font-black">Retirer</button></div>))}</div>)}</div>
                    </div>
                )}

                {/* Membres */}
                {activeTab === 'membres' && (
                    <div className="bg-white border-4 border-black rounded-2xl overflow-hidden">
                        <div className="bg-black p-4"><h2 className="text-white font-black uppercase">📋 Liste des membres</h2></div>
                        <table className="w-full">
                            <thead className="bg-gray-100">
                                <tr><th className="p-3 text-left font-black text-black">Nom</th><th className="p-3 text-left font-black text-black">Email</th><th className="p-3 text-left font-black text-black">Rôle</th><th className="p-3 text-left font-black text-black">Statut</th></tr>
                            </thead>
                            <tbody>{membres.map(m => (<tr key={m.id} className="border-b border-black/10"><td className="p-3 font-black text-black">{m.nom_complet}{m.id === profile?.id && <span className="ml-2 text-xs bg-yellow-100 px-1 rounded-full">Moi</span>}</td><td className="p-3 text-black/70">{m.email}</td><td className="p-3">{getRoleBadge(m.role)}</td><td className="p-3">{m.est_valide ? <span className="text-green-600 font-black">✅ Validé</span> : <span className="text-yellow-600 font-black">⏳ En attente</span>}</td></tr>))}</tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal Nomination */}
            {showNominationModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white border-4 border-black rounded-2xl max-w-md w-full p-6">
                        <h2 className="text-2xl font-black text-black mb-4">{nominationType.includes('tresorier') ? '💰 Nommer un Trésorier' : '📢 Nommer un membre'}</h2>
                        <select value={selectedMembre || ''} onChange={(e) => setSelectedMembre(e.target.value)} className="w-full p-3 border-4 border-black rounded-xl mb-4 font-black text-black bg-white">
                            <option value="">-- Choisir --</option>
                            {getMembresDisponibles().map(m => (<option key={m.id} value={m.id}>{m.nom_complet}</option>))}
                        </select>
                        <div className="flex gap-3"><button onClick={() => setShowNominationModal(false)} className="flex-1 bg-gray-200 py-2 rounded-xl font-black">Annuler</button><button onClick={handleNommerResponsable} className="flex-1 bg-black text-white py-2 rounded-xl font-black">Nommer</button></div>
                    </div>
                </div>
            )}

            {/* Modal Négociation */}
            {showNegociationModal && selectedProposition && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white border-4 border-black rounded-2xl max-w-md w-full p-6">
                        <h2 className="text-2xl font-black text-black mb-4">💬 Proposer un montant</h2>
                        <p className="text-purple-600 font-black mb-2">Proposition initiale: {formatMontant(selectedProposition.montant_propose || 0)}</p>
                        <input type="number" value={montantNegocie} onChange={(e) => setMontantNegocie(e.target.value)} className="w-full p-3 border-4 border-black rounded-xl mb-3 font-black text-black" placeholder="Votre proposition" />
                        <textarea value={commentaireNegocie} onChange={(e) => setCommentaireNegocie(e.target.value)} className="w-full p-3 border-4 border-black rounded-xl mb-4 font-black text-black" rows={2} placeholder="Justification" />
                        <div className="flex gap-3"><button onClick={() => setShowNegociationModal(false)} className="flex-1 bg-gray-200 py-2 rounded-xl font-black">Annuler</button><button onClick={handleNegocierProposition} className="flex-1 bg-orange-500 text-white py-2 rounded-xl font-black">Envoyer</button></div>
                    </div>
                </div>
            )}

            {/* Modal Rejet */}
            {showRejetModal && selectedProposition && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white border-4 border-black rounded-2xl max-w-md w-full p-6">
                        <h2 className="text-2xl font-black text-black mb-4">❌ Rejeter</h2>
                        <p className="text-purple-600 font-black mb-2">Proposition: {formatMontant(selectedProposition.montant_propose || 0)}</p>
                        <textarea value={commentaireRejet} onChange={(e) => setCommentaireRejet(e.target.value)} className="w-full p-3 border-4 border-black rounded-xl mb-4 font-black text-black" rows={3} placeholder="Motif du rejet" required />
                        <div className="flex gap-3"><button onClick={() => setShowRejetModal(false)} className="flex-1 bg-gray-200 py-2 rounded-xl font-black">Annuler</button><button onClick={handleRejeterProposition} className="flex-1 bg-red-500 text-white py-2 rounded-xl font-black">Confirmer</button></div>
                    </div>
                </div>
            )}
        </div>
    );
}