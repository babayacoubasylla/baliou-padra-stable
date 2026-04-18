"use client";
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function GenerationPage() {
    const [monProfil, setMonProfil] = useState<any>(null);
    const [membresGen, setMembresGen] = useState<any[]>([]);
    const [chargement, setChargement] = useState(true);
    const [engagement, setEngagement] = useState<any>(null);
    const [totalDejaReversé, setTotalDejaReversé] = useState(0);
    const [totalCollecteInterne, setTotalCollecteInterne] = useState(0);
    const [showTransferForm, setShowTransferForm] = useState(false);
    const [montantTransfert, setMontantTransfert] = useState("");
    const [showPaiementModal, setShowPaiementModal] = useState(false);
    const [paiementData, setPaiementData] = useState({ membreId: '', nom: '', type: 'Sibity Mensuelle', montant: '' });
    const router = useRouter();

    const typesCotisation = [
        { value: 'Sibity Mensuelle', label: '💰 Sibity Mensuelle', default: 5000 },
        { value: 'Cotisation Mensuelle', label: '📋 Cotisation Mensuelle', default: 2000 },
        { value: 'Extraordinaire', label: '⭐ Cotisation Extraordinaire', default: 10000 }
    ];

    useEffect(() => {
        chargerDonnees();
    }, []);

    async function chargerDonnees() {
        setChargement(true);
        // 1. Qui suis-je ?
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/login'); return; }

        const { data: p } = await supabase.from('membres').select('*').eq('user_id', user.id).maybeSingle();

        if (!p) {
            setChargement(false);
            return;
        }

        // Vérification d'accès : seulement chef_gen, tresorier_gen, adjoint_gen ou baliou_padra
        if (!['chef_gen', 'tresorier_gen', 'adjoint_gen', 'baliou_padra'].includes(p?.role)) {
            setChargement(false);
            return;
        }

        if (p) {
            setMonProfil(p);

            // 2. Charger uniquement les membres de MA génération
            const { data: m } = await supabase
                .from('membres')
                .select('*')
                .eq('generation', p.generation)
                .order('nom_complet');
            setMembresGen(m || []);

            // 3. Récupérer l'engagement budgétaire de la génération
            const { data: eng } = await supabase
                .from('budgets_annuels')
                .select('montant_promis')
                .eq('generation_nom', p.generation)
                .eq('annee', 2025)
                .maybeSingle();
            setEngagement(eng);

            // 4. Récupérer les versements déjà effectués au centre
            const { data: rev } = await supabase
                .from('versements_centraux')
                .select('montant_verse')
                .eq('generation_nom', p.generation)
                .eq('annee', 2025);
            const total = rev?.reduce((acc, curr) => acc + Number(curr.montant_verse), 0) || 0;
            setTotalDejaReversé(total);

            // 5. Calculer la caisse interne (total des cotisations des membres de la génération)
            const { data: cotisationsGen } = await supabase
                .from('cotisations')
                .select('montant')
                .in('membre_id', (m || []).map(membre => membre.id));

            const totalInterne = cotisationsGen?.reduce((acc, curr) => acc + Number(curr.montant), 0) || 0;
            setTotalCollecteInterne(totalInterne);
        }
        setChargement(false);
    }

    // Ouvrir le modal de paiement
    function ouvrirPaiement(membreId: string, nom: string) {
        setPaiementData({ membreId, nom, type: 'Sibity Mensuelle', montant: '5000' });
        setShowPaiementModal(true);
    }

    // Enregistrer un paiement avec le type sélectionné
    async function enregistrerPaiement(e: React.FormEvent) {
        e.preventDefault();

        const { error } = await supabase.from('cotisations').insert([{
            membre_id: paiementData.membreId,
            montant: parseFloat(paiementData.montant),
            type_cotisation: paiementData.type,
            mois: new Intl.DateTimeFormat('fr-FR', { month: 'long' }).format(new Date()),
            annee: 2025
        }]);

        if (error) {
            alert("Erreur : " + error.message);
        } else {
            alert(`Paiement ${paiementData.type} de ${parseFloat(paiementData.montant).toLocaleString()} CFA enregistré avec succès !`);
            setShowPaiementModal(false);
            chargerDonnees(); // Rafraîchir les données
        }
    }

    // Fonction pour effectuer un transfert au centre via le modal
    async function effectuerTransfert(e: React.FormEvent) {
        e.preventDefault();
        const { data: { user } } = await supabase.auth.getUser();

        const { error } = await supabase.from('versements_centraux').insert([{
            generation_nom: monProfil.generation,
            montant_verse: parseFloat(montantTransfert),
            annee: 2025,
            envoye_par_id: user?.id,
            statut: 'En attente',
            date_versement: new Date().toISOString()
        }]);

        if (error) {
            alert("Erreur : " + error.message);
        } else {
            alert("Transfert enregistré ! En attente de validation par Baliou Padra.");
            setShowTransferForm(false);
            setMontantTransfert("");
            chargerDonnees();
        }
    }

    // 🆕 DESIGNER UN MEMBRE DE L'ÉQUIPE DE GESTION (Trésorier, Adjoint, Communication)
    async function designerEquipe(id: string, roleEquipe: string, nom: string) {
        if (monProfil.role !== 'chef_gen' && monProfil.role !== 'baliou_padra') {
            alert("Seul le Chef de Génération peut désigner son équipe.");
            return;
        }

        let roleNom = "";
        if (roleEquipe === 'tresorier_gen') roleNom = "Trésorier";
        else if (roleEquipe === 'adjoint_gen') roleNom = "Adjoint";
        else if (roleEquipe === 'com_gen') roleNom = "Responsable Communication";

        if (!confirm(`Voulez-vous nommer ${nom} comme ${roleNom} de la génération ?`)) return;

        const { error } = await supabase.from('membres').update({ role: roleEquipe }).eq('id', id);

        if (error) {
            alert(error.message);
        } else {
            alert(`${nom} est maintenant ${roleNom} de la génération.`);
            chargerDonnees();
        }
    }

    // Fonction pour changer le rôle d'un membre (version legacy conservée)
    async function changerRole(id: string, nouveauRole: string, nom: string) {
        if (monProfil.role !== 'chef_gen' && monProfil.role !== 'baliou_padra') {
            alert("Seul le Chef de Génération peut déléguer ces pouvoirs.");
            return;
        }

        const roleNom = nouveauRole === 'tresorier_gen' ? 'Trésorier' : 'Adjoint';
        if (!confirm(`Voulez-vous nommer ${nom} comme ${roleNom} de la génération ?`)) return;

        const { error } = await supabase.from('membres').update({ role: nouveauRole }).eq('id', id);

        if (error) {
            alert(error.message);
        } else {
            alert(`${nom} est maintenant ${roleNom} de la génération.`);
            chargerDonnees();
        }
    }

    // Fonction pour valider un membre (Chef de Génération uniquement)
    async function validerMembre(id: string, nom: string) {
        if (monProfil.role !== 'chef_gen' && monProfil.role !== 'baliou_padra') {
            alert("Seul le Chef de Génération peut valider les nouveaux membres.");
            return;
        }

        const { error } = await supabase.from('membres').update({ est_valide: true }).eq('id', id);

        if (error) {
            alert(error.message);
        } else {
            alert(`${nom} a été validé dans la génération.`);
            chargerDonnees();
        }
    }

    // Vérification d'accès avant le rendu
    if (chargement) return <div className="min-h-screen bg-white flex items-center justify-center font-black">CHARGEMENT DE LA GÉNÉRATION...</div>;

    if (!monProfil || !['chef_gen', 'tresorier_gen', 'adjoint_gen', 'baliou_padra'].includes(monProfil?.role)) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center p-8">
                <div className="text-center max-w-md mx-auto bg-red-50 border-4 border-red-600 p-10 rounded-[2.5rem] shadow-2xl">
                    <div className="text-6xl mb-6">⛔</div>
                    <h1 className="text-2xl font-black text-red-800 uppercase mb-4">Accès interdit</h1>
                    <p className="text-gray-700 font-bold text-lg mb-2">Réservé aux responsables de génération</p>
                    <p className="text-gray-500 text-sm mt-4">Cette page est accessible uniquement aux Chefs de Génération, Trésoriers, Adjoints et au Bureau Central.</p>
                    <button
                        onClick={() => router.push('/profil')}
                        className="mt-6 bg-black text-white px-6 py-3 rounded-xl font-black text-sm uppercase hover:bg-red-700 transition-all"
                    >
                        Retour à Mon Profil
                    </button>
                </div>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-slate-50 p-4 md:p-12 text-black">
            <style jsx global>{`
                ::selection {
                    background-color: black !important;
                    color: white !important;
                }
                ::-moz-selection {
                    background-color: black !important;
                    color: white !important;
                }
                @keyframes focys-scroll {
                    0% { transform: translateX(100%); }
                    100% { transform: translateX(-100%); }
                }
                .animate-focys-scroll {
                    animation: focys-scroll 20s linear infinite;
                    white-space: nowrap;
                }
                @keyframes modalFadeIn {
                    from { opacity: 0; transform: scale(0.9); }
                    to { opacity: 1; transform: scale(1); }
                }
                .modal-animation {
                    animation: modalFadeIn 0.3s ease-out;
                }
            `}</style>

            <div className="max-w-6xl mx-auto">

                <header className="mb-12 border-b-4 border-black pb-6 flex justify-between items-end flex-wrap gap-4">
                    <div>
                        <h1 className="text-4xl font-black text-blue-700 uppercase italic tracking-tighter">🏠 Ma Génération</h1>
                        <p className="font-black text-xl mt-2 uppercase">{monProfil?.generation}</p>
                        {monProfil?.role === 'chef_gen' && (
                            <p className="text-green-600 text-sm font-black mt-2">👑 Vous êtes le Chef de Génération</p>
                        )}
                        {monProfil?.role === 'tresorier_gen' && (
                            <p className="text-yellow-600 text-sm font-black mt-2">💰 Vous êtes le Trésorier de Génération</p>
                        )}
                        {monProfil?.role === 'adjoint_gen' && (
                            <p className="text-blue-600 text-sm font-black mt-2">⭐ Vous êtes l'Adjoint de Génération</p>
                        )}
                        {monProfil?.role === 'baliou_padra' && (
                            <p className="text-purple-600 text-sm font-black mt-2">🏛️ Vous êtes membre du Bureau Central</p>
                        )}
                    </div>
                    <div className="bg-black text-white px-6 py-2 rounded-full font-black text-xs uppercase tracking-widest">
                        Trésorerie Active
                    </div>
                </header>

                {/* CARTES BUDGET ET CAISSE */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                    <div className="bg-[#0044ff] text-white p-8 rounded-[2.5rem] border-4 border-black shadow-2xl transition-transform hover:scale-105">
                        <p className="font-black uppercase text-[10px] tracking-widest mb-2 opacity-80">🎯 Notre engagement annuel</p>
                        <h2 className="text-4xl font-black tracking-tighter">
                            {engagement?.montant_promis ? Number(engagement.montant_promis).toLocaleString() : "---"} CFA
                        </h2>
                        <p className="text-xs mt-4 font-bold">
                            Versé au centre : {totalDejaReversé.toLocaleString()} CFA
                        </p>
                        <div className="mt-4 pt-4 border-t-2 border-blue-400">
                            <p className="text-xs font-bold opacity-80">Reste à verser :</p>
                            <p className="text-2xl font-black text-green-300">
                                {engagement ? (Number(engagement.montant_promis) - totalDejaReversé).toLocaleString() : "---"} CFA
                            </p>
                        </div>
                    </div>

                    <div className="bg-white text-black p-8 rounded-[2.5rem] border-4 border-black shadow-2xl transition-transform hover:scale-105">
                        <p className="font-black uppercase text-[10px] tracking-widest mb-2 text-gray-400">💰 Caisse interne de la génération</p>
                        <h2 className="text-4xl font-black tracking-tighter text-green-700">
                            {totalCollecteInterne.toLocaleString()} CFA
                        </h2>
                        <p className="text-xs mt-4 text-gray-500 font-bold">
                            Total des cotisations des membres
                        </p>
                        {(monProfil?.role === 'tresorier_gen' || monProfil?.role === 'chef_gen' || monProfil?.role === 'baliou_padra') && (
                            <button
                                onClick={() => setShowTransferForm(true)}
                                className="mt-4 bg-black text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase border-2 border-black hover:bg-[#0044ff] hover:border-[#0044ff] transition-all active:scale-95"
                            >
                                💸 Effectuer un versement au Centre
                            </button>
                        )}
                    </div>
                </div>

                {/* LISTE DES MEMBRES */}
                <div className="bg-white border-4 border-black rounded-[2.5rem] shadow-2xl overflow-x-auto">
                    <table className="w-full text-left min-w-[800px]">
                        <thead className="bg-slate-100 border-b-4 border-black">
                            <tr>
                                <th className="p-6 font-black uppercase text-sm">Membre</th>
                                <th className="p-6 font-black uppercase text-sm">Kah Tôkhô</th>
                                <th className="p-6 font-black uppercase text-sm">Rôle</th>
                                <th className="p-6 font-black uppercase text-sm">Statut</th>
                                <th className="p-6 font-black uppercase text-sm text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y-2 divide-slate-100">
                            {membresGen.map((m) => (
                                <tr key={m.id} className="hover:bg-blue-50 transition-colors">
                                    <td className="p-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full border-2 border-black overflow-hidden bg-slate-200">
                                                {m.photo_url && <img src={m.photo_url} className="w-full h-full object-cover" alt={m.nom_complet} />}
                                            </div>
                                            <span className="font-bold uppercase">{m.nom_complet}</span>
                                        </div>
                                    </td>
                                    <td className="p-6 font-black text-blue-700 uppercase italic">{m.kah_tokho}</td>
                                    <td className="p-6">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black border border-black uppercase ${m.role === 'chef_gen'
                                            ? 'bg-purple-600 text-white'
                                            : m.role === 'tresorier_gen'
                                                ? 'bg-yellow-400 text-black'
                                                : m.role === 'adjoint_gen'
                                                    ? 'bg-blue-400 text-white'
                                                    : m.role === 'com_gen'
                                                        ? 'bg-pink-500 text-white'
                                                        : 'bg-gray-100 text-gray-600'
                                            }`}>
                                            {m.role === 'chef_gen' ? '👑 Chef' :
                                                m.role === 'tresorier_gen' ? '💰 Trésorier' :
                                                    m.role === 'adjoint_gen' ? '⭐ Adjoint' :
                                                        m.role === 'com_gen' ? '📢 Communication' :
                                                            '📋 Membre'}
                                        </span>
                                    </td>
                                    <td className="p-6">
                                        {m.est_valide ? (
                                            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-black">✓ Validé</span>
                                        ) : (
                                            <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-black">⏳ En attente</span>
                                        )}
                                    </td>
                                    <td className="p-6 text-right">
                                        <div className="flex flex-wrap gap-2 justify-end">
                                            {/* BOUTON ENCAISSER - Visible pour tous */}
                                            <button
                                                onClick={() => ouvrirPaiement(m.id, m.nom_complet)}
                                                className="bg-green-600 text-white px-4 py-2 rounded-xl font-black text-[10px] border-2 border-black hover:bg-black transition-all active:scale-95"
                                            >
                                                💰 Encaisser
                                            </button>

                                            {/* BOUTONS DE GESTION D'ÉQUIPE - Uniquement pour le Chef de Génération ou Bureau Central */}
                                            {(monProfil?.role === 'chef_gen' || monProfil?.role === 'baliou_padra') && (
                                                <>
                                                    {!m.est_valide && (
                                                        <button
                                                            onClick={() => validerMembre(m.id, m.nom_complet)}
                                                            className="bg-blue-600 text-white px-3 py-2 rounded-xl font-black text-[9px] border-2 border-black hover:bg-black transition-all"
                                                        >
                                                            ✅ Valider
                                                        </button>
                                                    )}
                                                    {/* SELECTEUR DE RÔLE POUR L'ÉQUIPE DE GESTION */}
                                                    <select
                                                        value=""
                                                        onChange={(e) => {
                                                            if (e.target.value) {
                                                                designerEquipe(m.id, e.target.value, m.nom_complet);
                                                                e.target.value = "";
                                                            }
                                                        }}
                                                        className="border-2 border-black p-2 text-[9px] font-black uppercase bg-white rounded-xl hover:bg-slate-50 transition-all cursor-pointer"
                                                    >
                                                        <option value="">🔧 Désigner</option>
                                                        <option value="tresorier_gen">💰 Nommer Trésorier</option>
                                                        <option value="adjoint_gen">⭐ Nommer Adjoint</option>
                                                        <option value="com_gen">📢 Nommer Communication</option>
                                                    </select>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {membresGen.length === 0 && (
                        <div className="text-center py-20 text-gray-400 font-black uppercase">
                            Aucun membre dans cette génération
                        </div>
                    )}
                </div>

                {/* BANDEAU SPIRITUEL */}
                <div className="mt-16 bg-blue-700 py-6 rounded-[2.5rem] border-4 border-black overflow-hidden relative shadow-xl">
                    <div className="animate-focys-scroll">
                        <span className="text-white font-black text-xl tracking-[0.2em] uppercase px-4 inline-block italic">
                            ALLAH KANE — GNAMARIYE BATIYE — KABEHI TOKHË. BAH NAWARY — ALLAH KANE — GNAMARIYE BATIYE — KABEHI TOKHË. BAH NAWARY
                        </span>
                    </div>
                </div>
            </div>

            {/* MODAL DE PAIEMENT AVEC 3 TYPES DE COTISATIONS */}
            {showPaiementModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white border-4 border-black rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl modal-animation">
                        <h2 className="text-2xl font-black uppercase mb-6 text-[#0044ff] italic">
                            💰 Encaisser pour {paiementData.nom}
                        </h2>
                        <form onSubmit={enregistrerPaiement} className="space-y-4">
                            <div>
                                <label className="block text-xs font-black uppercase mb-2 text-gray-600">Type de cotisation</label>
                                <select
                                    className="w-full p-4 border-2 border-black rounded-2xl font-black outline-none focus:border-[#0044ff] transition-all bg-black text-white"
                                    value={paiementData.type}
                                    onChange={(e) => {
                                        const type = e.target.value;
                                        const defaultMontant = typesCotisation.find(t => t.value === type)?.default || 5000;
                                        setPaiementData({ ...paiementData, type, montant: defaultMontant.toString() });
                                    }}
                                >
                                    {typesCotisation.map(t => (
                                        <option key={t.value} value={t.value}>{t.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-black uppercase mb-2 text-gray-600">Montant (FCFA)</label>
                                <input
                                    type="number"
                                    required
                                    className="w-full p-4 border-2 border-black rounded-2xl font-black text-xl outline-none focus:border-[#0044ff] transition-all bg-black text-white"
                                    value={paiementData.montant}
                                    onChange={(e) => setPaiementData({ ...paiementData, montant: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowPaiementModal(false)}
                                    className="py-4 border-2 border-black rounded-2xl font-black uppercase text-xs hover:bg-gray-100 transition-all"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    className="py-4 bg-green-600 text-white border-2 border-black rounded-2xl font-black uppercase text-xs shadow-lg hover:bg-black transition-all active:scale-95"
                                >
                                    Confirmer l'encaissement
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL DE TRANSFERT AU CENTRE */}
            {showTransferForm && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white border-4 border-black rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl modal-animation">
                        <h2 className="text-2xl font-black uppercase mb-6 text-[#0044ff] italic">💸 Verser à Baliou Padra</h2>
                        <form onSubmit={effectuerTransfert} className="space-y-4">
                            <p className="text-sm font-bold text-gray-600 mb-4">
                                Indiquez le montant que vous reversez au bureau central pour le budget 2025.
                            </p>
                            <div className="bg-slate-50 p-4 rounded-2xl border-2 border-gray-200">
                                <p className="text-xs font-black text-gray-400 uppercase mb-2">Disponible en caisse</p>
                                <p className="text-2xl font-black text-green-700">{totalCollecteInterne.toLocaleString()} CFA</p>
                            </div>
                            <input
                                type="number"
                                required
                                placeholder="Montant en CFA"
                                className="w-full p-4 border-2 border-black rounded-2xl font-black text-xl outline-none focus:border-[#0044ff] transition-all bg-black text-white"
                                value={montantTransfert}
                                onChange={(e) => setMontantTransfert(e.target.value)}
                            />
                            <div className="grid grid-cols-2 gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowTransferForm(false)}
                                    className="py-4 border-2 border-black rounded-2xl font-black uppercase text-xs hover:bg-gray-100 transition-all"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    className="py-4 bg-[#0044ff] text-white border-2 border-black rounded-2xl font-black uppercase text-xs shadow-lg hover:bg-black transition-all active:scale-95"
                                >
                                    Confirmer l'envoi
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </main>
    );
}