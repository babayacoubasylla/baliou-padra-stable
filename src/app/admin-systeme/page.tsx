"use client";
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function AdminSystemePage() {
    const [membres, setMembres] = useState<any[]>([]);
    const [chargement, setChargement] = useState(true);
    const [recherche, setRecherche] = useState("");
    const [showComiteForm, setShowComiteForm] = useState(false);
    const [comiteNom, setComiteNom] = useState('');
    const [comiteType, setComiteType] = useState('permanent');
    const [membresSelectionnes, setMembresSelectionnes] = useState<string[]>([]);
    const [comitesExistants, setComitesExistants] = useState<any[]>([]);
    const [accesAutorise, setAccesAutorise] = useState(false);
    const router = useRouter();

    useEffect(() => {
        verifierIdentite();
    }, []);

    async function verifierIdentite() {
        // 🔐 SÉCURITÉ RENFORCÉE : Vérification immédiate
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            router.push('/login');
            return;
        }

        // Vérification du rôle Super Admin
        const { data: p, error } = await supabase
            .from('membres')
            .select('role')
            .eq('user_id', user.id)
            .maybeSingle();

        if (error) {
            console.error("Erreur vérification rôle:", error);
            router.push('/login');
            return;
        }

        if (p?.role !== 'super_admin') {
            alert("ACCÈS ROOT INTERDIT");
            router.push('/profil'); // Expulsion immédiate
            return;
        }

        // Seulement si tout est OK, on autorise l'accès et on charge les données
        setAccesAutorise(true);
        await chargerMembres();
        await chargerComites();
        setChargement(false);
    }

    async function chargerMembres() {
        const { data } = await supabase.from('membres').select('*').order('nom_complet');
        setMembres(data || []);
    }

    async function chargerComites() {
        const { data } = await supabase.from('comites').select('*').order('created_at', { ascending: false });
        setComitesExistants(data || []);
    }

    // ✏️ MODIFIER LE RÔLE D'UN MEMBRE
    async function updateRole(id: string, newRole: string) {
        const { error } = await supabase.from('membres').update({ role: newRole, est_valide: true }).eq('id', id);
        if (error) alert(error.message);
        else { alert("Pouvoir délégué !"); chargerMembres(); }
    }

    // 🔓 VALIDER / BLOQUER UN MEMBRE
    async function toggleValidation(id: string, currentStatus: boolean) {
        const { error } = await supabase.from('membres').update({ est_valide: !currentStatus }).eq('id', id);
        if (error) alert(error.message); else chargerMembres();
    }

    // 🗑️ SUPPRIMER UN COMPTE MEMBRE
    async function supprimerCompte(id: string, nom: string) {
        if (!confirm(`⚠️ ATTENTION ! Êtes-vous sûr de vouloir supprimer définitivement le compte de ${nom} ?\n\nCette action est IRRÉVERSIBLE.`)) return;

        try {
            // 1. Récupérer l'user_id du membre
            const { data: membre } = await supabase
                .from('membres')
                .select('user_id')
                .eq('id', id)
                .single();

            // 2. Supprimer la fiche membre
            const { error: deleteMembreError } = await supabase
                .from('membres')
                .delete()
                .eq('id', id);

            if (deleteMembreError) throw deleteMembreError;

            // 3. Supprimer le compte auth si user_id existe
            if (membre?.user_id) {
                const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(membre.user_id);
                if (deleteAuthError) console.error("Erreur suppression auth:", deleteAuthError);
            }

            alert(`Le compte de ${nom} a été supprimé définitivement.`);
            chargerMembres();

        } catch (error: any) {
            alert("Erreur lors de la suppression : " + error.message);
        }
    }

    // 📧 CHANGER L'EMAIL D'UN MEMBRE
    async function changerEmail(id: string, currentEmail: string) {
        const nouvelEmail = prompt("Nouvelle adresse email :", currentEmail);
        if (!nouvelEmail || nouvelEmail === currentEmail) return;

        // Récupérer l'user_id
        const { data: membre } = await supabase
            .from('membres')
            .select('user_id')
            .eq('id', id)
            .single();

        if (membre?.user_id) {
            const { error } = await supabase.auth.admin.updateUserById(membre.user_id, { email: nouvelEmail });
            if (error) alert("Erreur : " + error.message);
            else alert(`Email modifié en : ${nouvelEmail}`);
        }
        chargerMembres();
    }

    // 🔑 RÉINITIALISER LE MOT DE PASSE
    async function resetPassword(id: string, nom: string) {
        if (!confirm(`Voulez-vous envoyer un email de réinitialisation de mot de passe à ${nom} ?`)) return;

        const { data: membre } = await supabase
            .from('membres')
            .select('user_id')
            .eq('id', id)
            .single();

        if (membre?.user_id) {
            const { error } = await supabase.auth.admin.resetPasswordForEmail(membre.user_id);
            if (error) alert("Erreur : " + error.message);
            else alert(`Email de réinitialisation envoyé à ${nom}.`);
        }
    }

    // 🚫 RADIER UN MEMBRE (Version simplifiée)
    async function radierMembre(id: string, nom: string) {
        const confirmation = window.confirm(`⚠️ ATTENTION : Voulez-vous vraiment RADIER définitivement ${nom} de la plateforme Baliou Padra ? Cette action est irréversible.`);

        if (confirmation) {
            const { error } = await supabase
                .from('membres')
                .delete()
                .eq('id', id);

            if (error) {
                alert("Erreur lors de la radiation : " + error.message);
            } else {
                alert("Membre radié avec succès.");
                chargerMembres(); // Rafraîchir la liste
            }
        }
    }

    // Fonction pour créer un comité
    async function creerComite(e: React.FormEvent) {
        e.preventDefault();

        if (!comiteNom.trim()) {
            alert("Veuillez entrer un nom pour le comité");
            return;
        }

        if (membresSelectionnes.length === 0) {
            alert("Veuillez sélectionner au moins un membre pour le comité");
            return;
        }

        try {
            // 1. Créer le comité
            const { data: comite, error: comiteError } = await supabase
                .from('comites')
                .insert({ nom: comiteNom, type: comiteType })
                .select()
                .single();

            if (comiteError) throw comiteError;

            // 2. Ajouter les membres choisis (de n'importe quelle génération)
            const liaisons = membresSelectionnes.map(id => ({
                comite_id: comite.id,
                membre_id: id
            }));

            const { error: liaisonError } = await supabase
                .from('comite_membres')
                .insert(liaisons);

            if (liaisonError) throw liaisonError;

            alert(`Comité "${comiteNom}" créé avec succès avec ${membresSelectionnes.length} membre(s) !`);

            // Réinitialiser le formulaire
            setComiteNom('');
            setComiteType('permanent');
            setMembresSelectionnes([]);
            setShowComiteForm(false);
            chargerComites();

        } catch (error: any) {
            alert("Erreur lors de la création du comité : " + error.message);
        }
    }

    // Gérer la sélection des membres
    function toggleMembreSelection(membreId: string) {
        setMembresSelectionnes(prev =>
            prev.includes(membreId)
                ? prev.filter(id => id !== membreId)
                : [...prev, membreId]
        );
    }

    // Filtrer les membres par recherche
    const membresFiltres = membres.filter(m =>
        m.nom_complet.toLowerCase().includes(recherche.toLowerCase())
    );

    // Affichage pendant le chargement
    if (chargement) {
        return <div className="min-h-screen bg-black text-white flex items-center justify-center font-black">SYSTEM_ROOT_BOOTING...</div>;
    }

    // Si l'accès n'est pas autorisé, ne rien afficher (la redirection a déjà eu lieu)
    if (!accesAutorise) {
        return null;
    }

    return (
        <main className="min-h-screen bg-white text-black p-4 md:p-12 font-mono">
            <style jsx global>{`
                ::selection {
                    background-color: black !important;
                    color: white !important;
                }
                ::-moz-selection {
                    background-color: black !important;
                    color: white !important;
                }
            `}</style>

            <div className="max-w-7xl mx-auto">
                <header className="mb-10 border-b-8 border-black pb-6 flex justify-between items-center flex-wrap gap-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-black uppercase text-red-600">👑 ADMIN SYSTÈME - ROOT</h1>
                        <p className="bg-black text-white px-2 inline-block text-xs mt-2">POUVOIR TOTAL SUR LES COMPTES & COMITÉS</p>
                    </div>
                    <div className="flex gap-3">
                        <input
                            type="text"
                            placeholder="Rechercher un nom..."
                            className="px-4 py-2 border-4 border-black rounded-2xl font-black uppercase text-sm"
                            onChange={e => setRecherche(e.target.value)}
                        />
                        <button onClick={() => supabase.auth.signOut().then(() => router.push('/login'))}
                            className="border-4 border-black px-4 md:px-6 py-2 font-black hover:bg-red-600 hover:text-white transition-all text-sm md:text-base">
                            LOGOUT
                        </button>
                    </div>
                </header>

                {/* SECTION CRÉATION DE COMITÉ */}
                <div className="mb-10">
                    <button
                        onClick={() => setShowComiteForm(!showComiteForm)}
                        className="mb-6 bg-black text-white px-6 py-3 font-black uppercase text-sm border-4 border-black hover:bg-blue-700 transition-all"
                    >
                        {showComiteForm ? "− FERMER LE FORMULAIRE" : "+ CRÉER UN NOUVEAU COMITÉ"}
                    </button>

                    {showComiteForm && (
                        <div className="bg-slate-100 border-4 border-black p-6 mb-8 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]">
                            <h2 className="text-2xl font-black uppercase mb-6">Créer un Comité</h2>
                            <form onSubmit={creerComite} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs font-black uppercase mb-2">Nom du Comité</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="Ex: Comité d'Organisation"
                                            className="w-full p-4 border-4 border-black font-bold bg-white"
                                            value={comiteNom}
                                            onChange={(e) => setComiteNom(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black uppercase mb-2">Type de Comité</label>
                                        <select
                                            className="w-full p-4 border-4 border-black font-bold bg-white"
                                            value={comiteType}
                                            onChange={(e) => setComiteType(e.target.value)}
                                        >
                                            <option value="permanent">Permanent</option>
                                            <option value="temporaire">Temporaire</option>
                                            <option value="special">Spécial</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-black uppercase mb-4">Sélectionner les Membres ({membresSelectionnes.length} sélectionné(s))</label>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-80 overflow-y-auto border-4 border-black p-4 bg-white">
                                        {membres.map((m) => (
                                            <label key={m.id} className="flex items-center space-x-3 p-2 hover:bg-slate-100 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={membresSelectionnes.includes(m.id)}
                                                    onChange={() => toggleMembreSelection(m.id)}
                                                    className="w-5 h-5 border-3 border-black"
                                                />
                                                <span className="font-bold uppercase text-sm">
                                                    {m.nom_complet}
                                                    <span className="text-gray-500 text-[10px] ml-2">({m.generation})</span>
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex gap-4 flex-wrap">
                                    <button
                                        type="submit"
                                        className="bg-green-700 text-white px-8 py-4 font-black uppercase border-4 border-black hover:bg-green-800 transition-all"
                                    >
                                        VALIDER LA CRÉATION
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowComiteForm(false);
                                            setComiteNom('');
                                            setComiteType('permanent');
                                            setMembresSelectionnes([]);
                                        }}
                                        className="bg-red-600 text-white px-8 py-4 font-black uppercase border-4 border-black hover:bg-red-700 transition-all"
                                    >
                                        ANNULER
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>

                {/* SECTION LISTE DES COMITÉS EXISTANTS */}
                {comitesExistants.length > 0 && (
                    <div className="mb-10">
                        <h2 className="text-2xl font-black uppercase mb-6 border-b-4 border-black pb-2">📋 Comités Existants</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {comitesExistants.map((comite) => (
                                <div key={comite.id} className="bg-white border-4 border-black p-4 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
                                    <h3 className="font-black uppercase text-lg">{comite.nom}</h3>
                                    <p className="text-xs uppercase mt-1">Type: {comite.type}</p>
                                    <p className="text-[10px] text-gray-500 mt-2">Créé le: {new Date(comite.created_at).toLocaleDateString()}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* SECTION GESTION DES MEMBRES - TABLEAU COMPLET */}
                <div className="bg-white border-4 border-black shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] rounded-none overflow-x-auto">
                    <table className="w-full text-left min-w-[1000px]">
                        <thead className="bg-black text-white uppercase text-[10px] font-black">
                            <tr>
                                <th className="p-4">Utilisateur</th>
                                <th className="p-4">Email</th>
                                <th className="p-4">Génération</th>
                                <th className="p-4">Rôle</th>
                                <th className="p-4">Statut</th>
                                <th className="p-4">Radier</th>
                                <th className="p-4 text-right">Actions ROOT</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y-4 divide-black">
                            {membresFiltres.map((m) => (
                                <tr key={m.id} className="hover:bg-slate-50 font-bold">
                                    <td className="p-4 uppercase text-sm">
                                        {m.nom_complet} <br /> <span className="text-blue-700 text-[10px]">{m.telephone}</span>
                                    </td>
                                    <td className="p-4 text-xs font-mono">{m.email || "—"}</td>
                                    <td className="p-4 text-[10px] uppercase">{m.generation}</td>
                                    <td className="p-4">
                                        <select
                                            value={m.role}
                                            onChange={(e) => updateRole(m.id, e.target.value)}
                                            className="border-2 border-black p-1 text-[10px] font-black bg-white uppercase"
                                        >
                                            <option value="membre">Membre Simple</option>
                                            <option value="tresorier_gen">Trésorier</option>
                                            <option value="adjoint_gen">Adjoint</option>
                                            <option value="chef_gen">Chef Génération</option>
                                            <option value="com_gen">Communication</option>
                                            <option value="baliou_padra">Conseil BP</option>
                                            <option value="super_admin">Super Admin</option>
                                        </select>
                                    </td>
                                    <td className="p-4">
                                        <button
                                            onClick={() => toggleValidation(m.id, m.est_valide)}
                                            className={`px-3 py-1 border-2 border-black text-[9px] font-black uppercase transition-all ${m.est_valide ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}
                                        >
                                            {m.est_valide ? 'ACTIF' : 'BLOQUÉ'}
                                        </button>
                                    </td>
                                    <td className="p-4">
                                        <button
                                            onClick={() => radierMembre(m.id, m.nom_complet)}
                                            className="bg-red-600 text-white border-2 border-black px-4 py-2 rounded-xl font-black text-[10px] uppercase hover:bg-black transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-1"
                                        >
                                            Radier
                                        </button>
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex flex-wrap gap-2 justify-end">
                                            <button
                                                onClick={() => changerEmail(m.id, m.email)}
                                                className="bg-yellow-500 text-black px-2 py-1 rounded text-[9px] font-black uppercase border border-black hover:bg-yellow-600"
                                                title="Changer l'email"
                                            >
                                                📧 Email
                                            </button>
                                            <button
                                                onClick={() => resetPassword(m.id, m.nom_complet)}
                                                className="bg-orange-500 text-white px-2 py-1 rounded text-[9px] font-black uppercase border border-black hover:bg-orange-600"
                                                title="Réinitialiser mot de passe"
                                            >
                                                🔑 Reset MDP
                                            </button>
                                            <button
                                                onClick={() => supprimerCompte(m.id, m.nom_complet)}
                                                className="bg-red-600 text-white px-2 py-1 rounded text-[9px] font-black uppercase border border-black hover:bg-red-700"
                                                title="Supprimer définitivement"
                                            >
                                                🗑️ Supprimer
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* MESSAGE D'INFORMATION */}
                <div className="mt-8 p-4 bg-red-100 border-4 border-red-600 text-center">
                    <p className="font-black text-red-800 text-xs uppercase">⚠️ ZONE ROOT - VOUS AVEZ LE POUVOIR SUPREME SUR TOUS LES COMPTES ET COMITÉS</p>
                </div>
            </div>
        </main>
    );
}