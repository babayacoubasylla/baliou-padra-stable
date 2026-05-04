"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Profile = {
    role: string | null;
    nom_complet?: string | null;
    email?: string | null;
    est_compte_gestion?: boolean | null;
};

export default function Navbar() {
    const pathname = usePathname();
    const router = useRouter();

    const [role, setRole] = useState<string | null>(null);
    const [session, setSession] = useState<any>(null);
    const [estCompteGestion, setEstCompteGestion] = useState<boolean>(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        const loadSessionAndProfile = async () => {
            setLoading(true);

            const {
                data: { session },
            } = await supabase.auth.getSession();

            if (!mounted) return;

            setSession(session);

            if (!session) {
                setRole(null);
                setEstCompteGestion(false);
                setLoading(false);
                return;
            }

            const { data: profile, error } = await supabase
                .from("membres")
                .select("role, nom_complet, email, est_compte_gestion")
                .eq("user_id", session.user.id)
                .maybeSingle();

            if (error) {
                console.error("Erreur Navbar profil:", error);
                setRole("membre");
                setEstCompteGestion(false);
            } else {
                setRole(profile?.role || "membre");
                setEstCompteGestion(Boolean(profile?.est_compte_gestion));
            }

            setLoading(false);
        };

        loadSessionAndProfile();

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
            if (!mounted) return;

            setSession(newSession);

            if (!newSession) {
                setRole(null);
                setEstCompteGestion(false);
                setLoading(false);
                return;
            }

            const { data: profile } = await supabase
                .from("membres")
                .select("role, est_compte_gestion")
                .eq("user_id", newSession.user.id)
                .maybeSingle();

            setRole(profile?.role || "membre");
            setEstCompteGestion(Boolean(profile?.est_compte_gestion));
            setLoading(false);
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setSession(null);
        setRole(null);
        setEstCompteGestion(false);
        router.push("/login");
    };

    const isActive = (path: string) => pathname === path;

    const linkClass = (path: string) =>
        `px-2 py-1 hover:text-[#39ff14] transition-all whitespace-nowrap ${isActive(path) ? "text-[#39ff14] underline" : ""
        }`;

    const isChefGeneration =
        role === "chef_gen" || role === "chef_generation";

    const isTresorier =
        role === "tresorier" || role === "tresorier_adjoint";

    const isComiteGeneration =
        role === "comite_com_gen" || role === "comite_com_adjoint";

    const isBureauCentral =
        role === "baliou_padra" || role === "super_admin";

    const canSeeDecisionStats =
        role === "baliou_padra" ||
        role === "responsable_bd" ||
        role === "agent_rh" ||
        role === "super_admin";

    /**
     * Les vrais membres voient leurs finances personnelles.
     * Cela inclut :
     * - membre
     * - chef_gen
     * - tresorier
     * - comite_com_gen
     *
     * Les comptes techniques ne sont pas cotisants.
     */
    const canSeePersonalFinances = session && !estCompteGestion;

    return (
        <nav className="bg-[#146332] text-white shadow-2xl sticky top-0 z-50 border-b-4 border-black font-black">
            <div className="max-w-7xl mx-auto px-4 h-20 flex justify-between items-center gap-4">
                {/* LOGO */}
                <Link href="/" className="text-xl uppercase italic whitespace-nowrap">
                    BALIOU <span className="text-[#39ff14]">PADRA</span>
                </Link>

                <div className="flex items-center gap-2 text-[9px] md:text-[10px] uppercase overflow-x-auto">
                    {/* Liens publics visibles pour tout le monde */}
                    <Link href="/actualites" className={linkClass("/actualites")}>
                        Actualités
                    </Link>

                    <Link href="/histoire" className={linkClass("/histoire")}>
                        Histoire
                    </Link>

                    <Link href="/bibliotheque" className={linkClass("/bibliotheque")}>
                        Bibliothèque
                    </Link>

                    {/* Visiteur non connecté */}
                    {!session && !loading && (
                        <>
                            <Link href="/inscription" className={linkClass("/inscription")}>
                                Inscription
                            </Link>

                            <Link
                                href="/login"
                                className="border-2 border-white px-4 py-2 rounded-lg hover:bg-white hover:text-[#146332] transition-all whitespace-nowrap"
                            >
                                Connexion
                            </Link>
                        </>
                    )}

                    {/* Utilisateur connecté */}
                    {session && (
                        <>
                            {/* État civil */}
                            {(role === "agent_civil" || role === "super_admin") && (
                                <Link
                                    href="/etat-civil"
                                    className="bg-orange-600 px-3 py-2 rounded-lg border-2 border-white text-white whitespace-nowrap"
                                >
                                    État Civil
                                </Link>
                            )}

                            {/* Gestion BD */}
                            {(role === "responsable_bd" || role === "super_admin") && (
                                <Link
                                    href="/gestion-base-donnees"
                                    className="bg-purple-800 px-3 py-2 rounded-lg border-2 border-white text-white whitespace-nowrap"
                                >
                                    Gestion BD
                                </Link>
                            )}

                            {/* Audit BD pour Bureau Central / Super Admin */}
                            {isBureauCentral && (
                                <Link
                                    href="/admin-central/audit"
                                    className="bg-purple-700 px-3 py-2 rounded-lg border-2 border-white text-white whitespace-nowrap"
                                >
                                    Audit BD
                                </Link>
                            )}

                            {/* Décision & Stats */}
                            {canSeeDecisionStats && (
                                <Link
                                    href="/annuaire"
                                    className="bg-blue-600 px-3 py-2 rounded-lg border-2 border-white text-white whitespace-nowrap"
                                >
                                    Décision & Stats
                                </Link>
                            )}

                            {/* Admin Central */}
                            {isBureauCentral && (
                                <Link
                                    href="/admin-central"
                                    className="bg-emerald-700 px-3 py-2 rounded-lg border-2 border-white text-white whitespace-nowrap"
                                >
                                    Admin Central
                                </Link>
                            )}

                            {/* Finances personnelles : membres + responsables de génération */}
                            {canSeePersonalFinances && (
                                <Link href="/finances" className={linkClass("/finances")}>
                                    Finances
                                </Link>
                            )}

                            {/* Espace Chef */}
                            {isChefGeneration && (
                                <Link
                                    href="/chef-gen/dashboard"
                                    className="text-yellow-400 px-2 py-1 whitespace-nowrap"
                                >
                                    Ma Génération
                                </Link>
                            )}

                            {/* Espace Trésorier */}
                            {isTresorier && (
                                <Link
                                    href="/tresorier/dashboard"
                                    className="text-yellow-400 px-2 py-1 whitespace-nowrap"
                                >
                                    Trésorerie Gen
                                </Link>
                            )}

                            {/* Espace Comité Communication */}
                            {isComiteGeneration && (
                                <Link
                                    href="/comite-com-gen/dashboard"
                                    className="text-yellow-400 px-2 py-1 whitespace-nowrap"
                                >
                                    Com. Gen
                                </Link>
                            )}

                            {/* Super Admin */}
                            {role === "super_admin" && (
                                <Link
                                    href="/admin-systeme"
                                    className="bg-red-600 px-3 py-2 rounded-lg border-2 border-white whitespace-nowrap"
                                >
                                    Root
                                </Link>
                            )}

                            {/* Mon Profil : visible pour TOUS les utilisateurs connectés */}
                            <Link
                                href="/profil"
                                className="border-2 border-[#39ff14] text-[#39ff14] px-3 py-2 rounded-lg whitespace-nowrap hover:bg-[#39ff14] hover:text-black transition-all"
                            >
                                Mon Profil
                            </Link>

                            {/* Sortir : visible pour TOUS les utilisateurs connectés */}
                            <button
                                onClick={handleLogout}
                                className="text-red-400 font-black ml-2 uppercase whitespace-nowrap hover:text-red-200"
                            >
                                Sortir
                            </button>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
}