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
    Calendar,
    RefreshCw,
    Plus,
    X,
    Eye,
    EyeOff,
    MessageSquare,
    Bell,
    TrendingUp,
    Heart,
    Share2,
    Clock,
    CheckCircle,
    AlertCircle,
    Image as ImageIcon,
    Link as LinkIcon,
    Tag
} from 'lucide-react';

export default function ComiteComGenDashboard() {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [user, setUser] = useState(null);
    const [generation, setGeneration] = useState(null);
    const [annonces, setAnnonces] = useState([]);
    const [evenements, setEvenements] = useState([]);
    const [membres, setMembres] = useState([]);
    const [showAnnonceModal, setShowAnnonceModal] = useState(false);
    const [showEvenementModal, setShowEvenementModal] = useState(false);
    const [selectedAnnonce, setSelectedAnnonce] = useState(null);
    const [stats, setStats] = useState({
        totalAnnonces: 0,
        totalEvenements: 0,
        annoncesPubliques: 0,
        annoncesPrivees: 0,
        evenementsPasses: 0,
        evenementsAVenir: 0
    });
    const [formAnnonce, setFormAnnonce] = useState({
        titre: '',
        contenu: '',
        type: 'interne',
        image_url: '',
        lien: ''
    });
    const [formEvenement, setFormEvenement] = useState({
        titre: '',
        description: '',
        date_debut: '',
        date_fin: '',
        lieu: '',
        type: 'reunion'
    });
    const router = useRouter();

    const typesEvenement = [
        { value: 'reunion', label: '📢 Réunion', color: 'bg-blue-100 text-blue-800' },
        { value: 'ceremonie', label: '🎉 Cérémonie', color: 'bg-purple-100 text-purple-800' },
        { value: 'collecte', label: '💰 Collecte', color: 'bg-green-100 text-green-800' },
        { value: 'spirituel', label: '🕌 Spirituel', color: 'bg-yellow-100 text-yellow-800' },
        { value: 'social', label: '🤝 Social', color: 'bg-red-100 text-red-800' }
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
            .select('*')
            .eq('user_id', session.user.id)
            .maybeSingle();

        if (profile?.role !== 'comite_com_gen') {
            router.push('/dashboard');
            return;
        }

        setUser(profile);

        if (profile.generation) {
            await loadGenerationData(profile.generation);
            await loadAnnonces(profile.generation);
            await loadEvenements(profile.generation);
            await loadMembres(profile.generation);
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
        }
    };

    const loadAnnonces = async (generationNom) => {
        const { data } = await supabase
            .from('annonces')
            .select('*')
            .eq('generation_concernee', generationNom)
            .order('created_at', { ascending: false });

        setAnnonces(data || []);

        setStats(prev => ({
            ...prev,
            totalAnnonces: data?.length || 0,
            annoncesPubliques: data?.filter(a => a.type === 'public').length || 0,
            annoncesPrivees: data?.filter(a => a.type === 'interne').length || 0
        }));
    };

    const loadEvenements = async (generationNom) => {
        const { data } = await supabase
            .from('evenements')
            .select('*')
            .eq('generation_concernee', generationNom)
            .order('date_debut', { ascending: true });

        setEvenements(data || []);

        const now = new Date();
        setStats(prev => ({
            ...prev,
            totalEvenements: data?.length || 0,
            evenementsPasses: data?.filter(e => new Date(e.date_fin || e.date_debut) < now).length || 0,
            evenementsAVenir: data?.filter(e => new Date(e.date_debut) >= now).length || 0
        }));
    };

    const loadMembres = async (generationNom) => {
        const { data } = await supabase
            .from('membres')
            .select('*')
            .eq('generation', generationNom)
            .eq('est_valide', true);

        setMembres(data || []);
    };

    const handleCreerAnnonce = async (e) => {
        e.preventDefault();

        const { error } = await supabase
            .from('annonces')
            .insert([{
                titre: formAnnonce.titre,
                contenu: formAnnonce.contenu,
                type: formAnnonce.type,
                generation_concernee: user.generation,
                auteur: user.nom_complet,
                image_url: formAnnonce.image_url || null,
                lien: formAnnonce.lien || null,
                created_at: new Date().toISOString()
            }]);

        if (error) {
            alert("Erreur: " + error.message);
            return;
        }

        alert("Annonce publiée avec succès !");
        setShowAnnonceModal(false);
        setFormAnnonce({
            titre: '',
            contenu: '',
            type: 'interne',
            image_url: '',
            lien: ''
        });
        await loadAnnonces(user.generation);
    };

    const handleCreerEvenement = async (e) => {
        e.preventDefault();

        const { error } = await supabase
            .from('evenements')
            .insert([{
                titre: formEvenement.titre,
                description: formEvenement.description,
                date_debut: formEvenement.date_debut,
                date_fin: formEvenement.date_fin || null,
                lieu: formEvenement.lieu,
                type: formEvenement.type,
                generation_concernee: user.generation,
                cree_par: user.nom_complet,
                created_at: new Date().toISOString()
            }]);

        if (error) {
            alert("Erreur: " + error.message);
            return;
        }

        alert("Événement créé avec succès !");
        setShowEvenementModal(false);
        setFormEvenement({
            titre: '',
            description: '',
            date_debut: '',
            date_fin: '',
            lieu: '',
            type: 'reunion'
        });
        await loadEvenements(user.generation);
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
            await loadAnnonces(user.generation);
        }
    };

    const handleSupprimerEvenement = async (evenementId) => {
        if (!confirm("Supprimer cet événement ?")) return;

        const { error } = await supabase
            .from('evenements')
            .delete()
            .eq('id', evenementId);

        if (error) {
            alert("Erreur: " + error.message);
        } else {
            alert("Événement supprimé");
            await loadEvenements(user.generation);
        }
    };

    const getEvenementTypeLabel = (type) => {
        const t = typesEvenement.find(t => t.value === type);
        return t?.label || type;
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
                    <div className="flex justify-between items-start flex-wrap gap-4">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <Megaphone size={32} className="text-orange-500" />
                                <h1 className="text-4xl font-black text-[#146332] uppercase italic">
                                    COMITÉ COMMUNICATION
                                </h1>
                            </div>
                            <div className="h-1 w-32 bg-black mt-2"></div>
                            <p className="text-black/60 mt-2">
                                {user?.generation} • {user?.nom_complet}
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowAnnonceModal(true)}
                                className="flex items-center gap-2 bg-[#146332] text-white px-4 py-2 rounded-xl font-black text-sm hover:bg-black transition-all"
                            >
                                <Send size={16} /> Nouvelle annonce
                            </button>
                            <button
                                onClick={() => setShowEvenementModal(true)}
                                className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-xl font-black text-sm hover:bg-purple-700 transition-all"
                            >
                                <Calendar size={16} /> Nouvel événement
                            </button>
                            <button
                                onClick={() => {
                                    loadAnnonces(user.generation);
                                    loadEvenements(user.generation);
                                }}
                                disabled={refreshing}
                                className="flex items-center gap-2 bg-gray-200 text-black px-4 py-2 rounded-xl font-black text-sm hover:bg-gray-300 transition-all"
                            >
                                <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                                Actualiser
                            </button>
                        </div>
                    </div>
                </div>

                {/* Cartes statistiques */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                    <StatCard title="Annonces" value={stats.totalAnnonces} icon={<MessageSquare size={18} />} color="bg-blue-500" />
                    <StatCard title="Événements" value={stats.totalEvenements} icon={<Calendar size={18} />} color="bg-purple-500" />
                    <StatCard title="Annonces publiques" value={stats.annoncesPubliques} icon={<Eye size={18} />} color="bg-green-500" />
                    <StatCard title="Annonces privées" value={stats.annoncesPrivees} icon={<EyeOff size={18} />} color="bg-gray-500" />
                    <StatCard title="Événements à venir" value={stats.evenementsAVenir} icon={<Clock size={18} />} color="bg-yellow-500" />
                    <StatCard title="Membres" value={membres.length} icon={<Users size={18} />} color="bg-indigo-500" />
                </div>

                {/* Section Annonces */}
                <div className="bg-white border-4 border-black rounded-2xl overflow-hidden mb-6">
                    <div className="bg-black p-4">
                        <h2 className="text-white font-black uppercase text-sm flex items-center gap-2">
                            <Megaphone size={16} /> Dernières annonces
                        </h2>
                    </div>
                    {annonces.length === 0 ? (
                        <div className="p-12 text-center">
                            <MessageSquare size={48} className="mx-auto text-black/30 mb-4" />
                            <p className="text-xl font-black text-black/60 italic">Aucune annonce</p>
                            <p className="text-black/40 mt-2">Créez votre première annonce</p>
                        </div>
                    ) : (
                        <div className="divide-y-2 divide-black/10">
                            {annonces.map((annonce) => (
                                <div key={annonce.id} className="p-5 hover:bg-gray-50 transition-colors">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <h3 className="font-black text-black text-lg">{annonce.titre}</h3>
                                                <span className={`text-xs px-2 py-1 rounded-full font-black ${annonce.type === 'public' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                                                    }`}>
                                                    {annonce.type === 'public' ? '🌍 Public' : '🔒 Génération uniquement'}
                                                </span>
                                            </div>
                                            <p className="text-black/70 mb-2">{annonce.contenu}</p>
                                            {annonce.lien && (
                                                <a href={annonce.lien} target="_blank" rel="noopener noreferrer" className="text-blue-500 text-sm flex items-center gap-1 hover:underline">
                                                    <LinkIcon size={14} /> {annonce.lien}
                                                </a>
                                            )}
                                            <div className="flex gap-4 mt-3 text-xs text-black/40">
                                                <span>Par {annonce.auteur}</span>
                                                <span>{new Date(annonce.created_at).toLocaleDateString()}</span>
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

                {/* Section Événements */}
                <div className="bg-white border-4 border-black rounded-2xl overflow-hidden">
                    <div className="bg-black p-4">
                        <h2 className="text-white font-black uppercase text-sm flex items-center gap-2">
                            <Calendar size={16} /> Événements à venir
                        </h2>
                    </div>
                    {evenements.filter(e => new Date(e.date_debut) >= new Date()).length === 0 ? (
                        <div className="p-12 text-center">
                            <Calendar size={48} className="mx-auto text-black/30 mb-4" />
                            <p className="text-xl font-black text-black/60 italic">Aucun événement planifié</p>
                            <p className="text-black/40 mt-2">Créez un événement pour mobiliser la génération</p>
                        </div>
                    ) : (
                        <div className="divide-y-2 divide-black/10">
                            {evenements
                                .filter(e => new Date(e.date_debut) >= new Date())
                                .map((evenement) => (
                                    <div key={evenement.id} className="p-5 hover:bg-gray-50 transition-colors">
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <h3 className="font-black text-black text-lg">{evenement.titre}</h3>
                                                    <span className={`text-xs px-2 py-1 rounded-full font-black ${typesEvenement.find(t => t.value === evenement.type)?.color || 'bg-gray-100'}`}>
                                                        {getEvenementTypeLabel(evenement.type)}
                                                    </span>
                                                </div>
                                                <p className="text-black/70 mb-2">{evenement.description}</p>
                                                <div className="grid grid-cols-2 gap-2 text-sm text-black/60 mt-2">
                                                    <div>📅 Début: {new Date(evenement.date_debut).toLocaleDateString()}</div>
                                                    {evenement.date_fin && <div>📅 Fin: {new Date(evenement.date_fin).toLocaleDateString()}</div>}
                                                    {evenement.lieu && <div>📍 {evenement.lieu}</div>}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleSupprimerEvenement(evenement.id)}
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
            </div>

            {/* Modal Nouvelle Annonce */}
            {showAnnonceModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white border-4 border-black rounded-2xl max-w-md w-full p-6">
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
                                    <option value="interne">🔒 Interne (seulement ma génération)</option>
                                    <option value="public">🌍 Public (toute la communauté)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-black font-black mb-1">Lien (optionnel)</label>
                                <input
                                    type="url"
                                    value={formAnnonce.lien}
                                    onChange={(e) => setFormAnnonce({ ...formAnnonce, lien: e.target.value })}
                                    className="w-full p-3 border-4 border-black rounded-xl font-black text-black bg-white focus:bg-yellow-50 outline-none"
                                    placeholder="https://..."
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setShowAnnonceModal(false)} className="flex-1 bg-gray-200 py-3 rounded-xl font-black">Annuler</button>
                                <button type="submit" className="flex-1 bg-black text-white py-3 rounded-xl font-black hover:bg-[#146332]">Publier</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Nouvel Événement */}
            {showEvenementModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white border-4 border-black rounded-2xl max-w-md w-full p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-black text-black">📅 Nouvel événement</h2>
                            <button onClick={() => setShowEvenementModal(false)} className="text-black hover:text-red-500">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleCreerEvenement} className="space-y-4">
                            <div>
                                <label className="block text-black font-black mb-1">Titre *</label>
                                <input
                                    type="text"
                                    value={formEvenement.titre}
                                    onChange={(e) => setFormEvenement({ ...formEvenement, titre: e.target.value })}
                                    className="w-full p-3 border-4 border-black rounded-xl font-black text-black bg-white focus:bg-yellow-50 outline-none"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-black font-black mb-1">Description</label>
                                <textarea
                                    value={formEvenement.description}
                                    onChange={(e) => setFormEvenement({ ...formEvenement, description: e.target.value })}
                                    className="w-full p-3 border-4 border-black rounded-xl font-black text-black bg-white focus:bg-yellow-50 outline-none"
                                    rows={3}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-black font-black mb-1">Date début *</label>
                                    <input
                                        type="date"
                                        value={formEvenement.date_debut}
                                        onChange={(e) => setFormEvenement({ ...formEvenement, date_debut: e.target.value })}
                                        className="w-full p-3 border-4 border-black rounded-xl font-black text-black bg-white focus:bg-yellow-50 outline-none"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-black font-black mb-1">Date fin</label>
                                    <input
                                        type="date"
                                        value={formEvenement.date_fin}
                                        onChange={(e) => setFormEvenement({ ...formEvenement, date_fin: e.target.value })}
                                        className="w-full p-3 border-4 border-black rounded-xl font-black text-black bg-white focus:bg-yellow-50 outline-none"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-black font-black mb-1">Lieu</label>
                                <input
                                    type="text"
                                    value={formEvenement.lieu}
                                    onChange={(e) => setFormEvenement({ ...formEvenement, lieu: e.target.value })}
                                    className="w-full p-3 border-4 border-black rounded-xl font-black text-black bg-white focus:bg-yellow-50 outline-none"
                                    placeholder="Salle, adresse..."
                                />
                            </div>
                            <div>
                                <label className="block text-black font-black mb-1">Type</label>
                                <select
                                    value={formEvenement.type}
                                    onChange={(e) => setFormEvenement({ ...formEvenement, type: e.target.value })}
                                    className="w-full p-3 border-4 border-black rounded-xl font-black text-black bg-white focus:bg-yellow-50 outline-none"
                                >
                                    {typesEvenement.map(t => (
                                        <option key={t.value} value={t.value}>{t.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setShowEvenementModal(false)} className="flex-1 bg-gray-200 py-3 rounded-xl font-black">Annuler</button>
                                <button type="submit" className="flex-1 bg-black text-white py-3 rounded-xl font-black hover:bg-[#146332]">Créer</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

// Composant carte statistique
function StatCard({ title, value, icon, color }) {
    return (
        <div className="bg-white border-4 border-black rounded-2xl p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.1)]">
            <div className="flex items-center justify-between mb-2">
                <div className={`${color} p-2 rounded-xl text-white`}>{icon}</div>
            </div>
            <p className="text-2xl font-black text-black">{value}</p>
            <p className="text-xs font-black uppercase text-black/50 mt-1">{title}</p>
        </div>
    );
}