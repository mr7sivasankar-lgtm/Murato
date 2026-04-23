import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search, ArrowLeft, SlidersHorizontal, X, Package, Wrench } from 'lucide-react';
import api from '../api/axios';
import AdCard from '../components/AdCard';
import { PRODUCT_CATEGORIES, SERVICE_CATEGORIES } from '../data/categories';

const ALL_CATS = [
  ...PRODUCT_CATEGORIES.map(c => ({ name: c.name, icon: '📦', type: 'product' })),
  ...SERVICE_CATEGORIES.map(c => ({ name: c.name, icon: '🔧', type: 'service' })),
];

export default function SearchPage() {
  const [params]   = useSearchParams();
  const navigate   = useNavigate();
  const [query,      setQuery]      = useState(params.get('q') || '');
  const [category,   setCategory]   = useState(params.get('category') || '');
  const [type,       setType]       = useState(params.get('type') || '');
  const [minPrice,   setMinPrice]   = useState('');
  const [maxPrice,   setMaxPrice]   = useState('');
  const [ads,        setAds]        = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [total,      setTotal]      = useState(0);
  const [showFilter, setShowFilter] = useState(false);

  useEffect(() => { doSearch(); }, []);

  const doSearch = useCallback(async () => {
    setLoading(true);
    try {
      const p = {};
      if (query)    p.q        = query;
      if (category) p.category = category;
      if (type)     p.type     = type;
      if (minPrice) p.minPrice = minPrice;
      if (maxPrice) p.maxPrice = maxPrice;
      const { data } = await api.get('/ads', { params: p });
      setAds(data.ads || []);
      setTotal(data.total || 0);
    } catch { setAds([]); setTotal(0); }
    finally { setLoading(false); }
  }, [query, category, type, minPrice, maxPrice]);

  const handleSearch = (e) => { e.preventDefault(); doSearch(); };

  const clearFilters = () => { setCategory(''); setType(''); setMinPrice(''); setMaxPrice(''); };
  const hasFilters   = category || type || minPrice || maxPrice;

  return (
    <div className="page page-enter" style={{ paddingBottom: 30 }}>

      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => navigate(-1)} style={{ color: 'var(--navy)', padding: 4, display: 'flex' }}>
            <ArrowLeft size={22} />
          </button>
          <form onSubmit={handleSearch} style={{ flex: 1 }}>
            <div className="search-bar" style={{ padding: '9px 14px' }}>
              <Search size={16} color="var(--text-muted)" />
              <input
                placeholder="Search materials, services..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                autoFocus
              />
              {query && (
                <button type="button" onClick={() => setQuery('')} style={{ display: 'flex', color: 'var(--text-muted)' }}>
                  <X size={14} />
                </button>
              )}
            </div>
          </form>
          <button
            onClick={() => setShowFilter(!showFilter)}
            style={{ color: showFilter || hasFilters ? 'var(--navy)' : 'var(--text-muted)', padding: 4, display: 'flex', position: 'relative' }}
          >
            <SlidersHorizontal size={20} />
            {hasFilters && <span style={{ position: 'absolute', top: 0, right: 0, width: 8, height: 8, borderRadius: '50%', background: 'var(--navy)', border: '1.5px solid white' }} />}
          </button>
        </div>

        {/* Filter Panel */}
        {showFilter && (
          <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 14 }}>

            {/* Type */}
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Type</p>
            <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
              {[
                { val: '', label: 'All', icon: null },
                { val: 'product', label: 'Products', icon: <Package size={11} /> },
                { val: 'service', label: 'Services', icon: <Wrench size={11} /> },
              ].map(t => (
                <button key={t.val} onClick={() => setType(t.val)}
                  style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, border: '1.5px solid', display: 'flex', alignItems: 'center', gap: 4, borderColor: type === t.val ? 'var(--navy)' : 'var(--border)', background: type === t.val ? 'var(--navy)' : 'white', color: type === t.val ? 'white' : 'var(--text-secondary)', cursor: 'pointer' }}>
                  {t.icon}{t.label}
                </button>
              ))}
            </div>

            {/* Category chips */}
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Category</p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
              {(type === 'service' ? SERVICE_CATEGORIES : type === 'product' ? PRODUCT_CATEGORIES : ALL_CATS.slice(0,12)).map(c => (
                <button key={c.name} onClick={() => setCategory(category === c.name ? '' : c.name)}
                  style={{ padding: '5px 11px', borderRadius: 20, fontSize: 11, fontWeight: 600, border: '1.5px solid', borderColor: category === c.name ? 'var(--navy)' : 'var(--border)', background: category === c.name ? 'var(--navy)' : 'white', color: category === c.name ? 'white' : 'var(--text-secondary)', cursor: 'pointer' }}>
                  {c.name}
                </button>
              ))}
            </div>

            {/* Price */}
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Price Range (₹)</p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <input className="form-input" placeholder="Min ₹" value={minPrice} onChange={e => setMinPrice(e.target.value)} style={{ width: '50%' }} type="number" />
              <input className="form-input" placeholder="Max ₹" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} style={{ width: '50%' }} type="number" />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={doSearch} className="btn btn-primary" style={{ flex: 2, padding: '11px 0' }}>
                Apply Filters
              </button>
              {hasFilters && (
                <button onClick={clearFilters} className="btn" style={{ flex: 1, padding: '11px 0', background: '#f3f4f6', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  Clear
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="container" style={{ paddingTop: 16 }}>

        {/* Active filter chips */}
        {hasFilters && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
            {category && <span style={{ fontSize: 11, fontWeight: 700, background: '#f0f3fc', color: 'var(--navy)', padding: '4px 10px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 4 }}>{category} <button onClick={() => setCategory('')} style={{ display: 'flex' }}><X size={10} /></button></span>}
            {type && <span style={{ fontSize: 11, fontWeight: 700, background: '#f0f3fc', color: 'var(--navy)', padding: '4px 10px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 4 }}>{type} <button onClick={() => setType('')} style={{ display: 'flex' }}><X size={10} /></button></span>}
            {(minPrice || maxPrice) && <span style={{ fontSize: 11, fontWeight: 700, background: '#f0f3fc', color: 'var(--navy)', padding: '4px 10px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 4 }}>₹{minPrice||0}–{maxPrice||'∞'} <button onClick={() => { setMinPrice(''); setMaxPrice(''); }} style={{ display: 'flex' }}><X size={10} /></button></span>}
          </div>
        )}

        {/* Results */}
        {loading ? (
          <div className="ads-grid">
            {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 200, borderRadius: 14 }} />)}
          </div>
        ) : ads.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🔍</div>
            <p className="empty-title">No results found</p>
            <p className="empty-subtitle">Try different keywords or remove some filters</p>
            {hasFilters && <button className="btn btn-primary" style={{ width: 'auto', padding: '12px 28px' }} onClick={clearFilters}>Clear Filters</button>}
          </div>
        ) : (
          <>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14, fontWeight: 500 }}>
              {total} result{total !== 1 ? 's' : ''} {category ? `for "${category}"` : query ? `for "${query}"` : 'found'}
            </p>
            <div className="ads-grid">
              {ads.map(ad => <AdCard key={ad._id} ad={ad} />)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
