"use client";
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function BaliouPadraCentral() {
    const [budgets, setBudgets] = useState<any[]>([]);
    const [versements, setVersements] = useState<any[]>([]);
    const [attente, setAttente] = useState<any[]>([]);
    const [membresValides, setMembresValides] = useState<any[]>([]);
    const [chefsDeGenerations, setChefsDeGenerations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    // État pour fixer un nouveau budget
    const [nomGen, setNomGen] = useState("Génération Wassalah dramane");
    const [montantCible, setMontantCible] = useState("");

    const generations = ["Génération Wassalah dramane", "Génération Dramane konté", "Génération kissima", "Génération maramou basseyabané", "Génération khadja bah baya", "Génération antankhoulé passokhona", "Génération Mamery", "Génération makhadja baliou", "Génération kissima bah", "Génération tchamba", "Diaspora"];

    useEffect(() => {
        chargerTout();
        verifierAcces();
    }, []);

    async function verifierAcces() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            router.push('/login');
            return;
        }

        const { data: p } = await supabase
            .from('membres')
            .select('role')
            .eq('user_id', user.id)
            .maybeSingle();

        if (p?.role !== 'baliou_padra') {
            return <div>Accès interdit : Réservé au Conseil Baliou Padra</div>;
        }
    }

    async function chargerTout() {
        setLoading(true);

        try {
            // 1. Charger les membres non validés
            const { data: a, error: errA } = await supabase
                .from('membres')
                .select('*')
                .eq('est_valide', false)
                .order('id', { ascending: false });

            if (errA) console.error("Erreur chargement membres:", errA);
            setAttente(a || []);

            // 2. Charger les membres validés
            const { data: v, error: errV } = await supabase
                .from('membres')
                .select('*')
                .eq('est_valide', true)
                .order('nom_complet', { ascending: true });

            if (errV) console.error("Erreur chargement membres validés:", errV);
            setMembresValides(v || []);

            // 3. Charger les Chefs de Génération
            const { data: chefs, error: errChefs } = await supabase
                .from('membres')
                .select('nom_complet, generation, telephone, photo_url, kah_tokho, email')
                .eq('role', 'chef_gen')
                .order('generation', { ascending: true });

            if (errChefs) console.error("Erreur chargement chefs:", errChefs);
            setChefsDeGenerations(chefs || []);

            // 4. Charger les budgets
            const { data: b, error: errB } = await supabase
                .from('budgets_annuels')
                .select('*')
                .eq('annee', 2025);

            if (errB) console.error("Erreur chargement budgets:", errB);
            setBudgets(b || []);

            // 5. Charger les versements
            const { data: vers, error: errVers } = await supabase
                .from('versements_centraux')
                .select('*')
                .eq('annee', 2025);

            if (errVers) console.error("Erreur chargement versements:", errVers);
            setVersements(vers || []);

        } catch (error) {
            console.error("Erreur générale:", error);
        } finally {
            setLoading(false);
        }
    }

    async function fixerBudget(e: React.FormEvent) {
        e.preventDefault();
        const { error } = await supabase.from('budgets_annuels').upsert({
            generation_nom: nomGen,
            montant_promis: parseFloat(montantCible),
            annee: 2025
        }, { onConflict: 'generation_nom, annee' });

        if (error) alert(error.message);
        else { alert("Budget enregistré !"); chargerTout(); }
    }

    // Fonction pour valider un versement
    async function validerLeVersement(id: string) {
        const { error } = await supabase
            .from('versements_centraux')
            .update({ statut: 'Validé' })
            .eq('id', id);

        if (error) alert(error.message);
        else {
            alert("Versement validé et ajouté au budget officiel !");
            chargerTout();
        }
    }

    // Fonction pour valider un membre
    async function validerMembre(id: string) {
        const { error } = await supabase
            .from('membres')
            .update({ est_valide: true })
            .eq('id', id);

        if (error) alert(error.message);
        else {
            alert("Membre officiellement validé !");
            chargerTout();
        }
    }

    // Fonction pour nommer un Chef de Génération
    async function nommerChefDeGeneration(id: string, nom: string, generation: string) {
        if (!confirm(`Voulez-vous nommer ${nom} comme Chef de la génération ${generation} ?`)) return;

        const { error } = await supabase
            .from('membres')
            .update({ role: 'chef_gen' })
            .eq('id', id);

        if (error) alert(error.message);
        else {
            alert(`${nom} est maintenant Chef de la génération ${generation}.`);
            chargerTout();
        }
    }

    // Fonction pour nommer un membre comme Trésorier de sa génération
    async function nommerTresorier(id: string, nom: string) {
        if (!confirm(`Voulez-vous nommer ${nom} comme Trésorier de sa génération ?`)) return;

        const { error } = await supabase
            .from('membres')
            .update({ role: 'tresorier_gen' })
            .eq('id', id);

        if (error) alert(error.message);
        else {
            alert(`${nom} est maintenant Trésorier de sa génération.`);
            chargerTout();
        }
    }

    // Fonction pour contacter un Chef (simulation d'appel)
    function contacterChef(telephone: string, nom: string) {
        if (confirm(`Contacter ${nom} au ${telephone} ?`)) {
            window.location.href = `tel:${telephone}`;
        }
    }

    const calculerTotalVerse = (nom: string) => {
        return versements.filter(v => v.generation_nom === nom && v.statut === 'Validé').reduce((acc, curr) => acc + Number(curr.montant_verse), 0);
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center font-black uppercase text-blue-700">Comptabilité Centrale...</div>;

    return (
        <main className="min-h-screen bg-white p-4 md:p-12 text-black">
            <style jsx global>{`
                ::selection {
                    background-color: black !important;
                    color: white !important;
                }
                ::-moz-selection {
                    background-color: black !important;
                    color: white !important;
                }
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
                .animate-pulse {
                    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                }
            `}</style>

            <div className="max-w-6xl mx-auto">
                <header className="mb-12 border-b-8 border-black pb-6">
                    <h1 className="text-5xl font-black text-[#0044ff] uppercase italic tracking-tighter">🏛️ Bureau Central</h1>
                    <p className="font-black text-xl mt-2">SURVEILLANCE DES ENGAGEMENTS {new Date().getFullYear()}</p>
                    <p className="text-sm text-gray-500 mt-1">Pouvoir : Valider les membres, nommer chefs/trésoriers, gérer les budgets centraux</p>
                </header>

                {/* SECTION 1 : VALIDATION DES NOUVEAUX MEMBRES */}
                <section className="mb-16">
                    <h2 className="text-3xl font-black uppercase mb-8 italic border-b-4 border-black pb-2 inline-block text-[#0044ff]">
                        📝 Membres en attente de validation ({attente.length})
                    </h2>
                    <div className="bg-white border-4 border-black rounded-[2.5rem] shadow-2xl overflow-hidden">
                        {attente.length === 0 ? (
                            <div className="text-center py-20 text-gray-400 font-black uppercase">
                                <span className="text-6xl block mb-4">✅</span>
                                Aucune nouvelle inscription à valider
                            </div>
                        ) : (
                            <table className="w-full text-left">
                                <thead className="bg-black text-white text-[10px] font-black uppercase tracking-widest">
                                    <tr>
                                        <th className="p-6">Identité</th>
                                        <th className="p-6">Contact</th>
                                        <th className="p-6">Génération</th>
                                        <th className="p-6 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y-2 divide-black">
                                    {attente.map((m) => (
                                        <tr key={m.id} className="hover:bg-blue-50 transition-all font-bold">
                                            <td className="p-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full border-2 border-black overflow-hidden bg-slate-200">
                                                        {m.photo_url && <img src={m.photo_url} className="w-full h-full object-cover" alt={m.nom_complet} />}
                                                    </div>
                                                    <div>
                                                        <p className="uppercase font-black">{m.nom_complet}</p>
                                                        <p className="text-blue-700 text-xs italic">{m.kah_tokho}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <p className="text-sm font-bold">{m.telephone}</p>
                                                <p className="text-xs text-gray-500">{m.ville_residence}</p>
                                            </td>
                                            <td className="p-6 uppercase text-xs font-black">{m.generation}</td>
                                            <td className="p-6 text-right">
                                                <button
                                                    onClick={() => validerMembre(m.id)}
                                                    className="bg-green-600 text-white border-2 border-black px-6 py-2 rounded-xl font-black text-[10px] uppercase hover:bg-black transition-all active:scale-95"
                                                >
                                                    Valider l'entrée
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </section>

                {/* SECTION 2 : CHEFS DE GÉNÉRATION (SUPERVISION) */}
                <section className="mb-16">
                    <h2 className="text-3xl font-black uppercase mb-8 italic border-b-4 border-black pb-2 inline-block text-[#0044ff]">
                        👑 Chefs de Génération ({chefsDeGenerations.length})
                    </h2>
                    <div className="bg-white border-4 border-black rounded-[2.5rem] shadow-2xl overflow-hidden">
                        {chefsDeGenerations.length === 0 ? (
                            <div className="text-center py-20 text-gray-400 font-black uppercase">
                                <span className="text-6xl block mb-4">👑</span>
                                Aucun Chef de Génération nommé pour le moment
                            </div>
                        ) : (
                            <table className="w-full text-left">
                                <thead className="bg-black text-white text-[10px] font-black uppercase tracking-widest">
                                    <tr>
                                        <th className="p-6">Identité</th>
                                        <th className="p-6">Contact</th>
                                        <th className="p-6">Génération</th>
                                        <th className="p-6 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y-2 divide-black">
                                    {chefsDeGenerations.map((chef) => (
                                        <tr key={chef.generation} className="hover:bg-blue-50 transition-all font-bold">
                                            <td className="p-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full border-2 border-black overflow-hidden bg-slate-200">
                                                        {chef.photo_url && <img src={chef.photo_url} className="w-full h-full object-cover" alt={chef.nom_complet} />}
                                                    </div>
                                                    <div>
                                                        <p className="uppercase font-black">{chef.nom_complet}</p>
                                                        <p className="text-blue-700 text-xs italic">{chef.kah_tokho}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <p className="text-sm font-bold">{chef.telephone}</p>
                                                {chef.email && <p className="text-xs text-gray-500">{chef.email}</p>}
                                            </td>
                                            <td className="p-6">
                                                <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-black border border-purple-300">
                                                    👑 {chef.generation}
                                                </span>
                                            </td>
                                            <td className="p-6 text-right">
                                                <button
                                                    onClick={() => contacterChef(chef.telephone, chef.nom_complet)}
                                                    className="bg-blue-600 text-white border-2 border-black px-4 py-2 rounded-xl font-black text-[10px] uppercase hover:bg-black transition-all active:scale-95"
                                                >
                                                    📞 Contacter
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </section>

                {/* SECTION 3 : MEMBRES VALIDÉS ET GESTION DES RÔLES */}
                <section className="mb-16">
                    <h2 className="text-3xl font-black uppercase mb-8 italic border-b-4 border-black pb-2 inline-block text-[#0044ff]">
                        👥 Gestion des membres ({membresValides.length})
                    </h2>
                    <div className="bg-white border-4 border-black rounded-[2.5rem] shadow-2xl overflow-hidden">
                        {membresValides.length === 0 ? (
                            <div className="text-center py-20 text-gray-400 font-black uppercase">
                                <span className="text-6xl block mb-4">👥</span>
                                Aucun membre validé pour le moment
                            </div>
                        ) : (
                            <table className="w-full text-left">
                                <thead className="bg-black text-white text-[10px] font-black uppercase tracking-widest">
                                    <tr>
                                        <th className="p-6">Identité</th>
                                        <th className="p-6">Contact</th>
                                        <th className="p-6">Génération</th>
                                        <th className="p-6">Rôle actuel</th>
                                        <th className="p-6 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y-2 divide-black">
                                    {membresValides.map((m) => (
                                        <tr key={m.id} className="hover:bg-blue-50 transition-all font-bold">
                                            <td className="p-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full border-2 border-black overflow-hidden bg-slate-200">
                                                        {m.photo_url && <img src={m.photo_url} className="w-full h-full object-cover" alt={m.nom_complet} />}
                                                    </div>
                                                    <div>
                                                        <p className="uppercase font-black">{m.nom_complet}</p>
                                                        <p className="text-blue-700 text-xs italic">{m.kah_tokho}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <p className="text-sm font-bold">{m.telephone}</p>
                                                <p className="text-xs text-gray-500">{m.ville_residence}</p>
                                            </td>
                                            <td className="p-6 uppercase text-xs font-black">{m.generation}</td>
                                            <td className="p-6">
                                                <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${m.role === 'chef_gen'
                                                    ? 'bg-purple-600 text-white border border-purple-400'
                                                    : m.role === 'tresorier_gen'
                                                        ? 'bg-yellow-100 text-yellow-700 border border-yellow-300'
                                                        : 'bg-gray-100 text-gray-600'
                                                    }`}>
                                                    {m.role === 'chef_gen' ? '👑 Chef' : m.role === 'tresorier_gen' ? '💰 Trésorier' : (m.role || 'Membre')}
                                                </span>
                                            </td>
                                            <td className="p-6 text-right">
                                                <div className="flex flex-wrap gap-2 justify-end">
                                                    {m.role !== 'chef_gen' && (
                                                        <button
                                                            onClick={() => nommerChefDeGeneration(m.id, m.nom_complet, m.generation)}
                                                            className="bg-purple-600 text-white border-2 border-black px-3 py-2 rounded-xl font-black text-[9px] uppercase hover:bg-purple-700 transition-all active:scale-95"
                                                        >
                                                            Nommer Chef
                                                        </button>
                                                    )}
                                                    {m.role !== 'tresorier_gen' && m.role !== 'chef_gen' && (
                                                        <button
                                                            onClick={() => nommerTresorier(m.id, m.nom_complet)}
                                                            className="bg-yellow-400 text-black border-2 border-black px-3 py-2 rounded-xl font-black text-[9px] uppercase hover:bg-yellow-500 transition-all active:scale-95"
                                                        >
                                                            Nommer Trésorier
                                                        </button>
                                                    )}
                                                    {m.role === 'chef_gen' && (
                                                        <span className="text-purple-600 font-black text-xs uppercase bg-purple-50 px-3 py-2 rounded-xl border border-purple-300">
                                                            ✓ Chef nommé
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </section>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">

                    {/* FORMULAIRE POUR FIXER LES OBJECTIFS */}
                    <div className="lg:col-span-1 border-4 border-black p-8 rounded-[2.5rem] bg-blue-50 shadow-2xl">
                        <h2 className="text-xl font-black uppercase mb-6 border-b-2 border-black pb-2 italic">🎯 Fixer un Objectif</h2>
                        <form onSubmit={fixerBudget} className="space-y-4">
                            <label className="text-[10px] font-black uppercase">Génération</label>
                            <select value={nomGen} onChange={(e) => setNomGen(e.target.value)} className="w-full p-4 border-2 border-black rounded-2xl font-black bg-white appearance-none">
                                {generations.map(g => <option key={g} value={g}>{g}</option>)}
                            </select>
                            <label className="text-[10px] font-black uppercase">Montant Annuel Promis (CFA)</label>
                            <input type="number" value={montantCible} onChange={(e) => setMontantCible(e.target.value)} placeholder="Ex: 2000000" className="w-full p-4 border-2 border-black rounded-2xl font-black" required />
                            <button type="submit" className="w-full py-4 bg-black text-white font-black rounded-2xl border-2 border-black hover:bg-[#0044ff] transition-all uppercase">Enregistrer l'Engagement</button>
                        </form>
                    </div>

                    {/* VUE D'ENSEMBLE DES PROGRESSIONS */}
                    <div className="lg:col-span-2 space-y-8">
                        {budgets.length === 0 && <p className="text-center font-black text-gray-300 py-20 uppercase italic">Aucun budget fixé pour le moment</p>}
                        {budgets.map((b) => {
                            const verse = calculerTotalVerse(b.generation_nom);
                            const pourcent = Math.min(Math.round((verse / b.montant_promis) * 100), 100);
                            return (
                                <div key={b.id} className="border-4 border-black p-6 rounded-[2.5rem] bg-white shadow-xl">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="font-black text-xl uppercase text-[#0044ff]">{b.generation_nom}</h3>
                                        <span className="font-black text-sm bg-black text-white px-4 py-1 rounded-full">{pourcent}% atteint</span>
                                    </div>
                                    <div className="w-full h-10 bg-slate-100 border-4 border-black rounded-full overflow-hidden flex">
                                        <div style={{ width: `${pourcent}%` }} className="h-full bg-green-500 border-r-4 border-black transition-all duration-1000"></div>
                                    </div>
                                    <div className="flex justify-between mt-4">
                                        <div>
                                            <p className="text-[10px] font-black uppercase text-gray-400">Objectif Annuel</p>
                                            <p className="font-black text-lg">{Number(b.montant_promis).toLocaleString()} CFA</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-black uppercase text-gray-400">Total déjà versé</p>
                                            <p className="font-black text-lg text-green-700">{verse.toLocaleString()} CFA</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* SECTION VERSEMENTS RÉCENTS À VALIDER */}
                <section className="mt-16">
                    <h2 className="text-3xl font-black uppercase mb-8 italic border-b-4 border-black pb-2 inline-block text-[#0044ff]">💰 Versements récents au Centre</h2>
                    <div className="bg-white border-4 border-black rounded-[2.5rem] overflow-hidden shadow-2xl">
                        {versements.length === 0 ? (
                            <div className="text-center py-20 text-gray-400 font-black uppercase">
                                Aucun versement reçu pour le moment
                            </div>
                        ) : (
                            <table className="w-full text-left">
                                <thead className="bg-black text-white text-[10px] font-black uppercase tracking-widest">
                                    <tr>
                                        <th className="p-6">Génération</th>
                                        <th className="p-6">Montant</th>
                                        <th className="p-6">Date d'envoi</th>
                                        <th className="p-6">Statut</th>
                                        <th className="p-6 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y-2 divide-black">
                                    {versements.map((v) => (
                                        <tr key={v.id} className="hover:bg-blue-50 transition-all font-bold">
                                            <td className="p-6 uppercase">{v.generation_nom}</td>
                                            <td className="p-6 text-xl font-black text-green-700">{Number(v.montant_verse).toLocaleString()} CFA</td>
                                            <td className="p-6 text-sm">
                                                {v.date_versement ? new Date(v.date_versement).toLocaleDateString('fr-FR') : 'Date inconnue'}
                                            </td>
                                            <td className="p-6 text-xs uppercase">
                                                <span className={v.statut === 'Validé' ? 'text-green-600 font-black' : 'text-orange-500 font-black animate-pulse'}>
                                                    ● {v.statut || 'En attente'}
                                                </span>
                                            </td>
                                            <td className="p-6 text-right">
                                                {(!v.statut || v.statut === 'En attente') && (
                                                    <button
                                                        onClick={() => validerLeVersement(v.id)}
                                                        className="bg-green-600 text-white border-2 border-black px-6 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-black transition-all active:scale-95"
                                                    >
                                                        Valider Réception
                                                    </button>
                                                )}
                                                {v.statut === 'Validé' && (
                                                    <span className="text-green-600 font-black text-xs uppercase bg-green-100 px-4 py-2 rounded-xl">
                                                        ✓ Validé
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* RÉCAPITULATIF DES VERSEMENTS */}
                    <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-blue-700 text-white p-6 rounded-[2rem] border-4 border-black">
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Total des versements en attente</p>
                            <p className="text-3xl font-black mt-2">
                                {versements.filter(v => v.statut !== 'Validé').reduce((acc, curr) => acc + Number(curr.montant_verse), 0).toLocaleString()} CFA
                            </p>
                        </div>
                        <div className="bg-green-700 text-white p-6 rounded-[2rem] border-4 border-black">
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Total des versements validés</p>
                            <p className="text-3xl font-black mt-2">
                                {versements.filter(v => v.statut === 'Validé').reduce((acc, curr) => acc + Number(curr.montant_verse), 0).toLocaleString()} CFA
                            </p>
                        </div>
                    </div>
                </section>

                {/* MESSAGE D'INFORMATION */}
                <div className="mt-8 p-4 bg-blue-100 border-4 border-blue-600 text-center">
                    <p className="font-black text-blue-800 text-xs uppercase">🏛️ BUREAU CENTRAL - GESTION DES GÉNÉRATIONS ET BUDGETS</p>
                </div>
            </div>
        </main>
    );
}