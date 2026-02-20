import React, { useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, X, Upload } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function PhotoGalleryCard({ formData, setFormData }) {
  const fileRef = useRef(null);

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({
        ...prev,
        photos: [...prev.photos, { url: file_url, caption: '', id: Date.now() + Math.random() }],
      }));
    }
    e.target.value = '';
  };

  const removePhoto = (id) => {
    setFormData(prev => ({ ...prev, photos: prev.photos.filter(p => p.id !== id) }));
  };

  const updateCaption = (id, caption) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.map(p => p.id === id ? { ...p, caption } : p),
    }));
  };

  return (
    <Card className="shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Camera className="w-5 h-5 text-yellow-500" />
          Photo Gallery
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
        <Button
          onClick={() => fileRef.current.click()}
          size="sm"
          className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold"
        >
          <Upload className="w-4 h-4 mr-1" /> Upload Photos
        </Button>

        {formData.photos.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
            {formData.photos.map(photo => (
              <div key={photo.id} className="relative group rounded-lg overflow-hidden border border-gray-200">
                <img src={photo.url} alt="site photo" className="w-full h-32 object-cover" />
                <button
                  onClick={() => removePhoto(photo.id)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
                <input
                  className="w-full text-xs border-0 border-t border-gray-200 px-2 py-1 bg-white focus:outline-none"
                  placeholder="Add caption..."
                  value={photo.caption}
                  onChange={e => updateCaption(photo.id, e.target.value)}
                />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-sm italic">No photos uploaded yet.</p>
        )}
      </CardContent>
    </Card>
  );
}