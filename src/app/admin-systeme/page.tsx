"use client";
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function AdminSystemePage() {
    const [membres, setMembres] = useState<any[]>([]);
    const [chargement, setChargement] = useState(true);
    const [recherche, setRecherche] = useState("");
    const router = useRouter();

    useEffect(() => {
        const boot = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return router.push('/login');
            
            const { data: p } = await supabase.from('membres').select('role').eq('user_id', user.id).maybeSingle();
            if (p?.role !== 'super_admin') return router.push('/dashboard');
            
            chargerMembres();
        };
        boot();
    }, [router]);

    async function chargerMembres() {
        setChargement(true);
        const { data } = await supabase.from('membres').select('*').order('nom_complet');
        setMembres(data || []);
        setChargement(false);
    }

    async function updateRole(id: string, role: string) {
        const { error } = await supabase.from('membres').update({ role }).eq('id', id);
        if (error) alert(error.message); else chargerMembres();
    }

    async function toggleValidation(id: string, currentStatus: boolean) {
        const { error } = await supabase.from('membres').update({ est_valide: !currentStatus }).eq('id', id);
        if (error) alert(error.message); else chargerMembres();
    }

    async function radierMembre(id: string, nom: string) {
        if (window.confirm(`RADIER DÉFINITIVEMENT ${nom} ?`)) {
            const { error } = await supabase.from('membres').delete().eq('id', id);
            if (error) alert(error.message); else chargerMembres();
        }
    }

    const filtrés = membres.filter(m => m.nom_complet.toLowerCase().includes(recherche.toLowerCase()));

    if (chargement) return <div className="min-h-screen bg-black text-white flex items-center justify-center font-black">ACCÈS ROOT...</div>;

    return (
        <main className="min-h-screen bg-white p-4 md:p-12 text-black font-sans">
            <div className="max-w-7xl mx-auto">
                <header className="mb-10 border-b-8 border-black pb-4 flex justify-between items-center">
                    <h1 className="text-4xl font-black text-red-600 uppercase italic">Admin Système</h1>
                    <input 
                        type="text" placeholder="Rechercher..." 
                        className="p-3 border-4 border-black rounded-xl text-xs font-black uppercase"
                        onChange={(e) => setRecherche(e.target.value)}
                    />
                </header>

                <div className="bg-white border-4 border-black rounded-[2rem] overflow-hidden shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]">
                    <table className="w-full text-left">
                        <thead className="bg-black text-white text-[10px] uppercase font-black">
                            <tr>
                                <th className="p-6">Utilisateur</th>
                                <th className="p-6">Rôle</th>
                                <th className="p-6">État</th>
                                <th className="p-6 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y-4 divide-black">
                            {filtrés.map((m) => (
                                <tr key={m.id} className="hover:bg-blue-50 font-bold">
                                    <td className="p-6 uppercase text-sm">
                                        {m.nom_complet} <br/> <span className="text-blue-700 text-[10px]">{m.generation}</span>
                                    </td>
                                    <td className="p-6">
                                        <select 
                                            value={m.role}
                                            onChange={(e) => updateRole(m.id, e.target.value)}
                                            className="border-2 border-black p-1 text-[10px] font-black uppercase bg-white"
                                        >
                                            <option value="membre">Membre</option>
                                            <option value="chef_gen">Chef Gen</option>
                                            <option value="tresorier_gen">Trésorier</option>
                                            <option value="baliou_padra">Baliou Padra</option>
                                            <option value="super_admin">Super Admin</option>
                                        </select>
                                    </td>
                                    <td className="p-6">
                                        <button 
                                            onClick={() => toggleValidation(m.id, m.est_valide)}
                                            className={`px-3 py-1 border-2 border-black text-[9px] font-black uppercase ${m.est_valide ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}
                                        >
                                            {m.est_valide ? 'Actif' : 'Bloqué'}
                                        </button>
                                    </td>
                                    <td className="p-6 text-right">
                                        <button 
                                            onClick={() => radierMembre(m.id, m.nom_complet)}
                                            className="bg-red-600 text-white border-2 border-black px-4 py-2 rounded-xl font-black text-[10px] uppercase"
                                        >
                                            Radier
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </main>
    );
}