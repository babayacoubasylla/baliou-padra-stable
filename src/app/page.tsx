"use client";
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function DashboardHub() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    checkAuthAndRedirect();
  }, []);

  const checkAuthAndRedirect = async () => {
    // Vérifier la session
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      router.push('/login');
      return;
    }

    // Récupérer le profil
    const { data: profileData } = await supabase
      .from('membres')
      .select('*')
      .eq('user_id', session.user.id)
      .maybeSingle();

    setProfile(profileData);
    setUser(session.user);

    const role = profileData?.role || 'membre';

    // Redirection automatique selon le rôle
    if (role === 'super_admin') {
      router.push('/admin-systeme');
    } else if (role === 'baliou_padra') {
      router.push('/admin-central');
    } else if (role === 'chef_gen') {
      router.push('/chef-gen/dashboard');
    } else if (role === 'tresorier') {
      router.push('/tresorier/dashboard');
    } else if (role === 'comite_com_gen') {
      router.push('/comite-com-gen/dashboard');
    } else {
      setLoading(false); // Afficher le dashboard membre
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700 mx-auto"></div>
          <p className="mt-4 text-gray-500 font-bold">Chargement de votre espace...</p>
        </div>
      </div>
    );
  }

  // Dashboard pour les membres standards
  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-12 text-black">
      <div className="max-w-5xl mx-auto">
        <header className="mb-12 border-b-4 border-black pb-6">
          <h1 className="text-4xl font-black text-[#146332] uppercase italic">
            Tableau de Bord
          </h1>
          <p className="font-bold text-gray-500 uppercase text-xs tracking-widest mt-2">
            Bienvenue {profile?.nom_complet || user?.email?.split('@')[0]}
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link href="/profil" className="bg-white border-4 border-black rounded-2xl p-6 hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,0.1)] transition-all">
            <div className="text-4xl mb-3">👤</div>
            <h2 className="font-black text-xl">Mon Profil</h2>
            <p className="text-sm text-gray-600 mt-1">Consulter et modifier mes informations</p>
          </Link>

          <Link href="/annuaire" className="bg-white border-4 border-black rounded-2xl p-6 hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,0.1)] transition-all">
            <div className="text-4xl mb-3">📇</div>
            <h2 className="font-black text-xl">Annuaire</h2>
            <p className="text-sm text-gray-600 mt-1">Voir les membres de la communauté</p>
          </Link>

          <Link href="/bibliotheque" className="bg-white border-4 border-black rounded-2xl p-6 hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,0.1)] transition-all">
            <div className="text-4xl mb-3">📚</div>
            <h2 className="font-black text-xl">Bibliothèque</h2>
            <p className="text-sm text-gray-600 mt-1">Accès aux documents et archives</p>
          </Link>

          <Link href="/histoire" className="bg-white border-4 border-black rounded-2xl p-6 hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,0.1)] transition-all">
            <div className="text-4xl mb-3">📜</div>
            <h2 className="font-black text-xl">Histoire</h2>
            <p className="text-sm text-gray-600 mt-1">Découvrir l'histoire de la communauté</p>
          </Link>

          <Link href="/finances" className="bg-white border-4 border-black rounded-2xl p-6 hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,0.1)] transition-all">
            <div className="text-4xl mb-3">💰</div>
            <h2 className="font-black text-xl">Mes Finances</h2>
            <p className="text-sm text-gray-600 mt-1">Suivi de mes cotisations</p>
          </Link>
        </div>
      </div>
    </main>
  );
}