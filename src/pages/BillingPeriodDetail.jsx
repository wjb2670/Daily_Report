import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Lock, Unlock, FileText, Users, Download, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import G702Summary from "@/components/billing/G702Summary.jsx";
import G703ContinuationSheet from "@/components/billing/G703ContinuationSheet.jsx";
import ChangeOrderModal from "@/components/billing/ChangeOrderModal.jsx";

export default function BillingPeriodDetail() {
  const params = new URLSearchParams(window.location.search);
  const periodId = params.get("period_id");

  const [period, setPeriod] = useState(null);
  const [project, setProject] = useState(null);
  const [sovItems, setSovItems] = useState([]);
  const [lineItems, setLineItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCOModal, setShowCOModal] = useState(false);

  useEffect(() => {
    if (periodId) loadAll();
  }, [periodId]);

  const loadAll = async () => {
    const [perData] = await Promise.all([
      base44.entities.BillingPeriod.filter({ id: periodId }),
    ]);
    const per = perData[0];
    if (!per) { setLoading(false); return; }
    setPeriod(per);

    const [proj, allSov, existingLines] = await Promise.all([
        base44.entities.Project.filter({ id: per.project_id }),
        base44.entities.ScheduleOfValues.filter({ project_id: per.project_id }, "line_number"),
        base44.entities.BillingLineItem.filter({ billing_period_id: periodId }),
      ]);

    setProject(proj[0] || null);
    setSovItems(allSov);

    // Map existing line items by sov_item_id
    const lineMap = {};
    existingLines.forEach(l => { lineMap[l.sov_item_id] = l; });

    // Create line items for all SOV items that don't have one yet
    const mergedLines = [];
    for (const sovItem of allSov) {
      const isGCItem = sovItem.category === "General Conditions";
      if (lineMap[sovItem.id]) {
        mergedLines.push(lineMap[sovItem.id]);
      } else {
        const created = await base44.entities.BillingLineItem.create({
          billing_period_id: periodId,
          project_id: per.project_id,
          sov_item_id: sovItem.id,
          item_number: sovItem.line_number || "",
          description: sovItem.description,
          scheduled_value: sovItem.scheduled_value || 0,
          previous_applications: 0,
          work_this_period: 0,
          materials_this_period: 0,
          retainage_percent: sovItem.retainage_percent ?? 10,
          retainage_amount: 0,
          is_general_conditions: isGCItem,
        });
        mergedLines.push(created);
      }
    }
    setLineItems(mergedLines);
    setLoading(false);
  };

  const updatePeriod = async (data) => {
    const updated = await base44.entities.BillingPeriod.update(periodId, data);
    setPeriod(updated);
  };

  const updateLineItem = async (id, data) => {
    const updated = await base44.entities.BillingLineItem.update(id, data);
    setLineItems(prev => prev.map(l => l.id === id ? updated : l));
  };

  const toggleLock = () => updatePeriod({ locked: !period.locked });

  if (loading) return <div className="text-center py-16 text-gray-400">Loading...</div>;
  if (!period || !project) return <div className="text-center py-16 text-gray-400">Period not found.</div>;

  const backUrl = createPageUrl(`ProjectBilling?id=${project.id}`);

  // Compute G702 summary values
  const originalContractSum = project.contract_value || 0;
  const changeOrderNet = (period.change_order_additions || 0) - (period.change_order_deductions || 0);
  const contractSumToDate = originalContractSum + changeOrderNet;

  const cmLines = lineItems.filter(l => !l.is_general_conditions);
  const gcLines = lineItems.filter(l => l.is_general_conditions);
  const gcTotal = gcLines.reduce((s, l) => s + (l.work_this_period || 0) + (l.materials_this_period || 0), 0);

  const totalCompletedStored = lineItems.reduce((s, l) =>
    s + (l.previous_applications || 0) + (l.work_this_period || 0) + (l.materials_this_period || 0), 0);
  const totalRetainage = lineItems.reduce((s, l) => s + (l.retainage_amount || 0), 0);
  const totalEarnedLessRetainage = totalCompletedStored - totalRetainage;

  const previousCertificates = lineItems.reduce((s, l) => s + (l.previous_applications || 0), 0);
  const currentPaymentDue = totalEarnedLessRetainage - previousCertificates;
  const balanceToFinish = contractSumToDate - totalCompletedStored;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <Link to={backUrl} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#1e3a8a] mb-4">
        <ArrowLeft className="w-4 h-4" /> {project.name}
      </Link>

      <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-[#0f2a5e]">Period {period.period_number}</h1>
            <Badge className="bg-blue-100 text-blue-800">AIA Application</Badge>
            {period.locked && <Badge className="bg-gray-100 text-gray-700 flex items-center gap-1"><Lock className="w-3 h-3" /> locked</Badge>}
          </div>
          <p className="text-[#1e3a8a] text-sm font-medium mt-0.5">{project.name}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="gap-1">
            <Users className="w-3.5 h-3.5" /> Collaborate
          </Button>
          <Button variant="outline" size="sm" className="gap-1">
            <FileText className="w-3.5 h-3.5" /> Lien Waiver
          </Button>
          <Button variant="outline" size="sm" className="gap-1 text-blue-700 border-blue-300">
            <Download className="w-3.5 h-3.5" /> Generate PDF
          </Button>
          <Button
            size="sm"
            variant="outline"
            className={`gap-1 ${period.locked ? "text-green-700 border-green-300" : "text-orange-700 border-orange-300"}`}
            onClick={toggleLock}
          >
            {period.locked ? <><Unlock className="w-3.5 h-3.5" /> Unlock Period</> : <><Lock className="w-3.5 h-3.5" /> Lock Period</>}
          </Button>
        </div>
      </div>

      {/* Main layout: left form + right G702 summary */}
      <div className="flex gap-5 items-start">
        <div className="flex-1 min-w-0 space-y-5">
          {/* Period Info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Period End Date</label>
                <Input
                  type="date"
                  defaultValue={period.period_end_date || ""}
                  disabled={period.locked}
                  onBlur={e => updatePeriod({ period_end_date: e.target.value })}
                  className="text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Change Order Additions</label>
                <div className="flex items-center border rounded-md px-2 h-9 bg-white">
                  <span className="text-gray-400 text-sm mr-1">$</span>
                  <input
                    type="number"
                    className="flex-1 text-sm outline-none"
                    value={period.change_order_additions || 0}
                    disabled={period.locked}
                    onChange={e => updatePeriod({ change_order_additions: parseFloat(e.target.value) || 0 })}
                  />
                  <span className="text-gray-300 text-xs ml-1">▲</span>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Change Order Deductions</label>
                <div className="flex items-center border rounded-md px-2 h-9 bg-white">
                  <span className="text-gray-400 text-sm mr-1">$</span>
                  <input
                    type="number"
                    className="flex-1 text-sm outline-none"
                    value={period.change_order_deductions || 0}
                    disabled={period.locked}
                    onChange={e => updatePeriod({ change_order_deductions: parseFloat(e.target.value) || 0 })}
                  />
                  <span className="text-gray-300 text-xs ml-1">▲</span>
                </div>
              </div>
            </div>
          </div>

          {/* G703 Continuation Sheet */}
          <G703ContinuationSheet
            lineItems={lineItems}
            locked={period.locked}
            onUpdate={updateLineItem}
          />
        </div>

        {/* G702 Summary sidebar */}
        <div className="w-72 flex-shrink-0">
          <G702Summary
            originalContractSum={originalContractSum}
            changeOrderNet={changeOrderNet}
            contractSumToDate={contractSumToDate}
            totalCompletedStored={totalCompletedStored}
            totalRetainage={totalRetainage}
            totalEarnedLessRetainage={totalEarnedLessRetainage}
            previousCertificates={previousCertificates}
            currentPaymentDue={currentPaymentDue}
            balanceToFinish={balanceToFinish}
          />
        </div>
      </div>
    </div>
  );
}