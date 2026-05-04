"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Membre = {
    id: number;
    user_id: string;
    email: string | null;

    nom_complet: string | null;
    nom_soninke?: string | null;
    petit_nom?: string | null;

    sexe?: string | null;
    generation?: string | null;
    ville_residence?: string | null;
    quartier?: string | null;
    telephone?: string | null;
    contact_urgence?: string | null;

    pere_nom_civil?: string | null;
    pere_nom_soninke?: string | null;
    pere_petit_nom?: string | null;

    mere_nom_civil?: string | null;
    mere_nom_soninke?: string | null;
    mere_petit_nom?: string | null;

    statut_matrimonial?: string | null;
    etat_scolarisation?: string | null;
    niveau_etudes?: string | null;
    statut_professionnel?: string | null;
    domaine_activite?: string | null;

    role?: string | null;
    statut_validation?: string | null;
    est_compte_gestion?: boolean | null;

    created_at?: string | null;
    updated_at?: string | null;
};

type Cotisation = {
    id: string;
    montant: number | string | null;
    type_cotisation?: string | null;
    date_paiement?: string | null;
    created_at?: string | null;
};

export default function ProfilPage() {
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<Membre | null>(null);
    const [cotisations, setCotisations] = useState<Cotisation[]>([]);
    const [stats, setStats] = useState({
        total: 0,
        nombrePaiements: 0,
        sibiti: 0,
        mensualite: 0,
        autres: 0,
        devouement: 0,
    });

    useEffect(() => {
        loadProfile();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const cleanValue = (value: any): string => {
        return (value ?? "").toString().trim();
    };

    const numberValue = (value: any): number => {
        const n = Number(value || 0);
        return Number.isFinite(n) ? n : 0;
    };

    const formatMontant = (montant: any): string => {
        return new Intl.NumberFormat("fr-FR").format(numberValue(montant)) + " FCFA";
    };

    const formatDate = (date?: string | null): string => {
        if (!date) return "—";

        try {
            return new Date(date).toLocaleDateString("fr-FR");
        } catch {
            return "—";
        }
    };

    const getRoleLabel = (role?: string | null): string => {
        switch (cleanValue(role)) {
            case "super_admin":
                return "Super Admin";
            case "baliou_padra":
                return "Bureau Central";
            case "responsable_bd":
                return "Responsable BD";
            case "agent_rh":
                return "Agent RH";
            case "agent_civil":
                return "Agent État Civil";
            case "chef_gen":
            case "chef_generation":
                return "Chef de génération";
            case "tresorier":
                return "Trésorier";
            case "tresorier_adjoint":
                return "Trésorier adjoint";
            case "comite_com_gen":
                return "Comité communication génération";
            case "comite_com_adjoint":
                return "Comité communication adjoint";
            case "comite_com_central":
                return "Comité communication central";
            case "membre":
            default:
                return "Membre";
        }
    };

    const getStatutLabel = (statut?: string | null): string => {
        switch (cleanValue(statut || "en_attente")) {
            case "valide":
                return "Validé";
            case "rejete":
                return "Rejeté";
            case "suspendu":
                return "Suspendu";
            case "inactif":
                return "Inactif";
            case "en_attente":
            default:
                return "En attente";
        }
    };

    const getStatutClass = (statut?: string | null): string => {
        const value = cleanValue(statut || "en_attente");

        if (value === "valide") return "bg-green-100 text-green-800 border-green-700";
        if (value === "rejete") return "bg-red-100 text-red-800 border-red-700";
        if (value === "suspendu") return "bg-orange-100 text-orange-800 border-orange-700";

        return "bg-yellow-100 text-yellow-800 border-yellow-700";
    };

    const loadProfile = async () => {
        setLoading(true);

        const {
            data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
            router.push("/login");
            return;
        }

        const { data, error } = await supabase
            .from("membres")
            .select("*")
            .eq("user_id", session.user.id)
            .maybeSingle();

        if (error) {
            console.error("Erreur profil:", error);
            alert("Erreur chargement profil : " + error.message);
            setLoading(false);
            return;
        }

        if (!data) {
            alert("Profil introuvable.");
            router.push("/login");
            return;
        }

        setProfile(data as Membre);

        if (!data.est_compte_gestion) {
            await loadCotisations(data.id);
        }

        setLoading(false);
    };

    const loadCotisations = async (membreId: number) => {
        const { data, error } = await supabase
            .from("cotisations")
            .select("*")
            .eq("membre_id", membreId)
            .order("date_paiement", { ascending: false });

        if (error) {
            console.warn("Erreur cotisations profil:", error.message);
            setCotisations([]);
            return;
        }

        const list = (data || []) as Cotisation[];

        setCotisations(list);

        let sibiti = 0;
        let mensualite = 0;
        let autres = 0;

        list.forEach((c) => {
            const type = cleanValue(c.type_cotisation).toLowerCase();
            const montant = numberValue(c.montant);

            if (type.includes("sibity") || type.includes("sibiti")) {
                sibiti += montant;
            } else if (type.includes("mensualite") || type.includes("mensualité")) {
                mensualite += montant;
            } else {
                autres += montant;
            }
        });

        const total = sibiti + mensualite + autres;

        /**
         * Jauge de dévouement simple :
         * - base de départ : total payé sur objectif indicatif de 50 000 FCFA
         * - plafonnée à 100 %
         * Cette logique pourra être affinée plus tard.
         */
        const objectifDevouement = 50000;
        const devouement = Math.min((total / objectifDevouement) * 100, 100);

        setStats({
            total,
            nombrePaiements: list.length,
            sibiti,
            mensualite,
            autres,
            devouement,
        });
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/login");
    };

    const goToDashboard = () => {
        router.push("/dashboard");
    };

    if (loading) {
        return (
            <main className="min-h-screen bg-white flex items-center justify-center p-6 text-black">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-14 w-14 border-4 border-[#146332] border-t-transparent mx-auto mb-4"></div>
                    <p className="font-black text-xl">Chargement du profil...</p>
                </div>
            </main>
        );
    }

    if (!profile) {
        return (
            <main className="min-h-screen bg-white flex items-center justify-center p-6 text-black">
                <div className="text-center">
                    <h1 className="text-2xl font-black text-red-600">
                        Profil introuvable
                    </h1>
                    <button
                        onClick={() => router.push("/login")}
                        className="mt-4 bg-black text-white px-6 py-3 rounded-xl font-black"
                    >
                        Retour connexion
                    </button>
                </div>
            </main>
        );
    }

    const isCompteGestion = Boolean(profile.est_compte_gestion);

    return (
        <main className="min-h-screen bg-slate-50 p-4 md:p-10 text-black">
            <div className="max-w-7xl mx-auto">
                <header className="mb-10 border-b-4 border-black pb-6 flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div>
                        <h1 className="text-4xl font-black uppercase italic text-[#146332]">
                            Mon Profil
                        </h1>

                        <p className="font-bold text-gray-500 mt-2">
                            Informations personnelles et suivi communautaire
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={goToDashboard}
                            className="bg-[#146332] text-white px-5 py-3 rounded-xl font-black uppercase border-2 border-black"
                        >
                            Accéder à mon espace
                        </button>

                        {!isCompteGestion && (
                            <button
                                onClick={() => router.push("/finances")}
                                className="bg-white text-blue-700 px-5 py-3 rounded-xl font-black uppercase border-2 border-blue-700"
                            >
                                Mes finances
                            </button>
                        )}

                        <Link
                            href="/profil/editer"
                            className="bg-white text-black px-5 py-3 rounded-xl font-black uppercase border-2 border-black"
                        >
                            Modifier
                        </Link>

                        <button
                            onClick={handleLogout}
                            className="bg-red-600 text-white px-5 py-3 rounded-xl font-black uppercase border-2 border-black"
                        >
                            Sortir
                        </button>
                    </div>
                </header>

                <section className="bg-white border-4 border-black rounded-[2rem] p-6 md:p-8 mb-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.08)]">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                        <div>
                            <h2 className="text-3xl font-black text-[#146332]">
                                {profile.nom_complet || "Nom non renseigné"}
                            </h2>

                            <p className="font-bold text-gray-600 mt-1">
                                {profile.email}
                            </p>

                            <div className="flex flex-wrap gap-3 mt-4">
                                <span className="bg-black text-white px-4 py-2 rounded-full text-xs font-black uppercase">
                                    {getRoleLabel(profile.role)}
                                </span>

                                {profile.generation && (
                                    <span className="bg-[#39ff14] text-black px-4 py-2 rounded-full text-xs font-black uppercase">
                                        {profile.generation}
                                    </span>
                                )}

                                <span
                                    className={`border-2 px-4 py-2 rounded-full text-xs font-black uppercase ${getStatutClass(
                                        profile.statut_validation
                                    )}`}
                                >
                                    {getStatutLabel(profile.statut_validation)}
                                </span>

                                {isCompteGestion && (
                                    <span className="bg-orange-100 text-orange-800 border-2 border-orange-700 px-4 py-2 rounded-full text-xs font-black uppercase">
                                        Compte de gestion
                                    </span>
                                )}
                            </div>
                        </div>

                        {!isCompteGestion && (
                            <div className="bg-green-50 border-4 border-[#146332] rounded-2xl p-5 min-w-[260px]">
                                <p className="text-xs font-black uppercase text-gray-500">
                                    Dévouement communautaire
                                </p>

                                <p className="text-3xl font-black text-[#146332] mt-1">
                                    {stats.devouement.toFixed(0)}%
                                </p>

                                <div className="w-full h-4 bg-gray-200 border-2 border-black rounded-full overflow-hidden mt-3">
                                    <div
                                        className="h-full bg-[#39ff14]"
                                        style={{ width: `${stats.devouement}%` }}
                                    ></div>
                                </div>

                                <p className="text-xs font-bold text-gray-500 mt-2">
                                    Basé sur les cotisations enregistrées.
                                </p>
                            </div>
                        )}
                    </div>
                </section>

                {!isCompteGestion && (
                    <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <StatCard title="Total cotisé" value={formatMontant(stats.total)} icon="💰" />
                        <StatCard title="Sibiti" value={formatMontant(stats.sibiti)} icon="📿" />
                        <StatCard title="Mensualités" value={formatMontant(stats.mensualite)} icon="📅" />
                        <StatCard title="Paiements" value={stats.nombrePaiements} icon="🧾" />
                    </section>
                )}

                <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    <InfoSection
                        title="1. Identité"
                        items={[
                            ["Nom complet", profile.nom_complet],
                            ["Nom Soninké", profile.nom_soninke],
                            ["Petit nom", profile.petit_nom],
                            ["Sexe", profile.sexe === "M" ? "Homme" : profile.sexe === "F" ? "Femme" : profile.sexe],
                            ["Email", profile.email],
                        ]}
                    />

                    <InfoSection
                        title="2. Localisation et contact"
                        items={[
                            ["Génération", profile.generation],
                            ["Ville", profile.ville_residence],
                            ["Quartier / Commune", profile.quartier],
                            ["Téléphone", profile.telephone],
                            ["Contact urgence", profile.contact_urgence],
                        ]}
                    />

                    <InfoSection
                        title="3. Filiation - Père"
                        items={[
                            ["Nom père état civil", profile.pere_nom_civil],
                            ["Nom père Soninké", profile.pere_nom_soninke],
                            ["Petit nom père", profile.pere_petit_nom],
                        ]}
                    />

                    <InfoSection
                        title="3. Filiation - Mère"
                        items={[
                            ["Nom mère état civil", profile.mere_nom_civil],
                            ["Nom mère Soninké", profile.mere_nom_soninke],
                            ["Petit nom mère", profile.mere_petit_nom],
                        ]}
                    />

                    <InfoSection
                        title="4. Situation sociale"
                        items={[
                            ["Statut matrimonial", profile.statut_matrimonial],
                            ["État scolarisation", profile.etat_scolarisation],
                            ["Niveau d'études", profile.niveau_etudes],
                        ]}
                    />

                    <InfoSection
                        title="5. Situation professionnelle"
                        items={[
                            ["Statut professionnel", profile.statut_professionnel],
                            ["Domaine d'activité", profile.domaine_activite],
                        ]}
                    />
                </section>

                {!isCompteGestion && (
                    <section className="bg-white border-4 border-black rounded-[2rem] overflow-hidden mb-8">
                        <div className="bg-black text-white p-4">
                            <h2 className="font-black uppercase text-sm">
                                🧾 Derniers paiements
                            </h2>
                        </div>

                        {cotisations.length === 0 ? (
                            <div className="p-10 text-center font-bold text-gray-500 italic">
                                Aucun paiement enregistré pour le moment.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-100 text-xs uppercase">
                                        <tr>
                                            <th className="p-4 font-black">Date</th>
                                            <th className="p-4 font-black">Type</th>
                                            <th className="p-4 font-black text-right">Montant</th>
                                            <th className="p-4 font-black">Statut</th>
                                        </tr>
                                    </thead>

                                    <tbody className="divide-y-2 divide-gray-200">
                                        {cotisations.slice(0, 5).map((c) => (
                                            <tr key={c.id}>
                                                <td className="p-4 font-bold">
                                                    {formatDate(c.date_paiement || c.created_at)}
                                                </td>

                                                <td className="p-4 font-black">
                                                    {cleanValue(c.type_cotisation) || "Cotisation"}
                                                </td>

                                                <td className="p-4 text-right font-black text-green-700">
                                                    {formatMontant(c.montant)}
                                                </td>

                                                <td className="p-4">
                                                    <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-black uppercase">
                                                        {c.statut || "valide"}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <div className="p-4 text-right">
                            <button
                                onClick={() => router.push("/finances")}
                                className="bg-[#146332] text-white px-5 py-3 rounded-xl font-black uppercase text-xs"
                            >
                                Voir le détail financier
                            </button>
                        </div>
                    </section>
                )}

                <footer className="text-right">
                    <p className="text-xs text-gray-400 font-black uppercase">
                        Profil membre — Baliou Padra
                    </p>
                </footer>
            </div>
        </main>
    );
}

function InfoSection({
    title,
    items,
}: {
    title: string;
    items: Array<[string, any]>;
}) {
    const cleanValue = (value: any): string => {
        return (value ?? "").toString().trim();
    };

    return (
        <div className="bg-white border-4 border-black rounded-2xl p-5">
            <h3 className="text-[#146332] font-black uppercase text-sm mb-4">
                {title}
            </h3>

            <div className="space-y-3">
                {items.map(([label, value]) => (
                    <div key={label} className="border-b border-gray-200 pb-2">
                        <p className="text-[10px] text-gray-500 uppercase font-black">
                            {label}
                        </p>
                        <p className="font-bold text-black mt-1">
                            {cleanValue(value) || "—"}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}

function StatCard({
    title,
    value,
    icon,
}: {
    title: string;
    value: string | number;
    icon: string;
}) {
    return (
        <div className="bg-white border-4 border-black rounded-2xl p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.08)]">
            <div className="text-3xl mb-2">{icon}</div>

            <p className="text-xl font-black text-black">{value}</p>

            <p className="text-xs font-black uppercase text-gray-500 mt-1">
                {title}
            </p>
        </div>
    );
}