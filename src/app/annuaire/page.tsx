"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function DashboardRH() {
    const [membres, setMembres] = useState<any[]>([]);
    const [recherche, setRecherche] = useState("");
    const [chargement, setChargement] = useState(true);
    const [stats, setStats] = useState({ recherche: 0, projets: 0, total: 0, actifs: 0 });
    const router = useRouter();

    useEffect(() => {
        const verifierEtCharger = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return router.push('/login');

            const { data: p } = await supabase.from('membres').select('role').eq('user_id', user.id).maybeSingle();

            // VERROU : Si pas Admin, pas Baliou Padra, pas RH -> Dehors !
            if (!['super_admin', 'baliou_padra', 'agent_rh'].includes(p?.role)) {
                alert("Accès confidentiel : Seul le Comité Emploi et le Conseil peuvent consulter l'annuaire.");
                router.push('/profil');
                return;
            }

            // On charge tout sauf les comptes techniques (super_admin, agent_civil, agent_rh)
            const { data } = await supabase
                .from('membres')
                .select('*')
                .neq('role', 'super_admin')   // <--- CACHE LE SUPER ADMIN
                .neq('role', 'agent_civil')   // <--- CACHE LES AGENTS ÉTAT CIVIL
                .neq('role', 'agent_rh')      // <--- CACHE LES RH
                .order('nom_complet', { ascending: true });

            if (data) {
                setMembres(data);
                setStats({
                    recherche: data.filter(m => m.situation_emploi === "En quête d'emploi").length,
                    projets: data.filter(m => m.situation_emploi === "Porteur de projet").length,
                    actifs: data.filter(m => m.situation_emploi === "En emploi").length,
                    total: data.length
                });
            }
            setChargement(false);
        };
        verifierEtCharger();
    }, [router]);

    // Filtrer la liste en fonction de la recherche (Nom, Métier, Situation)
    const membresFiltrés = membres.filter(m =>
        m.nom_complet?.toLowerCase().includes(recherche.toLowerCase()) ||
        m.kah_tokho?.toLowerCase().includes(recherche.toLowerCase()) ||
        m.metier?.toLowerCase().includes(recherche.toLowerCase()) ||
        m.situation_emploi?.toLowerCase().includes(recherche.toLowerCase())
    );

    if (chargement) return (
        <div className="min-h-screen bg-white flex items-center justify-center font-black">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-green-700 mr-4"></div>
            CHARGEMENT DES DONNÉES...
        </div>
    );

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
            `}</style>

            {/* HEADER */}
            <header className="mb-10 border-b-8 border-black pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black text-blue-700 uppercase italic">Gestion Emploi & Stats</h1>
                    <p className="font-bold text-xs uppercase">Comité RH - Supervision Baliou Padra</p>
                </div>

                {/* Barre de recherche */}
                <div className="relative max-w-md w-full">
                    <input
                        type="text"
                        placeholder="Rechercher un membre, un métier, une situation..."
                        className="w-full px-6 py-3 rounded-2xl border-2 border-black shadow-sm focus:border-blue-600 outline-none transition-all pl-12"
                        onChange={(e) => setRecherche(e.target.value)}
                    />
                    <span className="absolute left-4 top-3.5 text-xl">🔍</span>
                </div>
            </header>

            {/* CARTES STATISTIQUES */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                <div className="border-4 border-black p-6 bg-red-50 rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                    <p className="font-black uppercase text-xs">En quête d'emploi</p>
                    <p className="text-5xl font-black mt-2">{stats.recherche}</p>
                </div>
                <div className="border-4 border-black p-6 bg-yellow-50 rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                    <p className="font-black uppercase text-xs">Porteurs de projet</p>
                    <p className="text-5xl font-black mt-2">{stats.projets}</p>
                </div>
                <div className="border-4 border-black p-6 bg-green-50 rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                    <p className="font-black uppercase text-xs">En emploi</p>
                    <p className="text-5xl font-black mt-2">{stats.actifs}</p>
                </div>
                <div className="border-4 border-black p-6 bg-blue-50 rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                    <p className="font-black uppercase text-xs">Total Membres</p>
                    <p className="text-5xl font-black mt-2">{stats.total}</p>
                </div>
            </div>

            {/* LISTE DÉTAILLÉE POUR ACTION RH */}
            <div className="border-4 border-black rounded-[2.5rem] overflow-hidden bg-white shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-black text-white uppercase text-[10px] font-black">
                            <tr>
                                <th className="p-6">Membre</th>
                                <th className="p-6">Situation</th>
                                <th className="p-6">Métier / Diplôme</th>
                                <th className="p-6">Contact</th>
                                <th className="p-6 text-right">Ville</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y-2 divide-black">
                            {membresFiltrés.map(m => (
                                <tr key={m.id} className="font-bold hover:bg-slate-50 transition-colors">
                                    <td className="p-6">
                                        {m.nom_complet}
                                        <br />
                                        <span className="text-blue-600 text-[10px] italic">{m.kah_tokho}</span>
                                    </td>
                                    <td className="p-6">
                                        <span className={`inline-block px-3 py-1 rounded-full text-[9px] border border-black uppercase font-black ${m.situation_emploi === "En quête d'emploi" ? "bg-red-100 text-red-700" :
                                                m.situation_emploi === "Porteur de projet" ? "bg-yellow-100 text-yellow-700" :
                                                    m.situation_emploi === "En emploi" ? "bg-green-100 text-green-700" :
                                                        "bg-gray-100 text-gray-700"
                                            }`}>
                                            {m.situation_emploi || "Non renseigné"}
                                        </span>
                                    </td>
                                    <td className="p-6 text-xs">
                                        {m.metier || "Non renseigné"}
                                        <br />
                                        <span className="opacity-50 text-[9px]">{m.diplome || "Pas de diplôme"}</span>
                                    </td>
                                    <td className="p-6 font-black text-green-700 text-sm">
                                        {m.telephone || "Non renseigné"}
                                    </td>
                                    <td className="p-6 text-right text-xs">
                                        📍 {m.ville_residence || "Non renseignée"}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* SI AUCUN RÉSULTAT */}
            {!chargement && membresFiltrés.length === 0 && (
                <div className="text-center py-20 bg-white rounded-[3rem] shadow-inner border-4 border-dashed border-gray-300 mt-8">
                    <span className="text-6xl block mb-4">🔍</span>
                    <p className="text-xl font-bold text-gray-400">Aucun membre trouvé pour cette recherche.</p>
                </div>
            )}
        </main>
    );
}