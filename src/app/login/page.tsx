"use client";
import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // 1. Authentification
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });

            if (authError) throw authError;

            if (authData.user) {
                // 2. Recherche du profil (On utilise maybeSingle pour éviter l'erreur)
                const { data: profile, error: profileError } = await supabase
                    .from('membres')
                    .select('role')
                    .eq('user_id', authData.user.id)
                    .maybeSingle();

                if (profileError) throw profileError;

                // 3. Si le profil n'existe pas encore, on le crée en urgence
                if (!profile) {
                    console.log("Profil manquant, création automatique...");
                    await supabase.from('membres').insert([{
                        user_id: authData.user.id,
                        email: email,
                        nom_complet: email.split('@')[0],
                        role: 'membre',
                        est_valide: true
                    }]);
                    router.push('/dashboard');
                    return;
                }

                // 4. Redirection selon le rôle (Cerveau du login)
                const role = profile.role;

                if (role === 'super_admin') {
                    router.push('/admin-systeme');
                } else if (role === 'baliou_padra') {
                    router.push('/admin-central'); // <--- Ils iront ici
                } else if (role === 'agent_civil') {
                    router.push('/etat-civil');
                } else {
                    router.push('/dashboard');
                }
            }
        } catch (err: any) {
            alert("Erreur de connexion : " + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-[#146332] flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white border-4 border-black rounded-[2.5rem] p-10 shadow-[15px_15px_0px_0px_rgba(0,0,0,1)]">
                <div className="text-center mb-10">
                    <h1 className="text-4xl font-black text-[#146332] uppercase italic italic tracking-tighter">BALIOU PADRA</h1>
                    <div className="h-1.5 w-20 bg-black mx-auto mt-2"></div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] mt-4 text-gray-400">Espace Privé Sécurisé</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="block text-[10px] font-black uppercase mb-2 ml-1 text-black">Adresse Email</label>
                        <input
                            type="email"
                            placeholder="votre@email.com"
                            required
                            className="w-full p-4 border-4 border-black rounded-2xl font-black bg-white text-black outline-none focus:ring-4 focus:ring-[#39ff14]/20 transition-all"
                            onChange={e => setEmail(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black uppercase mb-2 ml-1 text-black">Mot de passe</label>
                        <input
                            type="password"
                            placeholder="••••••••"
                            required
                            className="w-full p-4 border-4 border-black rounded-2xl font-black bg-white text-black outline-none focus:ring-4 focus:ring-[#39ff14]/20 transition-all"
                            onChange={e => setPassword(e.target.value)}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-black text-white py-5 font-black text-xl rounded-2xl hover:bg-[#146332] transition-all uppercase italic shadow-xl active:scale-95 disabled:opacity-50"
                    >
                        {loading ? "VÉRIFICATION..." : "ENTRER"}
                    </button>
                </form>

                <p className="mt-10 text-center font-black text-[9px] uppercase tracking-widest text-gray-400">
                    ALLAH KANE — GNAMARIYE BATIYE — KABEHI TOKHË
                </p>
            </div>
        </main>
    );
}