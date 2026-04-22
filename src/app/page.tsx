"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegistrationPage() {
  const router = useRouter();
  const lesGenerations = [
    "Génération Wassalah dramane", "Génération Dramane konté", "Génération kissima",
    "Génération maramou basseyabané", "Génération khadja bah baya",
    "Génération antankhoulé passokhona", "Génération Mamery",
    "Génération makhadja baliou", "Génération kissima bah", "Génération tchamba",
    "Diaspora Internationale"
  ];

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    nom: '',
    kah_tokho: '',
    telephone: '',
    generation: lesGenerations[0],
    ville: '',
    metier: '',
    diplome: ''
  });

  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  // Vérifier si l'utilisateur est déjà connecté
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) router.push('/dashboard');
    });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. CRÉATION DU COMPTE SÉCURISÉ (Auth)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (authError) throw authError;
      const userId = authData.user?.id;

      if (!userId) throw new Error("Erreur lors de la création du compte");

      // 2. GESTION DE LA PHOTO
      let photoUrl = "";
      if (file) {
        const fileName = `${userId}-${Date.now()}`;
        const { error: uploadError } = await supabase.storage
          .from('photos-membres')
          .upload(fileName, file);

        if (!uploadError) {
          const { data: publicUrlData } = supabase.storage
            .from('photos-membres')
            .getPublicUrl(fileName);
          photoUrl = publicUrlData.publicUrl;
        }
      }

      // 3. CRÉATION DE LA FICHE MEMBRE LIÉE AU COMPTE
      const { error: dbError } = await supabase.from('membres').insert([{
        user_id: userId,
        nom_complet: formData.nom,
        kah_tokho: formData.kah_tokho,
        telephone: formData.telephone,
        generation: formData.generation,
        ville_residence: formData.ville,
        metier: formData.metier,
        diplome: formData.diplome,
        photo_url: photoUrl,
        role: 'membre',
        est_valide: false
      }]);

      if (dbError) throw dbError;

      alert("Compte créé avec succès ! Votre Chef de Génération va valider votre accès.");
      router.push('/login');

    } catch (error: any) {
      alert("Erreur : " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 py-6 md:py-10 px-4 font-sans text-black">
      <style jsx global>{`
        ::selection {
          background-color: black !important;
          color: white !important;
        }
        ::-moz-selection {
          background-color: black !important;
          color: white !important;
        }
        input, select, textarea {
          background-color: black !important;
          color: white !important;
          border-color: #333 !important;
        }
        input::placeholder, textarea::placeholder {
          color: #999 !important;
        }
        select option {
          background-color: black !important;
          color: white !important;
        }
        input:focus, select:focus, textarea:focus {
          border-color: #22c55e !important;
          outline: none !important;
          box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.2) !important;
        }
        @keyframes focys-scroll {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .animate-focys-scroll {
          animation: focys-scroll 20s linear infinite;
          white-space: nowrap;
        }
      `}</style>

      {/* SECTION ENTÊTE - Taille de texte responsive */}
      <div className="max-w-2xl mx-auto text-center mb-6 md:mb-10">
        <h1 className="text-3xl md:text-5xl font-black text-[#146332] tracking-tighter uppercase italic">Baliou N'Padra</h1>
        <p className="text-[10px] md:text-sm text-gray-500 font-bold uppercase tracking-widest mt-2">
          Communauté Cheikh Yacouba Sylla
        </p>
      </div>

      {/* CARTE DU FORMULAIRE - Padding réduit sur mobile */}
      <div className="max-w-2xl mx-auto bg-white rounded-[1.5rem] md:rounded-[2.5rem] shadow-xl overflow-hidden border-2 border-black">
        <div className="p-5 md:p-12">
          <h2 className="text-xl md:text-2xl font-bold mb-6 text-black border-b-2 border-black pb-4 text-center uppercase italic">
            Fiche d'Inscription
          </h2>

          {/* GRID - 1 colonne sur mobile, 2 sur tablette/PC */}
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">

            {/* IDENTIFIANTS DE CONNEXION - Stackés sur mobile */}
            <div className="md:col-span-2 space-y-4 bg-blue-50 p-4 md:p-6 rounded-2xl border-2 border-blue-700">
              <p className="text-[10px] font-black uppercase text-blue-700 text-center">Identifiants de connexion</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase mb-1 text-black">Email (identifiant)</label>
                  <input
                    type="email"
                    required
                    placeholder="exemple@email.com"
                    className="w-full p-3 border-2 border-black rounded-xl font-bold outline-none transition-all text-sm"
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase mb-1 text-black">Mot de passe</label>
                  <input
                    type="password"
                    required
                    placeholder="Minimum 6 caractères"
                    className="w-full p-3 border-2 border-black rounded-xl font-bold outline-none transition-all text-sm"
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* CHAMP PHOTO DE PROFIL */}
            <div className="md:col-span-2 flex flex-col items-center justify-center border-2 border-dashed border-green-700 p-4 md:p-6 rounded-2xl bg-green-50 transition-all hover:border-green-900">
              <label className="block text-xs md:text-sm font-black text-green-800 mb-2 md:mb-3 uppercase italic">Photo de profil (optionnelle)</label>
              <input
                type="file"
                accept="image/*"
                className="text-xs md:text-sm text-black file:mr-2 md:file:mr-4 file:py-1 md:file:py-2 file:px-3 md:file:px-6 file:rounded-full file:border-0 file:text-xs md:file:text-sm file:font-bold file:bg-green-700 file:text-white hover:file:bg-green-800 cursor-pointer"
                onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
              />
              <p className="text-[10px] md:text-xs text-gray-500 mt-2">Format JPG, PNG - Recommandé pour votre profil</p>
            </div>

            {/* NOM ET PRENOM */}
            <div className="space-y-1 md:space-y-2">
              <label className="text-[10px] md:text-sm font-black text-black uppercase">Nom et Prénom</label>
              <input
                type="text" required placeholder="Saisir ici"
                className="w-full p-3 md:p-4 border-2 border-black rounded-xl font-bold outline-none transition-all text-sm"
                onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
              />
            </div>

            {/* KAH TÔKHÔ */}
            <div className="space-y-1 md:space-y-2">
              <label className="text-[10px] md:text-sm font-black text-black uppercase">Kah Tôkhô</label>
              <input
                type="text" required placeholder="Nom clanique"
                className="w-full p-3 md:p-4 border-2 border-black rounded-xl font-bold outline-none transition-all text-sm"
                onChange={(e) => setFormData({ ...formData, kah_tokho: e.target.value })}
              />
            </div>

            {/* VILLE DE RESIDENCE */}
            <div className="space-y-1 md:space-y-2">
              <label className="text-[10px] md:text-sm font-black text-black uppercase">Ville</label>
              <input
                type="text" required placeholder="Ex: Gagnoa"
                className="w-full p-3 md:p-4 border-2 border-black rounded-xl font-bold outline-none transition-all text-sm"
                onChange={(e) => setFormData({ ...formData, ville: e.target.value })}
              />
            </div>

            {/* NUMÉRO DE TÉLÉPHONE */}
            <div className="space-y-1 md:space-y-2">
              <label className="text-[10px] md:text-sm font-black text-black uppercase">Téléphone</label>
              <input
                type="tel" required placeholder="Contact"
                className="w-full p-3 md:p-4 border-2 border-black rounded-xl font-bold outline-none transition-all text-sm"
                onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
              />
            </div>

            {/* MÉTIER */}
            <div className="space-y-1 md:space-y-2">
              <label className="text-[10px] md:text-sm font-black text-black uppercase">Métier</label>
              <input
                type="text" placeholder="Profession"
                className="w-full p-3 md:p-4 border-2 border-black rounded-xl font-bold outline-none transition-all text-sm"
                onChange={(e) => setFormData({ ...formData, metier: e.target.value })}
              />
            </div>

            {/* DIPLÔME */}
            <div className="space-y-1 md:space-y-2">
              <label className="text-[10px] md:text-sm font-black text-black uppercase">Diplôme</label>
              <input
                type="text" placeholder="Dernier diplôme"
                className="w-full p-3 md:p-4 border-2 border-black rounded-xl font-bold outline-none transition-all text-sm"
                onChange={(e) => setFormData({ ...formData, diplome: e.target.value })}
              />
            </div>

            {/* GÉNÉRATION */}
            <div className="md:col-span-2 space-y-1 md:space-y-2">
              <label className="text-[10px] md:text-sm font-black text-black uppercase">Choisir votre Génération</label>
              <select
                className="w-full p-3 md:p-4 border-2 border-black rounded-xl font-black outline-none transition-all appearance-none cursor-pointer text-sm"
                onChange={(e) => setFormData({ ...formData, generation: e.target.value })}
                value={formData.generation}
              >
                {lesGenerations.map((gen, index) => (
                  <option key={index} value={gen}>{gen}</option>
                ))}
              </select>
            </div>

            {/* BOUTON D'ENVOI */}
            <button
              type="submit"
              disabled={loading}
              className={`md:col-span-2 py-3 md:py-5 bg-green-700 hover:bg-black text-white font-black rounded-xl shadow-xl transition-all text-base md:text-xl mt-2 md:mt-4 ${loading ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}`}
            >
              {loading ? "CRÉATION EN COURS..." : "CRÉER MON COMPTE"}
            </button>

            {/* LIEN DE CONNEXION */}
            <div className="md:col-span-2 text-center pt-2 md:pt-4">
              <p className="text-xs md:text-sm font-bold text-gray-500">
                Déjà membre ? <Link href="/login" className="text-blue-700 underline font-black ml-1">Se connecter ici</Link>
              </p>
            </div>

            {/* MESSAGE INFORMATIF */}
            <div className="md:col-span-2 text-center text-[10px] md:text-xs text-gray-500 mt-1 md:mt-2">
              <p>⚠️ Après inscription, votre compte devra être validé par votre Chef de Génération avant de pouvoir vous connecter.</p>
            </div>
          </form>
        </div>

        {/* BANDEAU ANIMÉ */}
        <div className="bg-blue-700 py-3 md:py-5 border-t-4 border-black overflow-hidden relative">
          <div className="animate-focys-scroll">
            <span className="text-white font-black text-sm md:text-xl tracking-[0.1em] md:tracking-[0.2em] uppercase px-4 inline-block italic whitespace-nowrap">
              ALLAH KANE — GNAMARIYE BATIYE — KABEHI TOKHË. BAH NAWARY — ALLAH KANE — GNAMARIYE BATIYE — KABEHI TOKHË. BAH NAWARY
            </span>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="text-center mt-8 md:mt-12 mb-6 md:mb-8">
        <p className="text-gray-400 text-[8px] md:text-xs font-medium tracking-widest uppercase">
          © 2025 BALIOU N'PADRA — Fondation Cheikh Yacouba Sylla, Côte d'Ivoire
        </p>
      </footer>
    </main>
  );
}