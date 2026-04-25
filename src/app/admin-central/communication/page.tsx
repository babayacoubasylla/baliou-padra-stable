"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft,
    Megaphone,
    Send,
    Users,
    RefreshCw,
    X,
    MessageSquare,
    Search,
    Eye,
    EyeOff,
    Globe,
    Lock
} from 'lucide-react';

export default function CommunicationCentralePage() {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [user, setUser] = useState(null);
    const [annonces, setAnnonces] = useState([]);
    const [showAnnonceModal, setShowAnnonceModal] = useState(false);
    const [filterGeneration, setFilterGeneration] = useState('tous');
    const [filterType, setFilterType] = useState('tous');
    const [searchTerm, setSearchTerm] = useState('');
    const [formAnnonce, setFormAnnonce] = useState({
        titre: '',
        contenu: '',
        type: 'public',
        generation_concernee: ''
    });
    const router = useRouter();

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

        setUser(profile);
        await loadAnnonces();
        setLoading(false);
    };

    const loadAnnonces = async () => {
        setRefreshing(true);
        const { data } = await supabase
            .from('annonces')
            .select('*')
            .order('created_at', { ascending: false });
        setAnnonces(data || []);
        setRefreshing(false);
    };

    const handleCreerAnnonce = async (e) => {
        e.preventDefault();

        let annonceData;

        if (formAnnonce.type === 'public') {
            // Une seule entrée pour toutes les générations
            annonceData = {
                titre: formAnnonce.titre,
                contenu: formAnnonce.contenu,
                type: 'public',
                generation_concernee: 'toutes',
                auteur: user?.email || 'Bureau Central'
            };
        } else {
            // Une seule entrée pour une génération spécifique
            annonceData = {
                titre: formAnnonce.titre,
                contenu: formAnnonce.contenu,
                type: 'interne',
                generation_concernee: formAnnonce.generation_concernee,
                auteur: user?.email || 'Bureau Central'
            };
        }

        const { error } = await supabase
            .from('annonces')
            .insert([annonceData]);

        if (error) {
            alert("Erreur: " + error.message);
        } else {
            alert(`Annonce ${formAnnonce.type === 'public' ? 'publique' : 'interne'} publiée avec succès !`);
            setShowAnnonceModal(false);
            setFormAnnonce({
                titre: '',
                contenu: '',
                type: 'public',
                generation_concernee: ''
            });
            await loadAnnonces();
        }
    };

    const handleSupprimerAnnonce = async (annonceId) => {
        if (!confirm("Supprimer cette annonce ?")) return;

        const { error } = await supabase
            .from('annonces')
            .delete()
            .eq('id', annonceId);

        if (error) {
            alert("Erreur: " + error.message);
        } else {
            alert("Annonce supprimée");
            await loadAnnonces();
        }
    };

    const annoncesFiltrees = annonces.filter(a => {
        const matchGeneration = filterGeneration === 'tous' ||
            (a.type === 'interne' && a.generation_concernee === filterGeneration) ||
            (a.type === 'public' && filterGeneration === 'tous');
        const matchType = filterType === 'tous' || a.type === filterType;
        const matchSearch = searchTerm === '' ||
            a.titre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            a.contenu?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchGeneration && matchType && matchSearch;
    });

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
                            <div className="flex items-center gap-3 mb-2">
                                <Megaphone size={32} className="text-[#146332]" />
                                <h1 className="text-4xl font-black text-[#146332] uppercase italic">
                                    COMMUNICATION CENTRALE
                                </h1>
                            </div>
                            <div className="h-1 w-32 bg-black mt-2"></div>
                            <p className="text-black/60 mt-2">Gestion des annonces pour toutes les générations</p>
                        </div>
                        <button
                            onClick={() => setShowAnnonceModal(true)}
                            className="flex items-center gap-2 bg-[#146332] text-white px-4 py-2 rounded-xl font-black text-sm hover:bg-black transition-all"
                        >
                            <Send size={16} /> Nouvelle annonce
                        </button>
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
                                    placeholder="Titre, contenu..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-3 py-2 border-4 border-black rounded-xl font-black text-sm text-black bg-white focus:bg-yellow-50 outline-none"
                                />
                            </div>
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
                            <label className="block text-black font-black text-sm mb-1">👁️ Visibilité</label>
                            <select
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value)}
                                className="w-full p-2 border-4 border-black rounded-xl font-black text-sm text-black bg-white focus:bg-yellow-50 outline-none"
                            >
                                <option value="tous">Tous les types</option>
                                <option value="public">🌍 Public</option>
                                <option value="interne">🔒 Interne</option>
                            </select>
                        </div>
                        <div className="flex items-end">
                            <button
                                onClick={() => {
                                    setSearchTerm('');
                                    setFilterGeneration('tous');
                                    setFilterType('tous');
                                }}
                                className="w-full p-2 border-4 border-black rounded-xl font-black text-sm bg-gray-100 hover:bg-gray-200 transition-all"
                            >
                                Réinitialiser
                            </button>
                        </div>
                    </div>
                </div>

                {/* Statistiques rapides */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white border-4 border-black rounded-2xl p-4 text-center">
                        <p className="text-2xl font-black text-black">{annonces.length}</p>
                        <p className="text-xs font-black uppercase text-black/50">Total annonces</p>
                    </div>
                    <div className="bg-white border-4 border-black rounded-2xl p-4 text-center">
                        <p className="text-2xl font-black text-green-600">{annonces.filter(a => a.type === 'public').length}</p>
                        <p className="text-xs font-black uppercase text-black/50">Annonces publiques</p>
                    </div>
                    <div className="bg-white border-4 border-black rounded-2xl p-4 text-center">
                        <p className="text-2xl font-black text-gray-600">{annonces.filter(a => a.type === 'interne').length}</p>
                        <p className="text-xs font-black uppercase text-black/50">Annonces internes</p>
                    </div>
                    <div className="bg-white border-4 border-black rounded-2xl p-4 text-center">
                        <p className="text-2xl font-black text-purple-600">{generationsList.length}</p>
                        <p className="text-xs font-black uppercase text-black/50">Générations</p>
                    </div>
                </div>

                {/* Liste des annonces */}
                <div className="bg-white border-4 border-black rounded-2xl overflow-hidden">
                    <div className="bg-black p-4">
                        <h2 className="text-white font-black uppercase text-sm flex items-center gap-2">
                            <Megaphone size={16} /> Toutes les annonces ({annoncesFiltrees.length})
                        </h2>
                    </div>
                    {annoncesFiltrees.length === 0 ? (
                        <div className="p-12 text-center">
                            <MessageSquare size={48} className="mx-auto text-black/30 mb-4" />
                            <p className="text-xl font-black text-black/60 italic">Aucune annonce trouvée</p>
                            <p className="text-black/40 mt-2">Créez votre première annonce</p>
                        </div>
                    ) : (
                        <div className="divide-y-2 divide-black/10">
                            {annoncesFiltrees.map((annonce) => (
                                <div key={annonce.id} className="p-5 hover:bg-gray-50 transition-colors">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                <h3 className="font-black text-black text-lg">{annonce.titre}</h3>
                                                <span className={`text-xs px-2 py-1 rounded-full font-black ${annonce.type === 'public' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                                                    }`}>
                                                    {annonce.type === 'public' ? '🌍 Public' : '🔒 Interne'}
                                                </span>
                                                {annonce.type === 'interne' && (
                                                    <span className="text-xs px-2 py-1 rounded-full font-black bg-blue-100 text-blue-700">
                                                        {annonce.generation_concernee}
                                                    </span>
                                                )}
                                                {annonce.type === 'public' && (
                                                    <span className="text-xs px-2 py-1 rounded-full font-black bg-green-100 text-green-700">
                                                        Toutes les générations
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-black/70 mb-2">{annonce.contenu}</p>
                                            <div className="flex gap-4 mt-3 text-xs text-black/40">
                                                <span>Par {annonce.auteur}</span>
                                                <span>{new Date(annonce.created_at).toLocaleDateString()} à {new Date(annonce.created_at).toLocaleTimeString()}</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleSupprimerAnnonce(annonce.id)}
                                            className="text-red-500 hover:text-red-700 p-1"
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Pied de page */}
                <div className="mt-6 text-center">
                    <p className="text-xs text-black/40 font-black uppercase tracking-wider">
                        Bureau Central Baliou Padra — Communication
                    </p>
                </div>
            </div>

            {/* Modal Nouvelle Annonce */}
            {showAnnonceModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white border-4 border-black rounded-2xl max-w-md w-full p-6 shadow-[15px_15px_0px_0px_rgba(0,0,0,0.2)]">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-black text-black">📢 Nouvelle annonce</h2>
                            <button onClick={() => setShowAnnonceModal(false)} className="text-black hover:text-red-500">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleCreerAnnonce} className="space-y-4">
                            <div>
                                <label className="block text-black font-black mb-1">Titre *</label>
                                <input
                                    type="text"
                                    value={formAnnonce.titre}
                                    onChange={(e) => setFormAnnonce({ ...formAnnonce, titre: e.target.value })}
                                    className="w-full p-3 border-4 border-black rounded-xl font-black text-black bg-white focus:bg-yellow-50 outline-none"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-black font-black mb-1">Contenu *</label>
                                <textarea
                                    value={formAnnonce.contenu}
                                    onChange={(e) => setFormAnnonce({ ...formAnnonce, contenu: e.target.value })}
                                    className="w-full p-3 border-4 border-black rounded-xl font-black text-black bg-white focus:bg-yellow-50 outline-none"
                                    rows={4}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-black font-black mb-1">Visibilité</label>
                                <select
                                    value={formAnnonce.type}
                                    onChange={(e) => setFormAnnonce({ ...formAnnonce, type: e.target.value })}
                                    className="w-full p-3 border-4 border-black rounded-xl font-black text-black bg-white focus:bg-yellow-50 outline-none"
                                >
                                    <option value="public">🌍 Public (toute la communauté)</option>
                                    <option value="interne">🔒 Interne (génération spécifique)</option>
                                </select>
                            </div>
                            {formAnnonce.type === 'interne' && (
                                <div>
                                    <label className="block text-black font-black mb-1">Génération cible</label>
                                    <select
                                        value={formAnnonce.generation_concernee}
                                        onChange={(e) => setFormAnnonce({ ...formAnnonce, generation_concernee: e.target.value })}
                                        className="w-full p-3 border-4 border-black rounded-xl font-black text-black bg-white focus:bg-yellow-50 outline-none"
                                        required
                                    >
                                        <option value="">-- Sélectionner une génération --</option>
                                        {generationsList.map(gen => (
                                            <option key={gen} value={gen}>{gen}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setShowAnnonceModal(false)} className="flex-1 bg-gray-200 py-3 rounded-xl font-black">Annuler</button>
                                <button type="submit" className="flex-1 bg-black text-white py-3 rounded-xl font-black hover:bg-[#146332]">Publier</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}