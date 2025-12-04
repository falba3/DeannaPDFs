'use client';

import { useState, useEffect, useRef } from 'react';

interface SearchResult {
  id: number;
  name: string;
  slug: string;
  numClips: number;
}

interface MinistoreData {
  ministore: {
    id: number;
    name: string;
    description: string | null;
    numClips: number;
  };
  imageCount: number;
}

export default function Home() {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  
  const [ministoreData, setMinistoreData] = useState<MinistoreData | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  
  const [layout, setLayout] = useState<'portrait' | 'landscape'>('portrait');
  const [photosPerPage, setPhotosPerPage] = useState(4);
  
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Fuzzy search with debounce
  useEffect(() => {
    if (query.length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/ministore/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setSearchResults(data.results || []);
        setShowResults(true);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const selectMinistore = async (id: number) => {
    setShowResults(false);
    setLoading(true);
    setError('');
    setPreviewUrl(null);
    
    try {
      const res = await fetch(`/api/ministore/${id}`);
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error || 'Failed to load ministore');
        return;
      }
      
      setMinistoreData(data);
      setQuery(data.ministore.name);
    } catch {
      setError('Failed to load ministore');
    } finally {
      setLoading(false);
    }
  };

  const loadPreview = async () => {
    if (!ministoreData) return;
    
    setShowPreview(true);
    
    try {
      const res = await fetch('/api/catalog/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId: ministoreData.ministore.id,
          options: { layout, photosPerPage }
        })
      });
      
      if (!res.ok) {
        setError('Failed to load preview');
        return;
      }
      
      const html = await res.text();
      const blob = new Blob([html], { type: 'text/html' });
      setPreviewUrl(URL.createObjectURL(blob));
    } catch {
      setError('Failed to load preview');
    }
  };

  const generatePdf = async () => {
    if (!ministoreData) return;
    
    setGenerating(true);
    setError('');
    
    try {
      const res = await fetch('/api/catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId: ministoreData.ministore.id,
          options: { layout, photosPerPage }
        })
      });
      
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to generate PDF');
        return;
      }
      
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `catalog_${ministoreData.ministore.id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Failed to generate PDF');
    } finally {
      setGenerating(false);
    }
  };

  // Refresh preview when options change
  useEffect(() => {
    if (showPreview && ministoreData) {
      loadPreview();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout, photosPerPage]);

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="flex h-screen">
        {/* Left Panel - Controls */}
        <div className="w-96 bg-white border-r border-gray-200 p-6 overflow-y-auto">
          <h1 className="text-xl font-semibold text-gray-900 mb-6">
            PDF Catalog Generator
          </h1>
          
          {/* Search */}
          <div className="mb-6" ref={searchRef}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Ministore
            </label>
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => searchResults.length > 0 && setShowResults(true)}
                placeholder="Search by name, ID, or slug..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
              />
              {searching && (
                <div className="absolute right-3 top-2.5 text-gray-400 text-sm">...</div>
              )}
              
              {/* Search Results Dropdown */}
              {showResults && searchResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-64 overflow-y-auto">
                  {searchResults.map((result) => (
                    <button
                      key={result.id}
                      onClick={() => selectMinistore(result.id)}
                      className="w-full px-3 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0"
                    >
                      <div className="font-medium text-gray-900 text-sm truncate">
                        {result.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        ID: {result.id} · {result.numClips} clips
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}

          {loading && (
            <div className="mb-4 p-3 bg-gray-50 text-gray-600 rounded-md text-sm">
              Loading...
            </div>
          )}

          {ministoreData && (
            <>
              {/* Selected Ministore */}
              <div className="mb-6 p-4 bg-indigo-50 rounded-md border border-indigo-100">
                <h2 className="font-medium text-gray-900 text-sm">
                  {ministoreData.ministore.name}
                </h2>
                <p className="text-xs text-gray-600 mt-1">
                  {ministoreData.imageCount} images
                </p>
              </div>

              {/* Layout Options */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Layout
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setLayout('portrait')}
                    className={`flex-1 py-2 px-3 text-sm rounded-md border ${
                      layout === 'portrait'
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    Portrait
                  </button>
                  <button
                    onClick={() => setLayout('landscape')}
                    className={`flex-1 py-2 px-3 text-sm rounded-md border ${
                      layout === 'landscape'
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    Landscape
                  </button>
                </div>
              </div>

              {/* Photos per page */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Photos per page: <span className="font-semibold">{photosPerPage}</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="9"
                  value={photosPerPage}
                  onChange={(e) => setPhotosPerPage(parseInt(e.target.value))}
                  className="w-full accent-indigo-600"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>1 (large)</span>
                  <span>9 (grid)</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  onClick={loadPreview}
                  className="w-full py-2.5 bg-white text-gray-700 rounded-md border border-gray-300 hover:bg-gray-50 font-medium text-sm"
                >
                  Preview
                </button>
                <button
                  onClick={generatePdf}
                  disabled={generating}
                  className="w-full py-2.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
                >
                  {generating ? 'Generating...' : 'Download PDF'}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Right Panel - Preview */}
        <div className="flex-1 bg-gray-200 flex items-center justify-center">
          {showPreview && previewUrl ? (
            <iframe
              src={previewUrl}
              className="w-full h-full bg-white"
              title="PDF Preview"
            />
          ) : (
            <div className="text-center text-gray-500">
              <div className="text-4xl mb-3">📄</div>
              <p className="text-sm">
                {ministoreData 
                  ? 'Click "Preview" to see your catalog'
                  : 'Search for a ministore to get started'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
