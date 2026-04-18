"use client";
import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [chargement, setChargement] = useState(false);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setChargement(true);

        try {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });

            if (error) throw error;

            // Récupérer le rôle et le statut de validation dans la table membres
            const { data: profile, error: profileError } = await supabase
                .from('membres')
                .select('role, est_valide')
                .eq('user_id', data.user.id)
                .maybeSingle();

            if (profileError) throw profileError;

            // Vérifier si le compte existe dans la table membres
            if (!profile) {
                alert("Profil utilisateur introuvable. Veuillez contacter l'administrateur.");
                await supabase.auth.signOut();
                setChargement(false);
                return;
            }

            // Vérifier si le compte est validé
            if (!profile.est_valide) {
                alert("Votre compte n'a pas encore été validé par un administrateur. Veuillez patienter.");
                await supabase.auth.signOut();
                setChargement(false);
                return;
            }

            // 🔀 PORTE DE TRI - REDIRECTION STRICTE SELON LE RÔLE
            if (profile.role === 'super_admin') {
                router.push('/admin-systeme');
            }
            else if (profile.role === 'baliou_padra') {
                router.push('/admin-central');
            }
            else if (profile.role === 'chef_gen' || profile.role === 'tresorier_gen' || profile.role === 'adjoint_gen') {
                router.push('/generation');
            }
            else {
                router.push('/annuaire');
            }

        } catch (error: any) {
            alert("Erreur de connexion : " + error.message);
        } finally {
            setChargement(false);
        }
    };

    return (
        <main className="min-h-screen bg-[#0044ff] flex items-center justify-center p-4">
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

            <div className="max-w-md w-full bg-white rounded-[3rem] shadow-[20px_20px_0px_0px_rgba(0,0,0,1)] p-10 border-4 border-black">
                <div className="text-center mb-10">
                    <h1 className="text-4xl font-black text-[#0044ff] tracking-tighter uppercase">BALIOU PADRA</h1>
                    <p className="text-black font-black text-xs uppercase tracking-[0.2em] mt-2 underline">Espace Privé</p>
                    <p className="font-bold text-[10px] uppercase tracking-widest text-gray-400 mt-1">Accès Sécurisé Admin & Chefs</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="block text-xs font-black uppercase text-black mb-2">Adresse Email</label>
                        <input
                            type="email"
                            required
                            placeholder="exemple@email.com"
                            className="w-full px-6 py-4 bg-white border-4 border-black rounded-2xl outline-none font-black text-black focus:bg-yellow-50 transition-all"
                            onChange={(e) => setEmail(e.target.value)}
                            value={email}
                            disabled={chargement}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-black uppercase text-black mb-2">Mot de passe</label>
                        <input
                            type="password"
                            required
                            placeholder="••••••••"
                            className="w-full px-6 py-4 bg-white border-4 border-black rounded-2xl outline-none font-black text-black focus:bg-yellow-50 transition-all"
                            onChange={(e) => setPassword(e.target.value)}
                            value={password}
                            disabled={chargement}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={chargement}
                        className="w-full py-5 bg-black text-white font-black rounded-2xl shadow-xl active:scale-95 text-xl uppercase hover:bg-[#0044ff] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {chargement ? "VÉRIFICATION..." : "ENTRER"}
                    </button>
                </form>

                <div className="mt-10 text-center font-black text-[10px] uppercase tracking-widest text-black">
                    ALLAH KANE — GNAMARIYE BATIYE — KABEHI TOKHË
                </div>

                <div className="mt-6 text-center font-black text-[8px] uppercase opacity-30 italic">
                    All Rights Reserved — Baliou Padra 2026
                </div>
            </div>
        </main>
    );
}