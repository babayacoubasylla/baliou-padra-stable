"use client";
import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function DecesForm() {
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const [form, setForm] = useState({
        nom: '', prenoms: '', date_naiss: '', lieu_naiss: '', nat: '', prof: '', adr: '',
        date_deces: '', heure_deces: '', lieu_deces: '', cause: ''
    });

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const { error } = await supabase.from('registre_civil').insert([{
            type_evenement: 'Décès',
            date_evenement: form.date_deces,
            description: `Décès de ${form.prenoms} ${form.nom}`,
            donnees_detaillees: form
        }]);

        if (error) alert(error.message);
        else { alert("AVIS DE DÉCÈS ENREGISTRÉ"); router.push('/etat-civil'); }
        setLoading(false);
    };

    return (
        <main className="min-h-screen bg-slate-50 p-4 md:p-12 text-black font-sans">
            <div className="max-w-3xl mx-auto bg-white border-4 border-black rounded-[2.5rem] p-8 shadow-2xl">
                <h1 className="text-3xl font-black uppercase text-red-600 mb-8 border-b-4 border-black pb-2 italic">🕊️ Acte de Décès</h1>

                <form onSubmit={handleSave} className="space-y-8">
                    <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <h2 className="col-span-full font-black uppercase text-xs border-l-4 border-red-600 pl-2">Informations sur le défunt</h2>
                        <input type="text" placeholder="NOM" required className="p-4 border-2 border-black rounded-xl font-bold" onChange={e => setForm({ ...form, nom: e.target.value })} />
                        <input type="text" placeholder="PRÉNOMS" required className="p-4 border-2 border-black rounded-xl font-bold" onChange={e => setForm({ ...form, prenoms: e.target.value })} />
                        <input type="date" placeholder="DATE DE NAISSANCE" className="p-4 border-2 border-black rounded-xl font-bold" onChange={e => setForm({ ...form, date_naiss: e.target.value })} />
                        <input type="text" placeholder="LIEU DE NAISSANCE" className="p-4 border-2 border-black rounded-xl font-bold" onChange={e => setForm({ ...form, lieu_naiss: e.target.value })} />
                    </section>

                    <section className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-red-50 p-6 rounded-3xl border-2 border-black">
                        <h2 className="col-span-full font-black uppercase text-xs">Informations sur le décès</h2>
                        <input type="date" required className="p-3 border-2 border-black rounded-lg font-bold" onChange={e => setForm({ ...form, date_deces: e.target.value })} />
                        <input type="time" required className="p-3 border-2 border-black rounded-lg font-bold" onChange={e => setForm({ ...form, heure_deces: e.target.value })} />
                        <input type="text" placeholder="LIEU DU DÉCÈS" className="col-span-full p-3 border-2 border-black rounded-lg font-bold" onChange={e => setForm({ ...form, lieu_deces: e.target.value })} />
                        <input type="text" placeholder="CAUSE DU DÉCÈS (SI CONNUE)" className="col-span-full p-3 border-2 border-black rounded-lg font-bold" onChange={e => setForm({ ...form, cause: e.target.value })} />
                    </section>

                    <button type="submit" disabled={loading} className="w-full py-6 bg-red-600 text-white font-black text-2xl rounded-2xl uppercase border-4 border-black hover:bg-black transition-all shadow-xl">
                        {loading ? "ENREGISTREMENT..." : "VALIDER L'ACTE DE DÉCÈS"}
                    </button>
                </form>
            </div>
        </main>
    );
}