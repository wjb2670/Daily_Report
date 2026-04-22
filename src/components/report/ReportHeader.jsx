import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ClipboardList } from 'lucide-react';

const ACTIVE_STATUSES = ['bidding', 'awarded', 'active', 'on_hold'];

export default function ReportHeader({ formData, setFormData }) {
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    base44.entities.Project.list().then(all => {
      setProjects(all.filter(p => ACTIVE_STATUSES.includes(p.status)));
    });
  }, []);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleProjectSelect = (projectId) => {
    const selected = projects.find(p => p.id === projectId);
    if (selected) {
      setFormData(prev => ({
        ...prev,
        project: selected.name,
        job_number: selected.job_number || '',
        zip_code: selected.zip || prev.zip_code,
      }));
    }
  };

  return (
    <Card className="shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <ClipboardList className="w-5 h-5 text-[#1e3a8a]" />
          Report Information
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Project Name</Label>
            <Select
              value={projects.find(p => p.name === formData.project)?.id || ''}
              onValueChange={handleProjectSelect}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a project..." />
              </SelectTrigger>
              <SelectContent>
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="job_number">Job Number</Label>
            <Input
              id="job_number"
              placeholder="Auto-filled from project"
              value={formData.job_number}
              onChange={e => handleChange('job_number', e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="superintendent">Superintendent</Label>
            <Input
              id="superintendent"
              placeholder="Enter superintendent name"
              value={formData.superintendent}
              onChange={e => handleChange('superintendent', e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="report_date">Report Date</Label>
            <Input
              id="report_date"
              type="date"
              value={formData.report_date}
              onChange={e => handleChange('report_date', e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="zip_code">Job Site ZIP Code</Label>
            <Input
              id="zip_code"
              placeholder="Enter ZIP code for weather"
              value={formData.zip_code}
              onChange={e => handleChange('zip_code', e.target.value)}
              maxLength={5}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}