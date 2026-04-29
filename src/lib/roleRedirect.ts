export function getRoleRedirectPath(role?: string | null): string {
    const cleanRole = (role || "").trim();

    switch (cleanRole) {
        case "super_admin":
            return "/admin-systeme";

        case "baliou_padra":
            return "/admin-central";

        case "responsable_bd":
            return "/gestion-base-donnees";

        case "agent_rh":
            return "/annuaire";

        case "agent_civil":
            return "/etat-civil";

        case "chef_gen":
        case "chef_generation":
            return "/chef-gen/dashboard";

        case "tresorier":
            return "/tresorier/dashboard";

        case "comite_com_gen":
            return "/comite-com-gen/dashboard";

        case "comite_com_central":
            return "/admin-central";

        case "membre":
        default:
            return "/profil";
    }
}