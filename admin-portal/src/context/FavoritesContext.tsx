import React, { createContext, useContext, useState, useEffect } from 'react';

interface Favorite {
    name: string;
    path: string;
}

interface FavoritesContextType {
    favorites: Favorite[];
    toggleFavorite: (name: string, path: string) => void;
    isFavorite: (path: string) => boolean;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export const FavoritesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [favorites, setFavorites] = useState<Favorite[]>([]);

    useEffect(() => {
        const saved = localStorage.getItem('digireps_favorites');
        if (saved) {
            try {
                setFavorites(JSON.parse(saved));
            } catch (e) {
                console.error('Failed to parse favorites from localStorage', e);
            }
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('digireps_favorites', JSON.stringify(favorites));
    }, [favorites]);

    const toggleFavorite = (name: string, path: string) => {
        setFavorites(prev => {
            const exists = prev.find(f => f.path === path);
            if (exists) {
                return prev.filter(f => f.path !== path);
            } else {
                // Add to the top of the list
                return [{ name, path }, ...prev];
            }
        });
    };

    const isFavorite = (path: string) => {
        return favorites.some(f => f.path === path);
    };

    return (
        <FavoritesContext.Provider value={{ favorites, toggleFavorite, isFavorite }}>
            {children}
        </FavoritesContext.Provider>
    );
};

export const useFavorites = () => {
    const context = useContext(FavoritesContext);
    if (!context) {
        throw new Error('useFavorites must be used within a FavoritesProvider');
    }
    return context;
};
