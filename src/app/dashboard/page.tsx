"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getRoleRedirectPath } from "@/lib/roleRedirect";

export default function DashboardHub() {
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);

    useEffect(() => {
        checkAuthAndRedirect();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const checkAuthAndRedirect = async () => {
        try {
            console.log("🔎 Dashboard : vérification session...");

            const {
                data: { session },
                error: sessionError,
            } = await supabase.auth.getSession();

            if (sessionError) {
                throw sessionError;
            }

            if (!session) {
                console.log("❌ Aucune session, redirection vers login");
                router.replace("/login");
                return;
            }

            console.log("✅ Session trouvée :", session.user.email);

            const { data: profileData, error: profileError } = await supabase
                .from("membres")
                .select("role, generation, nom_complet, email")
                .eq("user_id", session.user.id)
                .maybeSingle();

            if (profileError) {
                console.error("❌ Erreur Hub Profil:", profileError);
                throw profileError;
            }

            if (!profileData) {
                setError("Profil membre introuvable dans la base de données.");
                setLoading(false);
                return;
            }

            const role = profileData?.role || "membre";
            const target = getRoleRedirectPath(role);

            console.log("👤 HUB - Utilisateur:", session.user.email);
            console.log("🔐 HUB - Rôle détecté:", role);
            console.log("➡️ HUB - Destination:", target);

            setProfile(profileData);
            setUser(session.user);

            /**
             * IMPORTANT :
             * On redirige seulement les rôles spéciaux.
             * Les membres simples restent sur ce dashboard pour ne pas supprimer l'existant.
             */
            const rolesQuiDoiventEtreRediriges = [
                "super_admin",
                "baliou_padra",
                "responsable_bd",
                "agent_rh",
                "agent_civil",
                "chef_gen",
                "chef_generation",
                "tresorier",
                "comite_com_gen",
                "comite_com_central",
            ];

            if (rolesQuiDoiventEtreRediriges.includes(role)) {
                router.replace(target);
                return;
            }

            // Membre simple : on affiche le dashboard existant
            setLoading(false);
        } catch (err: any) {
            console.error("❌ Erreur dashboard:", err);
            setError(err.message || "Une erreur est survenue lors de la vérification.");
            setLoading(false);
        }
    };

    const logout = async () => {
        await supabase.auth.signOut();
        router.replace("/login");
    };

    if (error) {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center text-black">
                <div className="bg-red-50 border-4 border-red-600 p-10 rounded-[2.5rem] shadow-2xl max-w-md">
                    <div className="text-6xl mb-6">⚠️</div>

                    <h1 className="text-2xl font-black text-red-600 uppercase mb-4">
                        Erreur de liaison
                    </h1>

                    <p className="mt-2 font-bold text-gray-700">{error}</p>

                    <div className="flex gap-4 justify-center mt-8">
                        <button
                            onClick={() => window.location.reload()}
                            className="px-6 py-3 bg-black text-white font-black rounded-xl hover:bg-red-700 transition-all active:scale-95"
                        >
                            Réessayer
                        </button>

                        <button
                            onClick={() => router.replace("/login")}
                            className="px-6 py-3 border-2 border-black font-black rounded-xl hover:bg-gray-100 transition-all active:scale-95"
                        >
                            Connexion
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center font-black uppercase text-[#146332]">
                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[#146332] mb-6"></div>
                <p className="text-lg tracking-wider">Analyse de vos accès...</p>
                <p className="text-xs text-gray-400 mt-2">Redirection selon votre rôle</p>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-slate-50 p-4 md:p-12 text-black">
            <div className="max-w-5xl mx-auto">
                <header className="mb-12 border-b-4 border-black pb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-4xl font-black text-[#146332] uppercase italic">
                            Tableau de Bord
                        </h1>

                        <p className="font-bold text-gray-500 uppercase text-xs tracking-widest mt-2">
                            Bienvenue{" "}
                            {profile?.nom_complet ||
                                user?.email?.split("@")[0] ||
                                "membre"}
                            {profile?.generation ? ` • ${profile.generation}` : ""}
                        </p>

                        <p className="font-bold text-gray-400 uppercase text-[10px] tracking-widest mt-1">
                            Rôle : {profile?.role || "membre"}
                        </p>
                    </div>

                    <button
                        onClick={logout}
                        className="px-6 py-3 border-2 border-red-600 text-red-600 font-black rounded-xl hover:bg-red-600 hover:text-white transition-all uppercase text-xs"
                    >
                        Sortir
                    </button>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Link
                        href="/profil"
                        className="bg-white border-4 border-black rounded-2xl p-6 hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,0.1)] transition-all"
                    >
                        <div className="text-4xl mb-3">👤</div>
                        <h2 className="font-black text-xl">Mon Profil</h2>
                        <p className="text-sm text-gray-600 mt-1">
                            Consulter et modifier mes informations
                        </p>
                    </Link>

                    <Link
                        href="/annuaire"
                        className="bg-white border-4 border-black rounded-2xl p-6 hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,0.1)] transition-all"
                    >
                        <div className="text-4xl mb-3">📇</div>
                        <h2 className="font-black text-xl">Annuaire</h2>
                        <p className="text-sm text-gray-600 mt-1">
                            Voir les membres de la communauté
                        </p>
                    </Link>

                    <Link
                        href="/bibliotheque"
                        className="bg-white border-4 border-black rounded-2xl p-6 hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,0.1)] transition-all"
                    >
                        <div className="text-4xl mb-3">📚</div>
                        <h2 className="font-black text-xl">Bibliothèque</h2>
                        <p className="text-sm text-gray-600 mt-1">
                            Accès aux documents et archives
                        </p>
                    </Link>

                    <Link
                        href="/histoire"
                        className="bg-white border-4 border-black rounded-2xl p-6 hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,0.1)] transition-all"
                    >
                        <div className="text-4xl mb-3">📜</div>
                        <h2 className="font-black text-xl">Histoire</h2>
                        <p className="text-sm text-gray-600 mt-1">
                            Découvrir l'histoire de la communauté
                        </p>
                    </Link>

                    <Link
                        href="/finances"
                        className="bg-white border-4 border-black rounded-2xl p-6 hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,0.1)] transition-all"
                    >
                        <div className="text-4xl mb-3">💰</div>
                        <h2 className="font-black text-xl">Mes Finances</h2>
                        <p className="text-sm text-gray-600 mt-1">
                            Suivi de mes cotisations
                        </p>
                    </Link>

                    <Link
                        href="/actualites"
                        className="bg-white border-4 border-black rounded-2xl p-6 hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,0.1)] transition-all"
                    >
                        <div className="text-4xl mb-3">📰</div>
                        <h2 className="font-black text-xl">Actualités</h2>
                        <p className="text-sm text-gray-600 mt-1">
                            Suivre les annonces de la communauté
                        </p>
                    </Link>
                </div>

                <div className="mt-10 bg-white border-4 border-black rounded-2xl p-6">
                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
                        ALLAH KANE — GNAMARIYE BATIYE — KABEHI TOKHË
                    </p>
                </div>
            </div>
        </main>
    );
}