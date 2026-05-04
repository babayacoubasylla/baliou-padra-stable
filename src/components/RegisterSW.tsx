"use client";

import { useEffect } from "react";

export default function RegisterSW() {
    useEffect(() => {
        if (typeof window === "undefined") return;

        // En développement, on désactive le service worker
        // pour éviter le cache qui bloque les nouvelles pages.
        if (process.env.NODE_ENV !== "production") {
            if ("serviceWorker" in navigator) {
                navigator.serviceWorker.getRegistrations().then((registrations) => {
                    registrations.forEach((registration) => {
                        registration.unregister();
                    });
                });
            }

            return;
        }

        // En production uniquement
        if ("serviceWorker" in navigator) {
            window.addEventListener("load", () => {
                navigator.serviceWorker
                    .register("/sw.js")
                    .then((registration) => {
                        console.log("Service Worker enregistré :", registration.scope);
                    })
                    .catch((error) => {
                        console.error("Erreur Service Worker :", error);
                    });
            });
        }
    }, []);

    return null;
}