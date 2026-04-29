"use client";

import { useEffect, useState } from "react";

export default function InstallAppButton() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [canInstall, setCanInstall] = useState(false);

    useEffect(() => {
        const handler = (event: any) => {
            event.preventDefault();
            setDeferredPrompt(event);
            setCanInstall(true);
        };

        window.addEventListener("beforeinstallprompt", handler);

        return () => {
            window.removeEventListener("beforeinstallprompt", handler);
        };
    }, []);

    const installerApp = async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();

        const result = await deferredPrompt.userChoice;

        if (result.outcome === "accepted") {
            console.log("Application installée");
        } else {
            console.log("Installation refusée");
        }

        setDeferredPrompt(null);
        setCanInstall(false);
    };

    if (!canInstall) return null;

    return (
        <button
            onClick={installerApp}
            className="fixed bottom-24 left-4 z-50 bg-[#39ff14] text-black border-4 border-black px-5 py-3 rounded-2xl font-black uppercase text-xs shadow-xl hover:bg-black hover:text-white transition-all"
        >
            📲 Installer l’application
        </button>
    );
}