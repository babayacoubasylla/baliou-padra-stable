"use client";
import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    // Table de correspondance des rôles vers les URLs
    const getRedirectUrl = (role: string): string => {
        const routes: Record<string, string> = {
            'super_admin': '/admin-systeme',
            'baliou_padra': '/admin-central',
            'agent_civil': '/etat-civil',
            'agent_rh': '/annuaire-pro',                          // ✅ CORRIGÉ
            'responsable_bd': '/gestion-base-donnees',            // ✅ CORRIGÉ
            'chef_gen': '/chef-gen/dashboard',
            'tresorier': '/tresorier/dashboard',
            'comite_com_gen': '/comite-com-gen/dashboard',
            'comite_com_central': '/admin-central/communication',
            'membre': '/'
        };
        return routes[role] || '/';
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // 1. Authentification
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (authError) throw authError;

            if (!authData.user) {
                throw new Error("Utilisateur non trouvé");
            }

            // 2. Récupération du profil
            const { data: profile, error: profileError } = await supabase
                .from('membres')
                .select('role, generation')
                .eq('user_id', authData.user.id)
                .maybeSingle();

            if (profileError) {
                throw new Error("Impossible de vérifier vos droits d'accès. Erreur serveur.");
            }

            // 3. Détermination du rôle
            const role = profile?.role || 'membre';

            console.log(`Vérification : ${email} -> Rôle: ${role}`);

            // 4. URL de redirection
            const redirectUrl = getRedirectUrl(role);

            // 5. Logs pour débogage
            console.log("═══════════════════════════════════");
            console.log("🔐 CONNEXION UTILISATEUR");
            console.log("📧 Email:", email);
            console.log("🎭 Rôle détecté:", role);
            console.log("📍 Redirection vers:", redirectUrl);
            console.log("═══════════════════════════════════");

            // 6. Redirection
            router.push(redirectUrl);

        } catch (err: any) {
            console.error("❌ Erreur:", err);
            setError(err.message || "Email ou mot de passe incorrect");
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-[#146332] flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white border-4 border-black rounded-[2.5rem] p-10 shadow-[15px_15px_0px_0px_rgba(0,0,0,1)]">
                <div className="text-center mb-10">
                    <h1 className="text-3xl font-black text-[#146332] uppercase italic tracking-tighter">
                        BALIOU N'PADRA
                    </h1>
                    <div className="h-1.5 w-16 bg-black mx-auto mt-2"></div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] mt-4 text-gray-400">
                        Communauté Cheikh Yacouba Sylla
                    </p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    {error && (
                        <div className="bg-red-100 border-2 border-red-500 text-red-700 p-3 rounded-xl text-sm font-black text-center">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-[10px] font-black uppercase mb-2 ml-1 text-black">
                            Adresse Email
                        </label>
                        <input
                            type="email"
                            required
                            placeholder="votre@email.com"
                            className="w-full p-4 border-4 border-black rounded-2xl font-black bg-white text-black outline-none focus:ring-4 focus:ring-[#39ff14]/20 transition-all"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-black uppercase mb-2 ml-1 text-black">
                            Mot de passe
                        </label>
                        <input
                            type="password"
                            required
                            placeholder="••••••••"
                            className="w-full p-4 border-4 border-black rounded-2xl font-black bg-white text-black outline-none focus:ring-4 focus:ring-[#39ff14]/20 transition-all"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-black text-white py-5 font-black text-xl rounded-2xl hover:bg-[#146332] transition-all uppercase italic shadow-xl disabled:opacity-50"
                    >
                        {loading ? "CONNEXION..." : "ENTRER"}
                    </button>
                </form>

                <div className="mt-8 text-center border-t-2 border-gray-200 pt-6">
                    <button
                        onClick={() => router.push('/inscription')}
                        className="text-[10px] font-black uppercase underline hover:text-[#146332]"
                    >
                        Créer un nouveau compte membre
                    </button>
                </div>
            </div>
        </main>
    );
}