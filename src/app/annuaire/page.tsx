"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Membre = {
    id: number;
    user_id?: string;

    nom_complet?: string | null;
    email?: string | null;
    nom_soninke?: string | null;
    petit_nom?: string | null;
    kah_tokho?: string | null;

    sexe?: string | null;
    generation?: string | null;
    ville_residence?: string | null;
    quartier?: string | null;
    telephone?: string | null;
    contact_urgence?: string | null;

    statut_professionnel?: string | null;
    situation_emploi?: string | null;

    domaine_activite?: string | null;
    metier?: string | null;

    niveau_etudes?: string | null;
    diplome?: string | null;

    role?: string | null;
    statut_validation?: string | null;
    created_at?: string | null;

    [key: string]: any;
};

type Stats = {
    recherche: number;
    projets: number;
    total: number;
    actifs: number;
};

const ROLES_AUTORISES = [
    "super_admin",
    "baliou_padra",
    "agent_rh",
    "responsable_bd",
];

const ROLES_TECHNIQUES_A_CACHER = [
    "super_admin",
    "baliou_padra",
    "agent_rh",
    "agent_civil",
    "responsable_bd",
    "admin_systeme",
    "admin_central",
];

function cleanValue(value: any): string {
    return (value ?? "").toString().trim();
}

function normalize(value: any): string {
    return cleanValue(value)
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function getSituationEmploi(membre: Membre): string {
    return (
        cleanValue(membre.situation_emploi) ||
        cleanValue(membre.statut_professionnel) ||
        "Non renseigné"
    );
}

function getMetier(membre: Membre): string {
    return (
        cleanValue(membre.metier) ||
        cleanValue(membre.domaine_activite) ||
        "Non renseigné"
    );
}

function getDiplome(membre: Membre): string {
    return (
        cleanValue(membre.diplome) ||
        cleanValue(membre.niveau_etudes) ||
        "Pas de diplôme renseigné"
    );
}

function getAlias(membre: Membre): string {
    return (
        cleanValue(membre.kah_tokho) ||
        cleanValue(membre.petit_nom) ||
        cleanValue(membre.nom_soninke) ||
        cleanValue(membre.generation)
    );
}

function getSituationClass(situation: string): string {
    const s = normalize(situation);

    if (s.includes("quete")) {
        return "bg-red-100 text-red-700";
    }

    if (
        s.includes("projet") ||
        s.includes("independant") ||
        s.includes("entrepreneur")
    ) {
        return "bg-yellow-100 text-yellow-700";
    }

    if (s === "en emploi" || (s.includes("emploi") && !s.includes("quete"))) {
        return "bg-green-100 text-green-700";
    }

    if (s.includes("etudiant")) {
        return "bg-blue-100 text-blue-700";
    }

    return "bg-gray-100 text-gray-700";
}

function calculerStats(data: Membre[]): Stats {
    return {
        recherche: data.filter((m) => {
            const s = normalize(getSituationEmploi(m));
            return s.includes("quete");
        }).length,

        projets: data.filter((m) => {
            const s = normalize(getSituationEmploi(m));
            return (
                s.includes("projet") ||
                s.includes("independant") ||
                s.includes("entrepreneur")
            );
        }).length,

        actifs: data.filter((m) => {
            const s = normalize(getSituationEmploi(m));
            return s === "en emploi" || (s.includes("emploi") && !s.includes("quete"));
        }).length,

        total: data.length,
    };
}

export default function DashboardRH() {
    const [membres, setMembres] = useState<Membre[]>([]);
    const [recherche, setRecherche] = useState("");
    const [chargement, setChargement] = useState(true);
    const [roleUtilisateur, setRoleUtilisateur] = useState<string | null>(null);
    const [stats, setStats] = useState<Stats>({
        recherche: 0,
        projets: 0,
        total: 0,
        actifs: 0,
    });

    const router = useRouter();

    useEffect(() => {
        const verifierEtCharger = async () => {
            setChargement(true);

            const {
                data: { user },
                error: userError,
            } = await supabase.auth.getUser();

            if (userError) {
                console.error("Erreur Auth:", userError);
            }

            if (!user) {
                router.push("/login");
                return;
            }

            const { data: profil, error: profilError } = await supabase
                .from("membres")
                .select("role, nom_complet, email")
                .eq("user_id", user.id)
                .maybeSingle();

            if (profilError) {
                console.error("Erreur profil:", profilError);
                alert("Erreur lors de la vérification de vos droits.");
                router.push("/profil");
                return;
            }

            const role = profil?.role || "";
            setRoleUtilisateur(role);

            // ✅ Autorisation ajoutée ici : responsable_bd
            if (!ROLES_AUTORISES.includes(role)) {
                alert(
                    "Accès confidentiel : seuls le Comité Emploi, le Conseil, les administrateurs et les Responsables BD peuvent consulter cet espace."
                );
                router.push("/profil");
                return;
            }

            const { data, error } = await supabase
                .from("membres")
                .select("*")
                .order("nom_complet", { ascending: true });

            if (error) {
                console.error("Erreur chargement membres:", error);
                alert("Erreur lors du chargement des données.");
                setChargement(false);
                return;
            }

            const liste = (data || []) as Membre[];

            // On cache les comptes techniques dans la liste RH/Stats,
            // mais les rôles autorisés peuvent quand même consulter la page.
            const membresVisibles = liste.filter((m) => {
                const roleMembre = cleanValue(m.role);
                return !ROLES_TECHNIQUES_A_CACHER.includes(roleMembre);
            });

            setMembres(membresVisibles);
            setStats(calculerStats(membresVisibles));
            setChargement(false);
        };

        verifierEtCharger();
    }, [router]);

    const membresFiltres = membres.filter((m) => {
        const q = normalize(recherche);

        if (!q) return true;

        const champs = [
            m.nom_complet,
            m.email,
            m.nom_soninke,
            m.petit_nom,
            m.kah_tokho,
            m.generation,
            m.ville_residence,
            m.quartier,
            m.telephone,
            m.contact_urgence,
            getSituationEmploi(m),
            getMetier(m),
            getDiplome(m),
        ];

        return champs.some((champ) => normalize(champ).includes(q));
    });

    const homeHref =
        roleUtilisateur === "responsable_bd"
            ? "/gestion-base-donnees"
            : roleUtilisateur === "super_admin"
                ? "/admin-systeme"
                : "/admin-central";

    if (chargement) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center font-black text-black">
                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-green-700 mr-4"></div>
                CHARGEMENT DES DONNÉES...
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-white p-4 md:p-12 text-black">
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

            {/* HEADER */}
            <header className="mb-10 border-b-8 border-black pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link
                        href={homeHref}
                        className="bg-black text-white p-3 rounded-xl border-2 border-black hover:bg-white hover:text-black transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                    >
                        🏠
                    </Link>

                    <div>
                        <h1 className="text-3xl md:text-4xl font-black text-blue-700 uppercase italic tracking-tighter">
                            Décision & Stats
                        </h1>
                        <p className="font-bold text-xs uppercase text-black/60">
                            Comité RH · Conseil · Responsable BD
                        </p>
                    </div>
                </div>

                {/* Barre de recherche */}
                <div className="relative max-w-md w-full">
                    <input
                        type="text"
                        placeholder="Rechercher un membre, métier, diplôme, ville..."
                        value={recherche}
                        className="w-full px-6 py-3 rounded-2xl border-2 border-black shadow-sm focus:border-blue-600 outline-none transition-all pl-12 font-bold"
                        onChange={(e) => setRecherche(e.target.value)}
                    />
                    <span className="absolute left-4 top-3.5 text-xl">🔍</span>
                </div>
            </header>

            {/* CARTES STATISTIQUES */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                <div className="border-4 border-black p-6 bg-red-50 rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                    <p className="font-black uppercase text-xs">En quête d'emploi</p>
                    <p className="text-5xl font-black mt-2">{stats.recherche}</p>
                </div>

                <div className="border-4 border-black p-6 bg-yellow-50 rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                    <p className="font-black uppercase text-xs">
                        Indépendants / Projets
                    </p>
                    <p className="text-5xl font-black mt-2">{stats.projets}</p>
                </div>

                <div className="border-4 border-black p-6 bg-green-50 rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                    <p className="font-black uppercase text-xs">En emploi</p>
                    <p className="text-5xl font-black mt-2">{stats.actifs}</p>
                </div>

                <div className="border-4 border-black p-6 bg-blue-50 rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                    <p className="font-black uppercase text-xs">Total membres</p>
                    <p className="text-5xl font-black mt-2">{stats.total}</p>
                </div>
            </div>

            {/* LISTE DÉTAILLÉE POUR ACTION RH */}
            <div className="border-4 border-black rounded-[2.5rem] overflow-hidden bg-white shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-black text-white uppercase text-[10px] font-black">
                            <tr>
                                <th className="p-6">Membre</th>
                                <th className="p-6">Situation</th>
                                <th className="p-6">Métier / Diplôme</th>
                                <th className="p-6">Contact</th>
                                <th className="p-6 text-right">Ville / Génération</th>
                            </tr>
                        </thead>

                        <tbody className="divide-y-2 divide-black">
                            {membresFiltres.map((m) => {
                                const situation = getSituationEmploi(m);

                                return (
                                    <tr
                                        key={m.id}
                                        className="font-bold hover:bg-slate-50 transition-colors"
                                    >
                                        <td className="p-6">
                                            <span className="font-black">
                                                {m.nom_complet || "Nom non renseigné"}
                                            </span>
                                            <br />
                                            <span className="text-blue-600 text-[10px] italic">
                                                {getAlias(m) || "Aucun alias"}
                                            </span>
                                            <br />
                                            <span className="text-gray-500 text-[10px]">
                                                {m.email || "Email non renseigné"}
                                            </span>
                                        </td>

                                        <td className="p-6">
                                            <span
                                                className={`inline-block px-3 py-1 rounded-full text-[9px] border border-black uppercase font-black ${getSituationClass(
                                                    situation
                                                )}`}
                                            >
                                                {situation}
                                            </span>
                                        </td>

                                        <td className="p-6 text-xs">
                                            <span className="font-black">
                                                {getMetier(m)}
                                            </span>
                                            <br />
                                            <span className="opacity-50 text-[9px]">
                                                {getDiplome(m)}
                                            </span>
                                        </td>

                                        <td className="p-6 font-black text-green-700 text-sm">
                                            {m.telephone || "Non renseigné"}
                                            {m.contact_urgence && (
                                                <>
                                                    <br />
                                                    <span className="text-[9px] text-gray-500">
                                                        Urgence : {m.contact_urgence}
                                                    </span>
                                                </>
                                            )}
                                        </td>

                                        <td className="p-6 text-right text-xs">
                                            📍 {m.ville_residence || "Ville non renseignée"}
                                            <br />
                                            <span className="text-gray-500 text-[10px]">
                                                {m.generation || "Génération non renseignée"}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* SI AUCUN RÉSULTAT */}
            {membresFiltres.length === 0 && (
                <div className="text-center py-20 bg-white rounded-[3rem] shadow-inner border-4 border-dashed border-gray-300 mt-8">
                    <span className="text-6xl block mb-4 text-gray-500">🔍</span>
                    <p className="text-xl font-bold text-gray-600">
                        Aucun membre trouvé pour cette recherche.
                    </p>
                </div>
            )}

            {/* INFOS ACCÈS */}
            <div className="mt-8 bg-blue-50 border-4 border-black rounded-3xl p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                <p className="font-black uppercase text-xs text-blue-800">
                    Accès autorisé aux rôles :
                </p>
                <p className="text-sm font-bold mt-2">
                    Super Admin · Bureau Central · Comité RH · Responsable BD
                </p>
            </div>
        </main>
    );
}