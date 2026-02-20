import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Truck, Plus, Trash2 } from 'lucide-react';

export default function DeliveriesCard({ formData, setFormData }) {
  const [material, setMaterial] = useState('');
  const [supplier, setSupplier] = useState('');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');

  const addDelivery = () => {
    if (!material.trim()) return;
    setFormData(prev => ({
      ...prev,
      deliveries: [...prev.deliveries, { material, supplier, quantity, notes, id: Date.now() }],
    }));
    setMaterial('');
    setSupplier('');
    setQuantity('');
    setNotes('');
  };

  const remove = (id) => {
    setFormData(prev => ({
      ...prev,
      deliveries: prev.deliveries.filter(d => d.id !== id),
    }));
  };

  return (
    <Card className="shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Truck className="w-5 h-5 text-[#1e3a8a]" />
          Deliveries
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Input placeholder="Material *" value={material} onChange={e => setMaterial(e.target.value)} />
          <Input placeholder="Supplier" value={supplier} onChange={e => setSupplier(e.target.value)} />
          <Input placeholder="Quantity" value={quantity} onChange={e => setQuantity(e.target.value)} />
          <Input placeholder="Notes" value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
        <Button onClick={addDelivery} size="sm" className="bg-[#1e3a8a] hover:bg-[#1a317a] text-white font-semibold">
          <Plus className="w-4 h-4 mr-1" /> Add Delivery
        </Button>

        {formData.deliveries.length > 0 && (
          <div className="space-y-2 mt-2">
            {formData.deliveries.map(d => (
              <div key={d.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm">
                <div>
                  <span className="font-medium">{d.material}</span>
                  {d.supplier && <span className="text-gray-500"> · {d.supplier}</span>}
                  {d.quantity && <span className="text-gray-400"> · {d.quantity}</span>}
                  {d.notes && <div className="text-gray-400 italic text-xs">{d.notes}</div>}
                </div>
                <Button variant="ghost" size="icon" onClick={() => remove(d.id)} className="text-red-400 hover:text-red-600 h-7 w-7">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
        {formData.deliveries.length === 0 && (
          <p className="text-gray-400 text-sm italic">No deliveries added yet.</p>
        )}
      </CardContent>
    </Card>
  );
}