import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, Plus, Trash2 } from 'lucide-react';

export default function SiteVisitorsCard({ formData, setFormData }) {
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [purpose, setPurpose] = useState('');

  const addVisitor = () => {
    if (!name.trim()) return;
    setFormData(prev => ({
      ...prev,
      visitors: [...prev.visitors, { name, company, purpose, id: Date.now() }],
    }));
    setName('');
    setCompany('');
    setPurpose('');
  };

  const removeVisitor = (id) => {
    setFormData(prev => ({
      ...prev,
      visitors: prev.visitors.filter(v => v.id !== id),
    }));
  };

  return (
    <Card className="shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="w-5 h-5 text-yellow-500" />
          Site Visitors
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Input placeholder="Visitor name *" value={name} onChange={e => setName(e.target.value)} />
          <Input placeholder="Company" value={company} onChange={e => setCompany(e.target.value)} />
          <Input placeholder="Purpose of visit" value={purpose} onChange={e => setPurpose(e.target.value)} />
        </div>
        <Button onClick={addVisitor} size="sm" className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold">
          <Plus className="w-4 h-4 mr-1" /> Add Visitor
        </Button>

        {formData.visitors.length > 0 && (
          <div className="space-y-2 mt-2">
            {formData.visitors.map(v => (
              <div key={v.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm">
                <div>
                  <span className="font-medium">{v.name}</span>
                  {v.company && <span className="text-gray-500"> · {v.company}</span>}
                  {v.purpose && <span className="text-gray-400 italic"> — {v.purpose}</span>}
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeVisitor(v.id)} className="text-red-400 hover:text-red-600 h-7 w-7">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
        {formData.visitors.length === 0 && (
          <p className="text-gray-400 text-sm italic">No visitors added yet.</p>
        )}
      </CardContent>
    </Card>
  );
}