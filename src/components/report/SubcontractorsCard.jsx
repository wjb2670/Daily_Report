import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { HardHat, Plus, Trash2 } from 'lucide-react';

export default function SubcontractorsCard({ formData, setFormData }) {
  const [company, setCompany] = useState('');
  const [trade, setTrade] = useState('');
  const [workers, setWorkers] = useState('');
  const [workPerformed, setWorkPerformed] = useState('');

  const addSubcontractor = () => {
    if (!company.trim()) return;
    setFormData(prev => ({
      ...prev,
      subcontractors: [...prev.subcontractors, { company, trade, workers, workPerformed, id: Date.now() }],
    }));
    setCompany('');
    setTrade('');
    setWorkers('');
    setWorkPerformed('');
  };

  const remove = (id) => {
    setFormData(prev => ({
      ...prev,
      subcontractors: prev.subcontractors.filter(s => s.id !== id),
    }));
  };

  return (
    <Card className="shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <HardHat className="w-5 h-5 text-yellow-500" />
          Subcontractors
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Input placeholder="Company name *" value={company} onChange={e => setCompany(e.target.value)} />
          <Input placeholder="Trade / Discipline" value={trade} onChange={e => setTrade(e.target.value)} />
          <Input placeholder="# of workers" type="number" value={workers} onChange={e => setWorkers(e.target.value)} />
          <Input placeholder="Work performed" value={workPerformed} onChange={e => setWorkPerformed(e.target.value)} />
        </div>
        <Button onClick={addSubcontractor} size="sm" className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold">
          <Plus className="w-4 h-4 mr-1" /> Add Subcontractor
        </Button>

        {formData.subcontractors.length > 0 && (
          <div className="space-y-2 mt-2">
            {formData.subcontractors.map(s => (
              <div key={s.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm">
                <div>
                  <span className="font-medium">{s.company}</span>
                  {s.trade && <span className="text-gray-500"> · {s.trade}</span>}
                  {s.workers && <span className="text-gray-400"> · {s.workers} workers</span>}
                  {s.workPerformed && <div className="text-gray-400 italic text-xs">{s.workPerformed}</div>}
                </div>
                <Button variant="ghost" size="icon" onClick={() => remove(s.id)} className="text-red-400 hover:text-red-600 h-7 w-7">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
        {formData.subcontractors.length === 0 && (
          <p className="text-gray-400 text-sm italic">No subcontractors added yet.</p>
        )}
      </CardContent>
    </Card>
  );
}