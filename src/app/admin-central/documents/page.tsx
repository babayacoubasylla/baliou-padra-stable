"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft,
    FileText,
    File,
    Image,
    FileSpreadsheet,
    FileJson,
    Download,
    Trash2,
    Plus,
    X,
    Search,
    Calendar,
    User,
    FolderOpen,
    Upload,
    Eye,
    RefreshCw,
    FolderPlus,
    Grid3x3,
    List
} from 'lucide-react';

export default function DocumentsPage() {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [documents, setDocuments] = useState([]);
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('tous');
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState('grid');
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [formData, setFormData] = useState({
        titre: '',
        description: '',
        categorie: '',
        fichier: null
    });
    const router = useRouter();

    // Catégories par défaut
    const defaultCategories = [
        { id: '1', nom: 'Finances', description: 'Documents financiers', couleur: '#146332', icone: '💰' },
        { id: '2', nom: 'Administratif', description: 'Documents administratifs', couleur: '#2563eb', icone: '📋' },
        { id: '3', nom: 'Historique', description: 'Documents historiques', couleur: '#7c3aed', icone: '📜' },
        { id: '4', nom: 'Spirituel', description: 'Documents spirituels', couleur: '#dc2626', icone: '🕌' },
        { id: '5', nom: 'Règlement', description: 'Règlements et statuts', couleur: '#ea580c', icone: '⚖️' },
        { id: '6', nom: 'Autre', description: 'Autres documents', couleur: '#6b7280', icone: '📁' }
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

        await loadDocuments();
        setCategories(defaultCategories);
        setLoading(false);
    };

    const loadDocuments = async () => {
        setRefreshing(true);

        const { data, error } = await supabase
            .from('documents_centraux')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Erreur chargement documents:", error);
            setDocuments([]);
        } else {
            setDocuments(data || []);
        }

        setRefreshing(false);
    };

    const handleUpload = async (e) => {
        e.preventDefault();

        if (!formData.fichier) {
            alert("Veuillez sélectionner un fichier");
            return;
        }

        setUploading(true);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const fileName = `${Date.now()}_${formData.fichier.name}`;

            // Upload du fichier vers Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('documents')
                .upload(fileName, formData.fichier);

            if (uploadError) throw uploadError;

            // Récupérer l'URL publique
            const { data: urlData } = supabase.storage
                .from('documents')
                .getPublicUrl(fileName);

            // Sauvegarder les métadonnées dans la base
            const { error: dbError } = await supabase
                .from('documents_centraux')
                .insert([{
                    titre: formData.titre,
                    description: formData.description,
                    categorie: formData.categorie,
                    url: urlData.publicUrl,
                    nom_fichier: formData.fichier.name,
                    taille: formData.fichier.size,
                    type_mime: formData.fichier.type,
                    cree_par: session?.user?.email || 'admin',
                    created_at: new Date().toISOString()
                }]);

            if (dbError) throw dbError;

            alert("Document uploadé avec succès !");
            setShowUploadModal(false);
            setFormData({ titre: '', description: '', categorie: '', fichier: null });
            await loadDocuments();

        } catch (error) {
            alert("Erreur lors de l'upload: " + error.message);
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteDocument = async (documentId, documentTitre) => {
        if (!confirm(`Êtes-vous sûr de vouloir supprimer "${documentTitre}" ?`)) return;

        const { error } = await supabase
            .from('documents_centraux')
            .delete()
            .eq('id', documentId);

        if (error) {
            alert("Erreur: " + error.message);
        } else {
            alert("Document supprimé !");
            await loadDocuments();
        }
    };

    const getFileIcon = (typeMime) => {
        if (!typeMime) return <File size={24} />;
        if (typeMime.includes('pdf')) return <FileText size={24} className="text-red-500" />;
        if (typeMime.includes('image')) return <Image size={24} className="text-purple-500" />;
        if (typeMime.includes('spreadsheet') || typeMime.includes('excel')) return <FileSpreadsheet size={24} className="text-green-500" />;
        if (typeMime.includes('document') || typeMime.includes('word')) return <FileText size={24} className="text-blue-500" />;
        if (typeMime.includes('json')) return <FileJson size={24} className="text-yellow-500" />;
        return <File size={24} />;
    };

    const formatFileSize = (bytes) => {
        if (!bytes) return 'Taille inconnue';
        const sizes = ['o', 'Ko', 'Mo', 'Go'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
    };

    const getCategoryColor = (categorieNom) => {
        const cat = categories.find(c => c.nom === categorieNom);
        return cat?.couleur || '#6b7280';
    };

    const getCategoryIcon = (categorieNom) => {
        const cat = categories.find(c => c.nom === categorieNom);
        return cat?.icone || '📁';
    };

    const filteredDocuments = documents.filter(doc => {
        const matchCategory = selectedCategory === 'tous' || doc.categorie === selectedCategory;
        const matchSearch = searchTerm === '' ||
            doc.titre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            doc.description?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchCategory && matchSearch;
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
                            <h1 className="text-4xl font-black text-[#146332] uppercase italic">
                                BIBLIOTHÈQUE NUMÉRIQUE
                            </h1>
                            <div className="h-1 w-32 bg-black mt-2"></div>
                            <p className="text-black/60 mt-2">Gestion des documents officiels et archives</p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowUploadModal(true)}
                                className="flex items-center gap-2 bg-[#146332] text-white px-4 py-2 rounded-xl font-black text-sm hover:bg-black transition-all"
                            >
                                <Upload size={16} /> Upload document
                            </button>
                            <button
                                onClick={loadDocuments}
                                disabled={refreshing}
                                className="flex items-center gap-2 bg-gray-200 text-black px-4 py-2 rounded-xl font-black text-sm hover:bg-gray-300 transition-all"
                            >
                                <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                                Actualiser
                            </button>
                        </div>
                    </div>
                </div>

                {/* Filtres et recherche */}
                <div className="bg-white border-4 border-black rounded-2xl p-6 mb-6">
                    <div className="flex flex-wrap gap-4 items-center justify-between">
                        <div className="flex-1 min-w-[200px]">
                            <div className="relative">
                                <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-black/40" />
                                <input
                                    type="text"
                                    placeholder="Rechercher un document..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 border-4 border-black rounded-xl font-black text-sm text-black bg-white focus:bg-yellow-50 outline-none"
                                />
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="px-4 py-3 border-4 border-black rounded-xl font-black text-sm text-black bg-white focus:bg-yellow-50 outline-none"
                            >
                                <option value="tous">📁 Toutes les catégories</option>
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.nom}>{cat.icone} {cat.nom}</option>
                                ))}
                            </select>
                            <div className="flex border-4 border-black rounded-xl overflow-hidden">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`p-3 ${viewMode === 'grid' ? 'bg-black text-white' : 'bg-white text-black'}`}
                                >
                                    <Grid3x3 size={18} />
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`p-3 ${viewMode === 'list' ? 'bg-black text-white' : 'bg-white text-black'}`}
                                >
                                    <List size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Statistiques */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-white border-4 border-black rounded-2xl p-4 text-center">
                        <p className="text-2xl font-black text-black">{documents.length}</p>
                        <p className="text-xs font-black uppercase text-black/50">Total documents</p>
                    </div>
                    <div className="bg-white border-4 border-black rounded-2xl p-4 text-center">
                        <p className="text-2xl font-black text-black">{categories.length}</p>
                        <p className="text-xs font-black uppercase text-black/50">Catégories</p>
                    </div>
                    <div className="bg-white border-4 border-black rounded-2xl p-4 text-center">
                        <p className="text-2xl font-black text-black">
                            {documents.filter(d => new Date(d.created_at).getMonth() === new Date().getMonth()).length}
                        </p>
                        <p className="text-xs font-black uppercase text-black/50">Ce mois</p>
                    </div>
                </div>

                {/* Affichage des documents */}
                {filteredDocuments.length === 0 ? (
                    <div className="bg-white border-4 border-black rounded-2xl p-12 text-center">
                        <FolderOpen size={64} className="mx-auto text-black/30 mb-4" />
                        <p className="text-xl font-black text-black/60 italic">Aucun document trouvé</p>
                        <p className="text-black/40 mt-2">Utilisez le bouton "Upload document" pour ajouter des fichiers</p>
                    </div>
                ) : viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredDocuments.map((doc) => (
                            <div key={doc.id} className="bg-white border-4 border-black rounded-2xl overflow-hidden hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,0.1)] transition-all">
                                <div className="bg-gray-50 p-6 border-b-4 border-black flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-white border-4 border-black rounded-xl flex items-center justify-center">
                                            {getFileIcon(doc.type_mime)}
                                        </div>
                                        <div>
                                            <h3 className="font-black text-black text-sm line-clamp-1">{doc.titre}</h3>
                                            <p className="text-xs text-black/50">{formatFileSize(doc.taille)}</p>
                                        </div>
                                    </div>
                                    <span
                                        className="text-xs font-black px-2 py-1 rounded-full text-white"
                                        style={{ backgroundColor: getCategoryColor(doc.categorie) }}
                                    >
                                        {getCategoryIcon(doc.categorie)} {doc.categorie}
                                    </span>
                                </div>
                                <div className="p-5">
                                    <p className="text-sm text-black/70 mb-4 line-clamp-2">{doc.description || 'Aucune description'}</p>
                                    <div className="flex items-center gap-4 text-xs text-black/50 mb-4">
                                        <span className="flex items-center gap-1"><User size={12} /> {doc.cree_par?.split('@')[0]}</span>
                                        <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(doc.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex gap-3">
                                        <a
                                            href={doc.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex-1 bg-black text-white py-2 rounded-xl font-black text-xs hover:bg-[#146332] transition-all flex items-center justify-center gap-1"
                                        >
                                            <Eye size={14} /> Voir
                                        </a>
                                        <a
                                            href={doc.url}
                                            download
                                            className="flex-1 bg-gray-200 text-black py-2 rounded-xl font-black text-xs hover:bg-gray-300 transition-all flex items-center justify-center gap-1"
                                        >
                                            <Download size={14} /> Télécharger
                                        </a>
                                        <button
                                            onClick={() => handleDeleteDocument(doc.id, doc.titre)}
                                            className="bg-red-500 text-white p-2 rounded-xl hover:bg-red-600 transition-all"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-white border-4 border-black rounded-2xl overflow-hidden">
                        <div className="bg-black p-4">
                            <h2 className="text-white font-black uppercase text-sm">📋 Liste des documents</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="p-3 text-left font-black text-sm">Document</th>
                                        <th className="p-3 text-left font-black text-sm">Catégorie</th>
                                        <th className="p-3 text-left font-black text-sm">Date</th>
                                        <th className="p-3 text-center font-black text-sm">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredDocuments.map((doc) => (
                                        <tr key={doc.id} className="border-b border-black/10 hover:bg-gray-50 transition-colors">
                                            <td className="p-3">
                                                <div className="flex items-center gap-3">
                                                    {getFileIcon(doc.type_mime)}
                                                    <div>
                                                        <p className="font-black text-black">{doc.titre}</p>
                                                        <p className="text-xs text-black/50">{doc.nom_fichier}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-3">
                                                <span className="text-xs font-black px-2 py-1 rounded-full text-white" style={{ backgroundColor: getCategoryColor(doc.categorie) }}>
                                                    {getCategoryIcon(doc.categorie)} {doc.categorie}
                                                </span>
                                            </td>
                                            <td className="p-3 text-black/60 text-sm">{new Date(doc.created_at).toLocaleDateString()}</td>
                                            <td className="p-3 text-center">
                                                <div className="flex gap-2 justify-center">
                                                    <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700">
                                                        <Eye size={18} />
                                                    </a>
                                                    <a href={doc.url} download className="text-green-500 hover:text-green-700">
                                                        <Download size={18} />
                                                    </a>
                                                    <button onClick={() => handleDeleteDocument(doc.id, doc.titre)} className="text-red-500 hover:text-red-700">
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Modal Upload Document */}
                {showUploadModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white border-4 border-black rounded-2xl max-w-lg w-full p-6 shadow-[15px_15px_0px_0px_rgba(0,0,0,0.2)]">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-black text-black">📤 Upload un document</h2>
                                <button onClick={() => setShowUploadModal(false)} className="text-black hover:text-red-500 transition-colors">
                                    <X size={24} />
                                </button>
                            </div>
                            <form onSubmit={handleUpload} className="space-y-4">
                                <div>
                                    <label className="block text-black font-black mb-1">Titre *</label>
                                    <input
                                        type="text"
                                        value={formData.titre}
                                        onChange={(e) => setFormData({ ...formData, titre: e.target.value })}
                                        className="w-full p-3 border-4 border-black rounded-xl font-black text-black bg-white focus:bg-yellow-50 outline-none"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-black font-black mb-1">Catégorie *</label>
                                    <select
                                        value={formData.categorie}
                                        onChange={(e) => setFormData({ ...formData, categorie: e.target.value })}
                                        className="w-full p-3 border-4 border-black rounded-xl font-black text-black bg-white focus:bg-yellow-50 outline-none"
                                        required
                                    >
                                        <option value="">Sélectionner</option>
                                        {categories.map(cat => (
                                            <option key={cat.id} value={cat.nom}>{cat.icone} {cat.nom}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-black font-black mb-1">Description</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full p-3 border-4 border-black rounded-xl font-black text-black bg-white focus:bg-yellow-50 outline-none"
                                        rows={3}
                                        placeholder="Description du document..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-black font-black mb-1">Fichier *</label>
                                    <input
                                        type="file"
                                        onChange={(e) => setFormData({ ...formData, fichier: e.target.files[0] })}
                                        className="w-full p-3 border-4 border-black rounded-xl font-black text-black bg-white file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:font-black file:bg-black file:text-white hover:file:bg-[#146332] transition-all"
                                        required
                                    />
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowUploadModal(false)}
                                        className="flex-1 bg-gray-200 text-black py-3 rounded-xl font-black uppercase text-sm hover:bg-gray-300 transition-all"
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={uploading}
                                        className="flex-1 bg-black text-white py-3 rounded-xl font-black uppercase text-sm hover:bg-[#146332] transition-all disabled:opacity-50"
                                    >
                                        {uploading ? "Upload en cours..." : "Uploader"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Pied de page */}
                <div className="mt-8 text-center">
                    <p className="text-xs text-black/40 font-black uppercase tracking-wider">
                        Bureau Central Baliou Padra — Bibliothèque numérique
                    </p>
                </div>
            </div>
        </div>
    );
}