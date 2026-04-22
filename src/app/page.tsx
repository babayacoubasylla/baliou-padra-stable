"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function RegistrationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', nom: '', kah: '', tel: '', gen: 'Génération 1', ville: '' });

  // --- FORCE LA REDIRECTION SI DÉJÀ CONNECTÉ ---
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        router.push('/profil');
      }
    };
    checkUser();
  }, [router]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // 1. Création du compte Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
      });

      if (authError) throw authError;

      // 2. Création de la fiche membre (Liaison immédiate)
      if (authData.user) {
        const { error: dbError } = await supabase.from('membres').insert([{
          user_id: authData.user.id,
          email: form.email,
          nom_complet: form.nom,
          kah_tokho: form.kah,
          telephone: form.tel,
          generation: form.gen,
          ville_residence: form.ville,
          role: 'membre',
          est_valide: true // On valide tout de suite
        }]);
        if (dbError) throw dbError;
      }

      alert("Inscription réussie ! Bienvenue dans la communauté.");
      router.push('/profil');

    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 py-10 px-4 font-sans text-black">
      <div className="max-w-2xl mx-auto text-center mb-10">
        <h1 className="text-4xl font-black text-[#146332] uppercase italic">Baliou N'Padra</h1>
        <p className="font-bold text-black border-b-2 border-black inline-block uppercase tracking-widest text-xs pb-1">Communauté Cheikh Yacouba Sylla</p>
      </div>

      <div className="max-w-xl mx-auto bg-white border-4 border-black rounded-[2.5rem] p-8 shadow-2xl">
        <h2 className="text-2xl font-black uppercase mb-8 border-b-2 border-black pb-2 text-center">Créer mon compte</h2>
        <form onSubmit={handleRegister} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="email" placeholder="Email" required className="p-4 border-2 border-black rounded-xl font-bold bg-white text-black" onChange={e => setForm({ ...form, email: e.target.value })} />
            <input type="password" placeholder="Mot de passe" required className="p-4 border-2 border-black rounded-xl font-bold bg-white text-black" onChange={e => setForm({ ...form, password: e.target.value })} />
          </div>
          <input type="text" placeholder="Nom et Prénom" required className="w-full p-4 border-2 border-black rounded-xl font-bold bg-white text-black" onChange={e => setForm({ ...form, nom: e.target.value })} />
          <input type="text" placeholder="Kah Tôkhô" required className="w-full p-4 border-2 border-black rounded-xl font-bold bg-white text-black" onChange={e => setForm({ ...form, kah: e.target.value })} />
          <button type="submit" disabled={loading} className="w-full py-5 bg-[#146332] text-white font-black rounded-2xl border-2 border-black shadow-lg uppercase">
            {loading ? "Chargement..." : "S'inscrire et Entrer"}
          </button>
        </form>
      </div>
    </main>
  );
}