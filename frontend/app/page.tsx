'use client';

import { useState } from 'react';

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
  const [bookId, setBookId] = useState('');
  const [ministoreData, setMinistoreData] = useState<MinistoreData | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  
  const [layout, setLayout] = useState<'portrait' | 'landscape'>('portrait');
  const [photosPerPage, setPhotosPerPage] = useState(4);

  const searchMinistore = async () => {
    if (!bookId) return;
    
    setLoading(true);
    setError('');
    setMinistoreData(null);
    
    try {
      const res = await fetch(`/api/ministore/${bookId}`);
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error || 'Failed to find ministore');
        return;
      }
      
      setMinistoreData(data);
    } catch {
      setError('Failed to search');
    } finally {
      setLoading(false);
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

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-8 text-center">
          PDF Catalog Generator
        </h1>
        
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ministore ID
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                value={bookId}
                onChange={(e) => setBookId(e.target.value)}
                placeholder="Enter ID (e.g. 12770)"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                onKeyDown={(e) => e.key === 'Enter' && searchMinistore()}
              />
              <button
                onClick={searchMinistore}
                disabled={loading || !bookId}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '...' : 'Search'}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}

          {ministoreData && (
            <>
              <div className="p-4 bg-gray-50 rounded-md">
                <h2 className="font-semibold text-gray-900">
                  {ministoreData.ministore.name}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {ministoreData.imageCount} images
                </p>
                {ministoreData.ministore.description && (
                  <p className="text-sm text-gray-500 mt-2">
                    {ministoreData.ministore.description}
                  </p>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Layout
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="portrait"
                        checked={layout === 'portrait'}
                        onChange={(e) => setLayout(e.target.value as 'portrait' | 'landscape')}
                        className="mr-2"
                      />
                      Portrait
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="landscape"
                        checked={layout === 'landscape'}
                        onChange={(e) => setLayout(e.target.value as 'portrait' | 'landscape')}
                        className="mr-2"
                      />
                      Landscape
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Photos per page: {photosPerPage}
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="9"
                    value={photosPerPage}
                    onChange={(e) => setPhotosPerPage(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>1</span>
                    <span>9</span>
                  </div>
                </div>
              </div>

              <button
                onClick={generatePdf}
                disabled={generating}
                className="w-full py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {generating ? 'Generating PDF...' : 'Generate PDF'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
