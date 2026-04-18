"use client";
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function GestionComites() {
    const [membres, setMembres] = useState<any[]>([]);
    const [comites, setComites] = useState<any[]>([]);
    const [nomComite, setNomComite] = useState("");
    const [typeComite, setTypeComite] = useState("Central");
    const [membreSelectionne, setMembreSelectionne] = useState("");
    const [comiteSelectionneId, setComiteSelectionneId] = useState("");

    useEffect(() => { loadData(); }, []);

    async function loadData() {
        const { data: m } = await supabase.from('membres').select('id, nom_complet, generation').order('nom_complet');
        const { data: c } = await supabase.from('comites').select('*');
        setMembres(m || []);
        setComites(c || []);
    }

    async function creerComite(e: React.FormEvent) {
        e.preventDefault();
        const { error } = await supabase.from('comites').insert([{ nom: nomComite, type: typeComite }]);
        if (error) alert(error.message); else { alert("Comité créé !"); loadData(); }
    }

    async function ajouterMembreAuComite() {
        if (!comiteSelectionneId || !membreSelectionne) return;
        const { error } = await supabase.from('comite_membres').insert([{
            comite_id: comiteSelectionneId,
            membre_id: membreSelectionne
        }]);
        if (error) alert("Déjà dans ce comité ou erreur"); else alert("Membre ajouté !");
    }

    return (
        <main className="min-h-screen bg-white p-4 md:p-12 text-black font-sans">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-4xl font-black text-blue-700 uppercase italic border-b-4 border-black pb-4 mb-10">Gestion des Comités</h1>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">

                    {/* CRÉATION DE COMITÉ */}
                    <div className="border-4 border-black p-8 rounded-[2.5rem] bg-blue-50 shadow-2xl">
                        <h2 className="text-xl font-black uppercase mb-6 italic underline">1. Créer un nouveau Comité</h2>
                        <form onSubmit={creerComite} className="space-y-4">
                            <input type="text" placeholder="Nom du Comité (ex: Comité Scolaire)" required
                                className="w-full p-4 border-2 border-black rounded-2xl font-bold"
                                onChange={(e) => setNomComite(e.target.value)} />
                            <select className="w-full p-4 border-2 border-black rounded-2xl font-black bg-white"
                                onChange={(e) => setTypeComite(e.target.value)}>
                                <option value="Central">Central (Baliou Padra)</option>
                                <option value="Scolaire">Scolaire</option>
                                <option value="Generationnel">Générationnel</option>
                            </select>
                            <button className="w-full py-4 bg-black text-white font-black rounded-2xl uppercase">Créer le Comité</button>
                        </form>
                    </div>

                    {/* AFFECTATION DES MEMBRES */}
                    <div className="border-4 border-black p-8 rounded-[2.5rem] bg-white shadow-2xl">
                        <h2 className="text-xl font-black uppercase mb-6 italic underline">2. Affecter un Responsable</h2>
                        <div className="space-y-4">
                            <select className="w-full p-4 border-2 border-black rounded-2xl font-black"
                                onChange={(e) => setComiteSelectionneId(e.target.value)}>
                                <option value="">-- Choisir le Comité --</option>
                                {comites.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                            </select>
                            <select className="w-full p-4 border-2 border-black rounded-2xl font-bold"
                                onChange={(e) => setMembreSelectionne(e.target.value)}>
                                <option value="">-- Choisir le Membre --</option>
                                {membres.map(m => <option key={m.id} value={m.id}>{m.nom_complet} ({m.generation})</option>)}
                            </select>
                            <button onClick={ajouterMembreAuComite} className="w-full py-4 bg-blue-700 text-white font-black rounded-2xl border-2 border-black uppercase">Ajouter au Comité</button>
                        </div>
                    </div>

                </div>
            </div>
        </main>
    );
}