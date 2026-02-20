import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import Header from '@/components/report/Header';
import ReportHeader from '@/components/report/ReportHeader';
import WeatherCard from '@/components/report/WeatherCard';
import SiteVisitorsCard from '@/components/report/SiteVisitorsCard';
import SubcontractorsCard from '@/components/report/SubcontractorsCard';
import DeliveriesCard from '@/components/report/DeliveriesCard';
import UtilitiesCard from '@/components/report/UtilitiesCard';
import PhotoGalleryCard from '@/components/report/PhotoGalleryCard';
import NotesCard from '@/components/report/NotesCard';
import FooterActions from '@/components/report/FooterActions';
import { useToast } from '@/components/ui/use-toast';
import { Toaster } from '@/components/ui/toaster';

const getFormattedDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const initialFormState = {
  project: '',
  job_number: '',
  zip_code: '',
  superintendent: '',
  report_date: getFormattedDate(),
  visitors: [],
  subcontractors: [],
  deliveries: [],
  utilities_installed: '',
  utilities_removed: '',
  photos: [],
  notes: '',
};

const cardAnimation = (index) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: index * 0.1, duration: 0.5 },
});

export default function DailyReport() {
  const [formData, setFormData] = useState(initialFormState);
  const [lastSaved, setLastSaved] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    const savedData = localStorage.getItem('dailyReportForm');
    if (savedData) {
      setFormData(JSON.parse(savedData));
    }
    const savedTime = localStorage.getItem('dailyReportLastSaved');
    if (savedTime) {
      setLastSaved(new Date(savedTime));
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('dailyReportForm', JSON.stringify(formData));
    const now = new Date();
    setLastSaved(now);
    localStorage.setItem('dailyReportLastSaved', now.toISOString());
    toast({
      title: "Progress Saved! 💾",
      description: "Your report has been saved locally.",
    });
  };

  const handleSubmit = () => {
    toast({
      title: "Report Submitted! 🚀",
      description: "Your daily report has been submitted successfully.",
    });
  };

  const handleReset = () => {
    setFormData({ ...initialFormState, report_date: getFormattedDate() });
    setLastSaved(null);
    localStorage.removeItem('dailyReportForm');
    localStorage.removeItem('dailyReportLastSaved');
    toast({
      title: "Form Reset! 🗑️",
      description: "All fields have been cleared.",
    });
  };

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <Header />
        <main className="space-y-6">
          <motion.div {...cardAnimation(0)}>
            <ReportHeader formData={formData} setFormData={setFormData} />
          </motion.div>
          <motion.div {...cardAnimation(1)}>
            <WeatherCard zipCode={formData.zip_code} />
          </motion.div>
          <motion.div {...cardAnimation(2)}>
            <SiteVisitorsCard formData={formData} setFormData={setFormData} />
          </motion.div>
          <motion.div {...cardAnimation(3)}>
            <SubcontractorsCard formData={formData} setFormData={setFormData} />
          </motion.div>
          <motion.div {...cardAnimation(4)}>
            <DeliveriesCard formData={formData} setFormData={setFormData} />
          </motion.div>
          <motion.div {...cardAnimation(5)}>
            <UtilitiesCard formData={formData} setFormData={setFormData} />
          </motion.div>
          <motion.div {...cardAnimation(6)}>
            <PhotoGalleryCard formData={formData} setFormData={setFormData} />
          </motion.div>
          <motion.div {...cardAnimation(7)}>
            <NotesCard formData={formData} setFormData={setFormData} />
          </motion.div>
          <motion.div {...cardAnimation(8)}>
            <FooterActions
              lastSaved={lastSaved}
              onSave={handleSave}
              onSubmit={handleSubmit}
              onReset={handleReset}
            />
          </motion.div>
        </main>
      </div>
      <Toaster />
    </div>
  );
}