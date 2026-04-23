import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import AdCard from '../components/AdCard';

export default function FavoritesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    api.get('/ads/favorites/mine')
      .then(r => setFavorites(r.data))
      .catch(() => setFavorites([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page page-enter">
      <div className="page-header">
        <h1 style={{ fontSize: 22, fontWeight: 800 }}>❤️ Favorites</h1>
      </div>
      <div className="container" style={{ paddingTop: 16 }}>
        {loading ? <div className="spinner" /> : favorites.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">❤️</div>
            <p className="empty-title">No saved ads</p>
            <p className="empty-subtitle">Tap the heart icon on any ad to save it here</p>
            <button className="btn btn-primary" style={{ width: 'auto', padding: '12px 28px' }} onClick={() => navigate('/')}>Browse Ads</button>
          </div>
        ) : (
          <div className="ads-grid">
            {favorites.map(ad => <AdCard key={ad._id} ad={ad} onFavToggle={() => setFavorites(prev => prev.filter(f => f._id !== ad._id))} />)}
          </div>
        )}
      </div>
    </div>
  );
}
