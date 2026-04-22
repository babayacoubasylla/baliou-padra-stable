"use client";
import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function NaissanceForm() {
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const [form, setForm] = useState({
        nom_famille: '', prenoms: '', date_naiss: '', heure_naiss: '', lieu_naiss: '', sexe: 'Masculin',
        pere_nom: '', pere_date_lieu: '', pere_prof: '', pere_adr: '', pere_tel: '',
        mere_nom: '', mere_date_lieu: '', mere_prof: '', mere_adr: '', mere_tel: '',
        declarant_nom: '', declarant_lien: '', declarant_adr: '', declarant_tel: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const { error } = await supabase.from('registre_civil').insert([{
            type_evenement: 'Naissance',
            date_evenement: form.date_naiss,
            description: `Naissance de ${form.prenoms} ${form.nom_famille}`,
            donnees_detaillees: form // On stocke tout le dictionnaire
        }]);

        if (error) alert(error.message);
        else { alert("ACTE DE NAISSANCE ENREGISTRÉ"); router.push('/etat-civil'); }
        setLoading(false);
    };

    return (
        <main className="min-h-screen bg-slate-50 p-4 md:p-12 text-black font-sans">
            <div className="max-w-4xl mx-auto bg-white border-4 border-black rounded-[2.5rem] p-8 shadow-2xl">
                <h1 className="text-3xl font-black uppercase text-orange-600 mb-8 border-b-4 border-black pb-2 italic">👶 Déclaration de Naissance</h1>

                <form onSubmit={handleSubmit} className="space-y-10">
                    {/* ENFANT */}
                    <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <h2 className="col-span-full font-black uppercase text-sm border-l-8 border-orange-600 pl-3">Informations sur l'enfant</h2>
                        <input type="text" placeholder="NOM DE FAMILLE" required className="p-4 border-2 border-black rounded-xl font-bold" onChange={e => setForm({ ...form, nom_famille: e.target.value })} />
                        <input type="text" placeholder="PRÉNOMS" required className="p-4 border-2 border-black rounded-xl font-bold" onChange={e => setForm({ ...form, prenoms: e.target.value })} />
                        <input type="date" required className="p-4 border-2 border-black rounded-xl font-bold" onChange={e => setForm({ ...form, date_naiss: e.target.value })} />
                        <input type="time" required className="p-4 border-2 border-black rounded-xl font-bold" onChange={e => setForm({ ...form, heure_naiss: e.target.value })} />
                        <input type="text" placeholder="LIEU DE NAISSANCE (Vile, Hôpital...)" className="col-span-full p-4 border-2 border-black rounded-xl font-bold" onChange={e => setForm({ ...form, lieu_naiss: e.target.value })} />
                        <select className="p-4 border-2 border-black rounded-xl font-black bg-white" onChange={e => setForm({ ...form, sexe: e.target.value })}>
                            <option value="Masculin">Masculin</option>
                            <option value="Féminin">Féminin</option>
                        </select>
                    </section>

                    {/* PERE */}
                    <section className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-6 rounded-3xl border-2 border-black">
                        <h2 className="col-span-full font-black uppercase text-sm">Informations sur le père</h2>
                        <input type="text" placeholder="NOM COMPLET DU PÈRE" className="col-span-full p-3 border-2 border-black rounded-xl font-bold" onChange={e => setForm({ ...form, pere_nom: e.target.value })} />
                        <input type="text" placeholder="DATE ET LIEU DE NAISSANCE" className="p-3 border-2 border-black rounded-xl font-bold" onChange={e => setForm({ ...form, pere_date_lieu: e.target.value })} />
                        <input type="text" placeholder="PROFESSION" className="p-3 border-2 border-black rounded-xl font-bold" onChange={e => setForm({ ...form, pere_prof: e.target.value })} />
                        <input type="text" placeholder="ADRESSE" className="p-3 border-2 border-black rounded-xl font-bold" onChange={e => setForm({ ...form, pere_adr: e.target.value })} />
                        <input type="tel" placeholder="TÉLÉPHONE" className="p-3 border-2 border-black rounded-xl font-bold" onChange={e => setForm({ ...form, pere_tel: e.target.value })} />
                    </section>

                    {/* MERE */}
                    <section className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-6 rounded-3xl border-2 border-black">
                        <h2 className="col-span-full font-black uppercase text-sm">Informations sur la mère</h2>
                        <input type="text" placeholder="NOM COMPLET DE LA MÈRE" className="col-span-full p-3 border-2 border-black rounded-xl font-bold" onChange={e => setForm({ ...form, mere_nom: e.target.value })} />
                        <input type="text" placeholder="DATE ET LIEU DE NAISSANCE" className="p-3 border-2 border-black rounded-xl font-bold" onChange={e => setForm({ ...form, mere_date_lieu: e.target.value })} />
                        <input type="text" placeholder="PROFESSION" className="p-3 border-2 border-black rounded-xl font-bold" onChange={e => setForm({ ...form, mere_prof: e.target.value })} />
                        <input type="text" placeholder="ADRESSE" className="p-3 border-2 border-black rounded-xl font-bold" onChange={e => setForm({ ...form, mere_adr: e.target.value })} />
                        <input type="tel" placeholder="TÉLÉPHONE" className="p-3 border-2 border-black rounded-xl font-bold" onChange={e => setForm({ ...form, mere_tel: e.target.value })} />
                    </section>

                    <button type="submit" disabled={loading} className="w-full py-6 bg-black text-white font-black text-2xl rounded-2xl uppercase hover:bg-orange-600 transition-all">
                        {loading ? "ENREGISTREMENT..." : "VALIDER L'ACTE DE NAISSANCE"}
                    </button>
                </form>
            </div>
        </main>
    );
}