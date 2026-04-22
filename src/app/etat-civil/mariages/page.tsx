"use client";
import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function MariageForm() {
    const [loading, setLoading] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const router = useRouter();
    const [form, setForm] = useState({
        epoux_nom: '', epoux_date_lieu: '', epoux_nat: '', epoux_prof: '', epoux_adr: '', epoux_tel: '',
        epouse_nom: '', epouse_date_lieu: '', epouse_nat: '', epouse_prof: '', epouse_adr: '', epouse_tel: '',
        date_mariage: '', lieu: 'GAGNOA (KARAHOUROU ZAWIYA)'
    });

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        let signatureUrl = "";

        if (file) {
            const name = `${Date.now()}-mariage`;
            await supabase.storage.from('documents-comites').upload(name, file);
            signatureUrl = supabase.storage.from('documents-comites').getPublicUrl(name).data.publicUrl;
        }

        const { error } = await supabase.from('registre_civil').insert([{
            type_evenement: 'Mariage',
            date_evenement: form.date_mariage,
            lieu: form.lieu,
            description: `Mariage de ${form.epoux_nom} et ${form.epouse_nom}`,
            donnees_detaillees: { ...form, signature_url: signatureUrl }
        }]);

        if (error) alert(error.message);
        else { alert("MARIAGE ENREGISTRÉ AU REGISTRE"); router.push('/etat-civil'); }
        setLoading(false);
    };

    return (
        <main className="min-h-screen bg-slate-50 p-4 md:p-12 text-black">
            <div className="max-w-4xl mx-auto bg-white border-4 border-black rounded-[2.5rem] p-8 shadow-2xl">
                <h1 className="text-3xl font-black uppercase text-blue-700 mb-8 border-b-4 border-black pb-2 italic">💍 Registre des Mariages</h1>

                <form onSubmit={handleSave} className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* EPOUX */}
                        <div className="space-y-4 border-2 border-black p-4 rounded-2xl bg-blue-50">
                            <h2 className="font-black uppercase text-blue-700">L'Époux</h2>
                            <input type="text" placeholder="NOM COMPLET" required className="w-full p-3 border-2 border-black rounded-lg font-bold" onChange={e => setForm({ ...form, epoux_nom: e.target.value })} />
                            <input type="text" placeholder="DATE ET LIEU DE NAISSANCE" className="w-full p-3 border-2 border-black rounded-lg font-bold" onChange={e => setForm({ ...form, epoux_date_lieu: e.target.value })} />
                            <input type="text" placeholder="NATIONALITÉ" className="w-full p-3 border-2 border-black rounded-lg font-bold" onChange={e => setForm({ ...form, epoux_nat: e.target.value })} />
                        </div>
                        {/* EPOUSE */}
                        <div className="space-y-4 border-2 border-black p-4 rounded-2xl bg-pink-50">
                            <h2 className="font-black uppercase text-pink-700">L'Épouse</h2>
                            <input type="text" placeholder="NOM COMPLET" required className="w-full p-3 border-2 border-black rounded-lg font-bold" onChange={e => setForm({ ...form, epouse_nom: e.target.value })} />
                            <input type="text" placeholder="DATE ET LIEU DE NAISSANCE" className="w-full p-3 border-2 border-black rounded-lg font-bold" onChange={e => setForm({ ...form, epouse_date_lieu: e.target.value })} />
                            <input type="text" placeholder="NATIONALITÉ" className="w-full p-3 border-2 border-black rounded-lg font-bold" onChange={e => setForm({ ...form, epouse_nat: e.target.value })} />
                        </div>
                    </div>

                    <div className="bg-slate-100 p-6 border-2 border-black rounded-2xl">
                        <h2 className="font-black uppercase text-sm mb-4 italic">Infos Mariage</h2>
                        <input type="date" required className="w-full p-4 border-2 border-black rounded-xl font-bold mb-4" onChange={e => setForm({ ...form, date_mariage: e.target.value })} />
                        <p className="p-4 bg-white border-2 border-black rounded-xl font-black uppercase text-center">LIEU : GAGNOA (KARAHOUROU ZAWIYA)</p>
                    </div>

                    <div className="p-6 border-2 border-dashed border-black rounded-2xl text-center">
                        <label className="block font-black uppercase text-xs mb-2">Scanner / Photo de l'acte signé (PDF/JPG)</label>
                        <input type="file" onChange={e => setFile(e.target.files![0])} />
                    </div>

                    <button type="submit" disabled={loading} className="w-full py-6 bg-[#0044ff] text-white font-black text-2xl rounded-2xl uppercase border-4 border-black shadow-xl">
                        {loading ? "ENREGISTREMENT..." : "DÉLIVRER L'ACTE DE MARIAGE"}
                    </button>
                </form>
            </div>
        </main>
    );
}