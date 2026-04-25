import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Heart, Trash2, Share2, MapPin, DollarSign, Bed, Bath } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';

export interface FavoriteProperty {
  id: string;
  title: string;
  price: number;
  location: string;
  image: string;
  bedrooms: number;
  bathrooms: number;
  type: string;
  addedAt: Date;
  rating?: number;
  reviews?: number;
}

export interface WishlistCollection {
  id: string;
  name: string;
  description?: string;
  properties: FavoriteProperty[];
  createdAt: Date;
  updatedAt: Date;
}

// Storage keys
const WISHLIST_STORAGE_KEY = 'realestate_wishlists';
const FAVORITES_STORAGE_KEY = 'realestate_favorites';

export const useWishlistManager = () => {
  const [wishlists, setWishlists] = useState<WishlistCollection[]>([]);
  const [favorites, setFavorites] = useState<FavoriteProperty[]>([]);

  // Load from local storage
  useEffect(() => {
    const savedWishlists = localStorage.getItem(WISHLIST_STORAGE_KEY);
    const savedFavorites = localStorage.getItem(FAVORITES_STORAGE_KEY);
    
    if (savedWishlists) {
      setWishlists(JSON.parse(savedWishlists));
    }
    if (savedFavorites) {
      setFavorites(JSON.parse(savedFavorites));
    }
  }, []);

  // Save to local storage
  useEffect(() => {
    localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(wishlists));
  }, [wishlists]);

  useEffect(() => {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
  }, [favorites]);

  const addToFavorites = (property: FavoriteProperty) => {
    if (favorites.find(p => p.id === property.id)) {
      toast.info('Already in favorites');
      return;
    }
    setFavorites([...favorites, { ...property, addedAt: new Date() }]);
    toast.success('Added to favorites');
  };

  const removeFromFavorites = (propertyId: string) => {
    setFavorites(favorites.filter(p => p.id !== propertyId));
    toast.success('Removed from favorites');
  };

  const isFavorite = (propertyId: string) => {
    return favorites.some(p => p.id === propertyId);
  };

  const createWishlist = (name: string, description?: string) => {
    const newWishlist: WishlistCollection = {
      id: `wishlist_${Date.now()}`,
      name,
      description,
      properties: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setWishlists([...wishlists, newWishlist]);
    toast.success(`Wishlist "${name}" created`);
    return newWishlist;
  };

  const deleteWishlist = (wishlistId: string) => {
    setWishlists(wishlists.filter(w => w.id !== wishlistId));
    toast.success('Wishlist deleted');
  };

  const addToWishlist = (wishlistId: string, property: FavoriteProperty) => {
    setWishlists(wishlists.map(w => {
      if (w.id === wishlistId) {
        if (w.properties.find(p => p.id === property.id)) {
          toast.info('Already in this wishlist');
          return w;
        }
        toast.success('Added to wishlist');
        return {
          ...w,
          properties: [...w.properties, { ...property, addedAt: new Date() }],
          updatedAt: new Date(),
        };
      }
      return w;
    }));
  };

  const removeFromWishlist = (wishlistId: string, propertyId: string) => {
    setWishlists(wishlists.map(w => {
      if (w.id === wishlistId) {
        return {
          ...w,
          properties: w.properties.filter(p => p.id !== propertyId),
          updatedAt: new Date(),
        };
      }
      return w;
    }));
    toast.success('Removed from wishlist');
  };

  return {
    wishlists,
    favorites,
    addToFavorites,
    removeFromFavorites,
    isFavorite,
    createWishlist,
    deleteWishlist,
    addToWishlist,
    removeFromWishlist,
  };
};

// Favorites Display Component
export const FavoritesPanel: React.FC<{
  favorites: FavoriteProperty[];
  onRemove: (id: string) => void;
  onAddToWishlist?: (property: FavoriteProperty) => void;
}> = ({ favorites, onRemove, onAddToWishlist }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {favorites.length === 0 ? (
        <div className="col-span-full text-center py-12">
          <Heart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No favorites yet</p>
        </div>
      ) : (
        favorites.map((property) => (
          <motion.div
            key={property.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="hover:shadow-lg transition-shadow overflow-hidden h-full">
              <div className="relative">
                <img
                  src={property.image}
                  alt={property.title}
                  className="w-full h-48 object-cover"
                />
                <Badge className="absolute top-3 right-3">
                  {property.type}
                </Badge>
                {property.rating && (
                  <Badge variant="secondary" className="absolute bottom-3 right-3">
                    ⭐ {property.rating}
                  </Badge>
                )}
              </div>

              <CardContent className="pt-4">
                <h3 className="font-semibold text-lg mb-2">{property.title}</h3>
                
                <div className="flex items-center text-gray-600 text-sm mb-3">
                  <MapPin className="w-4 h-4 mr-1" />
                  {property.location}
                </div>

                <div className="flex gap-4 mb-4 text-sm text-gray-600">
                  <div className="flex items-center">
                    <Bed className="w-4 h-4 mr-1" />
                    {property.bedrooms} beds
                  </div>
                  <div className="flex items-center">
                    <Bath className="w-4 h-4 mr-1" />
                    {property.bathrooms} baths
                  </div>
                </div>

                <div className="text-2xl font-bold text-primary mb-4">
                  GHS {property.price.toLocaleString()}
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => onRemove(property.id)}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Remove
                  </Button>
                  {onAddToWishlist && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => onAddToWishlist(property)}
                    >
                      <Share2 className="w-4 h-4 mr-1" />
                      Save
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))
      )}
    </div>
  );
};

// Wishlist Management Component
export const WishlistManager: React.FC<{
  wishlists: WishlistCollection[];
  onDelete: (id: string) => void;
  onViewWishlist?: (wishlist: WishlistCollection) => void;
}> = ({ wishlists, onDelete, onViewWishlist }) => {
  const [showForm, setShowForm] = useState(false);
  const [newWishlistName, setNewWishlistName] = useState('');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">My Wishlists</h2>
        <Button onClick={() => setShowForm(!showForm)}>
          + Create Wishlist
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Wishlist name (e.g., 'Dream Homes', 'Beach Properties')"
                value={newWishlistName}
                onChange={(e) => setNewWishlistName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    if (newWishlistName.trim()) {
                      setNewWishlistName('');
                      setShowForm(false);
                    }
                  }}
                  className="flex-1"
                >
                  Create
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowForm(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {wishlists.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Heart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No wishlists yet</p>
          </div>
        ) : (
          wishlists.map((wishlist) => (
            <Card
              key={wishlist.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => onViewWishlist?.(wishlist)}
            >
              <CardHeader>
                <CardTitle className="flex justify-between items-start">
                  <span>{wishlist.name}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(wishlist.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4 text-red-500 hover:text-red-700" />
                  </button>
                </CardTitle>
                {wishlist.description && (
                  <p className="text-sm text-gray-600">{wishlist.description}</p>
                )}
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-500">
                  <p>{wishlist.properties.length} properties</p>
                  <p className="text-xs mt-1">
                    Updated: {new Date(wishlist.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
