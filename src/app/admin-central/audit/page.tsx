"use client";
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Download, Filter, Edit2, Trash2 } from 'lucide-react';

export default function GestionBDPage() {
    const [membres, setMembres] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterGen, setFilterGen] = useState("");
    const [search, setSearch] = useState("");
    const router = useRouter();

    useEffect(() => {
        const fetchData = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            const { data: profile } = await supabase.from('membres').select('role').eq('user_id', user?.id).maybeSingle();

            if (!['super_admin', 'responsable_bd'].includes(profile?.role)) {
                router.push('/dashboard');
                return;
            }

            const { data } = await supabase.from('membres').select('*').order('created_at', { ascending: false });
            if (data) setMembres(data);
            setLoading(false);
        };
        fetchData();
    }, [router]);

    const exportToCSV = () => {
        if (membres.length === 0) return;

        const headers = ["Nom Civil", "Nom Soninke", "Generation", "Pere", "Mere", "Telephone", "Metier", "Ville"];
        const rows = membres.map(m => [
            m.nom_complet, m.nom_soninke, m.generation, m.pere_nom_civil, m.mere_nom_civil, m.telephone, m.domaine_activite, m.ville_residence
        ]);

        let csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `base_donnees_bp_${new Date().toLocaleDateString()}.csv`);
        document.body.appendChild(link);
        link.click();
    };

    const membresFiltrés = membres.filter(m =>
        (filterGen === "" || m.generation === filterGen) &&
        (m.nom_complet?.toLowerCase().includes(search.toLowerCase()) || m.telephone?.includes(search))
    );

    const generationsUniques = Array.from(new Set(membres.map(m => m.generation))).filter(Boolean);

    if (loading) return <div className="p-20 text-center font-black text-black">CHARGEMENT DE LA BASE...</div>;

    return (
        <main className="min-h-screen bg-white p-4 md:p-10 text-black">
            <div className="max-w-7xl mx-auto">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                    <div>
                        <h1 className="text-3xl font-black uppercase text-purple-900 italic">Gestion & Consolidation BD</h1>
                        <p className="text-xs font-bold text-gray-500">Outil de pilotage Commission Communication & BD</p>
                    </div>
                    <button
                        onClick={exportToCSV}
                        className="flex items-center gap-2 bg-[#146332] text-white px-6 py-3 rounded-xl font-black border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-black transition-all"
                    >
                        <Download size={18} /> EXPORTER EXCEL (CSV)
                    </button>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="relative">
                        <span className="absolute left-4 top-3.5">🔍</span>
                        <input
                            type="text"
                            placeholder="Nom ou Téléphone..."
                            className="w-full p-3 pl-12 border-2 border-black rounded-xl font-bold"
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <select
                        className="p-3 border-2 border-black rounded-xl font-bold bg-white"
                        onChange={(e) => setFilterGen(e.target.value)}
                    >
                        <option value="">Toutes les générations</option>
                        {generationsUniques.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                    <div className="bg-purple-100 border-2 border-purple-900 p-3 rounded-xl flex justify-between items-center px-6">
                        <span className="font-black text-purple-900">TOTAL :</span>
                        <span className="text-2xl font-black">{membresFiltrés.length}</span>
                    </div>
                </div>

                <div className="border-4 border-black rounded-[2rem] overflow-hidden shadow-xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left bg-white">
                            <thead className="bg-black text-white text-[10px] uppercase">
                                <tr>
                                    <th className="p-4">Membre (Civil / Soninké)</th>
                                    <th className="p-4">Génération</th>
                                    <th className="p-4">Filiation (Père / Mère)</th>
                                    <th className="p-4">Contact</th>
                                    <th className="p-4">Pro / Métier</th>
                                    <th className="p-4 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y-2 divide-black text-sm">
                                {membresFiltrés.map(m => (
                                    <tr key={m.id} className="hover:bg-gray-50">
                                        <td className="p-4 font-bold">
                                            {m.nom_complet} <br />
                                            <span className="text-green-700 text-xs">{m.nom_soninke || '-'}</span>
                                        </td>
                                        <td className="p-4 font-black text-xs uppercase">{m.generation}</td>
                                        <td className="p-4 text-xs">
                                            <span className="text-blue-800">P: {m.pere_nom_civil || '-'}</span><br />
                                            <span className="text-pink-800">M: {m.mere_nom_civil || '-'}</span>
                                        </td>
                                        <td className="p-4 font-bold text-blue-600">{m.telephone}</td>
                                        <td className="p-4 text-xs font-bold italic">{m.domaine_activite || 'Non renseigné'}</td>
                                        <td className="p-4">
                                            <div className="flex justify-center gap-2">
                                                <button className="p-2 border-2 border-black rounded-lg hover:bg-yellow-400">
                                                    <Edit2 size={14} />
                                                </button>
                                                <button className="p-2 border-2 border-black rounded-lg hover:bg-red-500 hover:text-white">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </main>
    );
}