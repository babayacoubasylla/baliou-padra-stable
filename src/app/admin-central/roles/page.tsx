"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft,
    ShieldCheck,
    UserCog,
    Users,
    Plus,
    X,
    Edit,
    Trash2,
    CheckCircle,
    XCircle,
    RefreshCw,
    Crown,
    Wallet,
    UserCheck,
    Mail,
    Phone,
    Calendar,
    Search,
    Filter
} from 'lucide-react';

export default function RolesPage() {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState('chefs');
    const [chefsGeneration, setChefsGeneration] = useState([]);
    const [tresoriers, setTresoriers] = useState([]);
    const [membres, setMembres] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState('chef');
    const [selectedMembre, setSelectedMembre] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterGeneration, setFilterGeneration] = useState('');
    const [generations, setGenerations] = useState([]);
    const [formData, setFormData] = useState({
        user_id: '',
        generation: '',
        role: 'chef_gen'
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
        setRefreshing(true);

        // Charger tous les membres
        const { data: membresData } = await supabase
            .from('membres')
            .select('*')
            .order('nom_complet', { ascending: true });

        setMembres(membresData || []);

        // Filtrer les chefs de génération
        const chefs = (membresData || []).filter(m => m.role === 'chef_gen');
        setChefsGeneration(chefs);

        // Filtrer les trésoriers
        const tresors = (membresData || []).filter(m => m.role === 'tresorier');
        setTresoriers(tresors);

        // Générations uniques
        const uniqueGenerations = [...new Set((membresData || []).map(m => m.generation).filter(Boolean))];
        setGenerations(uniqueGenerations);

        setRefreshing(false);
    };

    const handleRefresh = async () => {
        await loadData();
    };

    const handleAjouterResponsable = async (e) => {
        e.preventDefault();

        const { error } = await supabase
            .from('membres')
            .update({
                role: formData.role,
                updated_at: new Date().toISOString()
            })
            .eq('id', formData.user_id);

        if (error) {
            alert("Erreur: " + error.message);
            return;
        }

        alert("Responsable ajouté avec succès !");
        setShowModal(false);
        setFormData({ user_id: '', generation: '', role: 'chef_gen' });
        await loadData();
    };

    const handleRetirerResponsable = async (membreId, nomMembre) => {
        if (!confirm(`Êtes-vous sûr de vouloir retirer ${nomMembre} de ses fonctions ?`)) return;

        const { error } = await supabase
            .from('membres')
            .update({
                role: 'membre',
                updated_at: new Date().toISOString()
            })
            .eq('id', membreId);

        if (error) {
            alert("Erreur: " + error.message);
            return;
        }

        alert("Responsable retiré avec succès !");
        await loadData();
    };

    const getMembresDisponibles = () => {
        const responsablesIds = [...chefsGeneration, ...tresoriers].map(r => r.id);
        return membres.filter(m =>
            !responsablesIds.includes(m.id) &&
            m.role !== 'super_admin' &&
            m.role !== 'baliou_padra' &&
            (searchTerm === '' || m.nom_complet?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                m.email?.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    };

    const getRoleBadge = (role) => {
        switch (role) {
            case 'chef_gen':
                return <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-xs font-black flex items-center gap-1"><Crown size={12} /> Chef Génération</span>;
            case 'tresorier':
                return <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-black flex items-center gap-1"><Wallet size={12} /> Trésorier</span>;
            case 'super_admin':
                return <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-black">Super Admin</span>;
            case 'baliou_padra':
                return <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-black">Bureau Central</span>;
            default:
                return <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-xs font-black">Membre</span>;
        }
    };

    const getStatutValidation = (estValide) => {
        if (estValide) {
            return <span className="flex items-center gap-1 text-green-600 text-xs font-black"><CheckCircle size={14} /> Validé</span>;
        }
        return <span className="flex items-center gap-1 text-red-600 text-xs font-black"><XCircle size={14} /> Non validé</span>;
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
                                GESTION DES RESPONSABLES
                            </h1>
                            <div className="h-1 w-32 bg-black mt-2"></div>
                            <p className="text-black/60 mt-2">Chefs de génération, trésoriers et responsables</p>
                        </div>
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

                {/* Onglets */}
                <div className="flex flex-wrap gap-2 border-b-4 border-black mb-6">
                    <button
                        onClick={() => setActiveTab('chefs')}
                        className={`px-6 py-3 font-black uppercase text-sm transition-all flex items-center gap-2 ${activeTab === 'chefs' ? 'bg-black text-white rounded-t-2xl' : 'text-black'}`}
                    >
                        <Crown size={16} /> Chefs de génération
                    </button>
                    <button
                        onClick={() => setActiveTab('tresoriers')}
                        className={`px-6 py-3 font-black uppercase text-sm transition-all flex items-center gap-2 ${activeTab === 'tresoriers' ? 'bg-black text-white rounded-t-2xl' : 'text-black'}`}
                    >
                        <Wallet size={16} /> Trésoriers
                    </button>
                    <button
                        onClick={() => setActiveTab('tous')}
                        className={`px-6 py-3 font-black uppercase text-sm transition-all flex items-center gap-2 ${activeTab === 'tous' ? 'bg-black text-white rounded-t-2xl' : 'text-black'}`}
                    >
                        <Users size={16} /> Tous les membres
                    </button>
                </div>

                {/* Section Chefs de génération */}
                {activeTab === 'chefs' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center flex-wrap gap-4">
                            <div className="flex items-center gap-4">
                                <div className="relative">
                                    <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-black/40" />
                                    <input
                                        type="text"
                                        placeholder="Rechercher un chef..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-10 pr-4 py-2 border-4 border-black rounded-xl font-black text-sm text-black bg-white focus:bg-yellow-50 outline-none w-64"
                                    />
                                </div>
                                <select
                                    value={filterGeneration}
                                    onChange={(e) => setFilterGeneration(e.target.value)}
                                    className="px-4 py-2 border-4 border-black rounded-xl font-black text-sm text-black bg-white focus:bg-yellow-50 outline-none"
                                >
                                    <option value="">Toutes les générations</option>
                                    {generationsList.map(gen => (
                                        <option key={gen} value={gen}>{gen}</option>
                                    ))}
                                </select>
                            </div>
                            <button
                                onClick={() => {
                                    setModalType('chef');
                                    setShowModal(true);
                                }}
                                className="flex items-center gap-2 bg-[#146332] text-white px-4 py-2 rounded-xl font-black text-sm hover:bg-black transition-all"
                            >
                                <Plus size={16} /> Nommer un chef
                            </button>
                        </div>

                        {chefsGeneration.filter(chef =>
                            (searchTerm === '' || chef.nom_complet?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                chef.email?.toLowerCase().includes(searchTerm.toLowerCase())) &&
                            (filterGeneration === '' || chef.generation === filterGeneration)
                        ).length === 0 ? (
                            <div className="bg-white border-4 border-black rounded-2xl p-12 text-center">
                                <ShieldCheck size={48} className="mx-auto text-black/30 mb-4" />
                                <p className="text-xl font-black text-black/60 italic">Aucun chef de génération</p>
                                <p className="text-black/40 mt-2">Cliquez sur "Nommer un chef" pour en ajouter</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {chefsGeneration
                                    .filter(chef =>
                                        (searchTerm === '' || chef.nom_complet?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                            chef.email?.toLowerCase().includes(searchTerm.toLowerCase())) &&
                                        (filterGeneration === '' || chef.generation === filterGeneration)
                                    )
                                    .map((chef) => (
                                        <div key={chef.id} className="bg-white border-4 border-black rounded-2xl p-5 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)] hover:shadow-none transition-all">
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center border-2 border-black">
                                                        <Crown size={28} className="text-purple-600" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-black text-black text-lg">{chef.nom_complet}</h3>
                                                        <p className="text-sm text-black/60">{chef.generation || 'Génération non définie'}</p>
                                                    </div>
                                                </div>
                                                {getRoleBadge(chef.role)}
                                            </div>
                                            <div className="space-y-2 mb-4">
                                                <p className="flex items-center gap-2 text-sm text-black/70">
                                                    <Mail size={14} /> {chef.email || 'Email non renseigné'}
                                                </p>
                                                <p className="flex items-center gap-2 text-sm text-black/70">
                                                    <Phone size={14} /> {chef.telephone || 'Téléphone non renseigné'}
                                                </p>
                                                <p className="flex items-center gap-2 text-sm text-black/70">
                                                    <Calendar size={14} /> Inscrit le {new Date(chef.created_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <div className="flex gap-3 pt-3 border-t-2 border-black/10">
                                                <button
                                                    onClick={() => handleRetirerResponsable(chef.id, chef.nom_complet)}
                                                    className="flex-1 bg-red-500 text-white py-2 rounded-xl font-black text-xs hover:bg-red-600 transition-all flex items-center justify-center gap-1"
                                                >
                                                    <Trash2 size={14} /> Retirer
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Section Trésoriers */}
                {activeTab === 'tresoriers' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center flex-wrap gap-4">
                            <div className="relative">
                                <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-black/40" />
                                <input
                                    type="text"
                                    placeholder="Rechercher un trésorier..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 pr-4 py-2 border-4 border-black rounded-xl font-black text-sm text-black bg-white focus:bg-yellow-50 outline-none w-64"
                                />
                            </div>
                            <button
                                onClick={() => {
                                    setModalType('tresorier');
                                    setShowModal(true);
                                }}
                                className="flex items-center gap-2 bg-[#146332] text-white px-4 py-2 rounded-xl font-black text-sm hover:bg-black transition-all"
                            >
                                <Plus size={16} /> Nommer un trésorier
                            </button>
                        </div>

                        {tresoriers.filter(tres =>
                            searchTerm === '' || tres.nom_complet?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            tres.email?.toLowerCase().includes(searchTerm.toLowerCase())
                        ).length === 0 ? (
                            <div className="bg-white border-4 border-black rounded-2xl p-12 text-center">
                                <Wallet size={48} className="mx-auto text-black/30 mb-4" />
                                <p className="text-xl font-black text-black/60 italic">Aucun trésorier</p>
                                <p className="text-black/40 mt-2">Cliquez sur "Nommer un trésorier" pour en ajouter</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {tresoriers
                                    .filter(tres =>
                                        searchTerm === '' || tres.nom_complet?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                        tres.email?.toLowerCase().includes(searchTerm.toLowerCase())
                                    )
                                    .map((tresorier) => (
                                        <div key={tresorier.id} className="bg-white border-4 border-black rounded-2xl p-5 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)] hover:shadow-none transition-all">
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center border-2 border-black">
                                                        <Wallet size={28} className="text-blue-600" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-black text-black text-lg">{tresorier.nom_complet}</h3>
                                                        <p className="text-sm text-black/60">{tresorier.generation || 'Génération non définie'}</p>
                                                    </div>
                                                </div>
                                                {getRoleBadge(tresorier.role)}
                                            </div>
                                            <div className="space-y-2 mb-4">
                                                <p className="flex items-center gap-2 text-sm text-black/70">
                                                    <Mail size={14} /> {tresorier.email || 'Email non renseigné'}
                                                </p>
                                                <p className="flex items-center gap-2 text-sm text-black/70">
                                                    <Phone size={14} /> {tresorier.telephone || 'Téléphone non renseigné'}
                                                </p>
                                                <p className="flex items-center gap-2 text-sm text-black/70">
                                                    <Calendar size={14} /> Inscrit le {new Date(tresorier.created_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <div className="flex gap-3 pt-3 border-t-2 border-black/10">
                                                <button
                                                    onClick={() => handleRetirerResponsable(tresorier.id, tresorier.nom_complet)}
                                                    className="flex-1 bg-red-500 text-white py-2 rounded-xl font-black text-xs hover:bg-red-600 transition-all flex items-center justify-center gap-1"
                                                >
                                                    <Trash2 size={14} /> Retirer
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Section Tous les membres */}
                {activeTab === 'tous' && (
                    <div className="bg-white border-4 border-black rounded-2xl overflow-hidden">
                        <div className="bg-black p-4">
                            <h2 className="text-white font-black uppercase text-sm">📋 Liste des membres</h2>
                        </div>
                        {membres.length === 0 ? (
                            <div className="p-12 text-center text-black/60 italic">
                                Aucun membre enregistré
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-100">
                                        <tr>
                                            <th className="p-3 text-left font-black text-sm">Nom</th>
                                            <th className="p-3 text-left font-black text-sm">Email</th>
                                            <th className="p-3 text-left font-black text-sm">Génération</th>
                                            <th className="p-3 text-left font-black text-sm">Rôle</th>
                                            <th className="p-3 text-left font-black text-sm">Statut</th>
                                            <th className="p-3 text-center font-black text-sm">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {membres
                                            .filter(m =>
                                                searchTerm === '' ||
                                                m.nom_complet?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                                m.email?.toLowerCase().includes(searchTerm.toLowerCase())
                                            )
                                            .map((membre, idx) => (
                                                <tr key={membre.id} className="border-b border-black/10 hover:bg-gray-50 transition-colors">
                                                    <td className="p-3 font-black text-black">
                                                        {membre.nom_complet}
                                                    </td>
                                                    <td className="p-3 text-black/80">
                                                        {membre.email}
                                                    </td>
                                                    <td className="p-3 text-black/80">
                                                        {membre.generation || '—'}
                                                    </td>
                                                    <td className="p-3">
                                                        {getRoleBadge(membre.role)}
                                                    </td>
                                                    <td className="p-3">
                                                        {getStatutValidation(membre.est_valide)}
                                                    </td>
                                                    <td className="p-3 text-center">
                                                        <div className="flex gap-2 justify-center">
                                                            {membre.role === 'membre' && (
                                                                <>
                                                                    <button
                                                                        onClick={() => {
                                                                            setFormData({ user_id: membre.id, generation: membre.generation, role: 'chef_gen' });
                                                                            setModalType('chef');
                                                                            setShowModal(true);
                                                                        }}
                                                                        className="bg-purple-500 text-white p-2 rounded-lg text-xs font-black hover:bg-purple-600 transition-all"
                                                                        title="Nommer chef"
                                                                    >
                                                                        <Crown size={14} />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => {
                                                                            setFormData({ user_id: membre.id, generation: membre.generation, role: 'tresorier' });
                                                                            setModalType('tresorier');
                                                                            setShowModal(true);
                                                                        }}
                                                                        className="bg-blue-500 text-white p-2 rounded-lg text-xs font-black hover:bg-blue-600 transition-all"
                                                                        title="Nommer trésorier"
                                                                    >
                                                                        <Wallet size={14} />
                                                                    </button>
                                                                </>
                                                            )}
                                                            {(membre.role === 'chef_gen' || membre.role === 'tresorier') && (
                                                                <button
                                                                    onClick={() => handleRetirerResponsable(membre.id, membre.nom_complet)}
                                                                    className="bg-red-500 text-white p-2 rounded-lg text-xs font-black hover:bg-red-600 transition-all"
                                                                    title="Retirer"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* Modal d'ajout de responsable */}
                {showModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white border-4 border-black rounded-2xl max-w-md w-full p-6 shadow-[15px_15px_0px_0px_rgba(0,0,0,0.2)]">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-black text-black">
                                    {modalType === 'chef' ? '👑 Nommer un chef de génération' : '💰 Nommer un trésorier'}
                                </h2>
                                <button onClick={() => setShowModal(false)} className="text-black hover:text-red-500 transition-colors">
                                    <X size={24} />
                                </button>
                            </div>
                            <form onSubmit={handleAjouterResponsable} className="space-y-4">
                                <div>
                                    <label className="block text-black font-black mb-1">Sélectionner un membre</label>
                                    <select
                                        value={formData.user_id}
                                        onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                                        className="w-full p-3 border-4 border-black rounded-xl font-black text-black bg-white focus:bg-yellow-50 outline-none"
                                        required
                                    >
                                        <option value="">-- Choisir un membre --</option>
                                        {getMembresDisponibles().map(m => (
                                            <option key={m.id} value={m.id}>
                                                {m.nom_complet} - {m.generation || 'Génération non définie'}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-black font-black mb-1">Génération</label>
                                    <select
                                        value={formData.generation}
                                        onChange={(e) => setFormData({ ...formData, generation: e.target.value })}
                                        className="w-full p-3 border-4 border-black rounded-xl font-black text-black bg-white focus:bg-yellow-50 outline-none"
                                        required
                                    >
                                        <option value="">-- Sélectionner --</option>
                                        {generationsList.map(gen => (
                                            <option key={gen} value={gen}>{gen}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="flex-1 bg-gray-200 text-black py-3 rounded-xl font-black uppercase text-sm hover:bg-gray-300 transition-all"
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 bg-black text-white py-3 rounded-xl font-black uppercase text-sm hover:bg-[#146332] transition-all"
                                    >
                                        Nommer
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Pied de page */}
                <div className="mt-8 text-center">
                    <p className="text-xs text-black/40 font-black uppercase tracking-wider">
                        Bureau Central Baliou Padra — Gestion des responsables
                    </p>
                </div>
            </div>
        </div>
    );
}