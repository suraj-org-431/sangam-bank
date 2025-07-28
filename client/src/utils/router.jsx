import { useEffect, useState } from "react";
import { fetchUserSettings } from "../api/settings";

export default function useInitUserSettings() {
    const [settingsLoaded, setSettingsLoaded] = useState(false);

    useEffect(() => {
        // Theme & Font Initialization
        const savedTheme = localStorage.getItem('user-theme') || 'auto';
        const resolvedTheme =
            savedTheme === 'auto'
                ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
                : savedTheme;

        document.documentElement.setAttribute('data-theme', resolvedTheme);
        document.body.style.fontFamily = localStorage.getItem('user-font') || '"DM Sans", sans-serif';
        document.body.style.fontSize = localStorage.getItem('user-font-size') || '16px';

        // Fetch settings and apply
        fetchUserSettings()
            .then((settings) => {
                if (settings.websiteTitle) {
                    document.title = settings.websiteTitle;
                }

                if (settings.websiteName) {
                    const meta = document.querySelector('meta[property="og:site_name"]');
                    if (meta) {
                        meta.setAttribute('content', settings.websiteName);
                    }
                }

                if (settings.favicon) {
                    let favicon = document.getElementById('dynamic-favicon');
                    if (!favicon) {
                        favicon = document.createElement('link');
                        favicon.id = 'dynamic-favicon';
                        favicon.rel = 'icon';
                        document.head.appendChild(favicon);
                    }
                    favicon.href = settings.favicon;
                }

                setSettingsLoaded(true);
            })
            .catch((err) => {
                console.error("Settings fetch failed:", err);
                setSettingsLoaded(true); // Proceed anyway
            });
    }, []);

    return settingsLoaded;
}

export const adminRoute = (path = '') => `/test-bank/admin${path.startsWith('/') ? path : `/${path}`}`;
