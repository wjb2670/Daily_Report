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
import { generateAIAPdf } from "@/components/billing/generateAIAPdf.jsx";

export default function BillingPeriodDetail() {
  const params = new URLSearchParams(window.location.search);
  const periodId = params.get("period_id");

  const [period, setPeriod] = useState(null);
  const [project, setProject] = useState(null);
  const [sovItems, setSovItems] = useState([]);
  const [lineItems, setLineItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCOModal, setShowCOModal] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [prevPeriodEarnedLessRetainage, setPrevPeriodEarnedLessRetainage] = useState(0);
  const [prevCOAdditions, setPrevCOAdditions] = useState(0);
  const [prevCODeductions, setPrevCODeductions] = useState(0);

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

    // Map existing line items by sov_item_id (and track CO items separately)
    const lineMap = {};
    existingLines.forEach(l => { lineMap[l.sov_item_id] = l; });

    // Get previous period's completed totals and retainage for carry-forward
    let previousPeriodTotals = {};
    let previousPeriodRetainage = {};
    let prevEarnedLessRetainage = 0;
    if (per.period_number > 1) {
      const prevPeriods = await base44.entities.BillingPeriod.filter({ project_id: per.project_id, period_number: per.period_number - 1 });
      if (prevPeriods.length > 0) {
        const prevPeriod = prevPeriods[0];
        const prevLines = await base44.entities.BillingLineItem.filter({ billing_period_id: prevPeriod.id });
        let prevTotalCompleted = 0;
        let prevTotalRetainage = 0;
        prevLines.forEach(line => {
          const completed = (line.previous_applications || 0) + (line.work_this_period || 0) + (line.materials_this_period || 0);
          previousPeriodTotals[line.sov_item_id] = completed;
          previousPeriodRetainage[line.sov_item_id] = line.retainage_amount || 0;
          prevTotalCompleted += completed;
          prevTotalRetainage += (line.retainage_amount || 0);
        });
        // Line 7 = previous period's Line 6 (Total Earned Less Retainage)
        prevEarnedLessRetainage = prevTotalCompleted - prevTotalRetainage;
        // Carry forward cumulative CO totals from previous period
        setPrevCOAdditions(prevPeriod.change_order_additions || 0);
        setPrevCODeductions(prevPeriod.change_order_deductions || 0);

      }
    }
    setPrevPeriodEarnedLessRetainage(prevEarnedLessRetainage);

    // Always sync previous_applications for existing line items from prior period's Total Completed & Stored
    // and recalculate retainage based on full completed-to-date × retainage percent
    for (const sovItem of allSov) {
      const existing = lineMap[sovItem.id];
      if (existing && per.period_number > 1) {
        const correctPrev = previousPeriodTotals[sovItem.id] || 0;
        const retainagePct = sovItem.retainage_percent ?? existing.retainage_percent ?? 10;
        const completedToDate = correctPrev + (existing.work_this_period || 0) + (existing.materials_this_period || 0);
        const correctRetainage = completedToDate * (retainagePct / 100);
        if (existing.previous_applications !== correctPrev || Math.abs((existing.retainage_amount || 0) - correctRetainage) > 0.001) {
          lineMap[sovItem.id] = await base44.entities.BillingLineItem.update(existing.id, {
            previous_applications: correctPrev,
            retainage_amount: correctRetainage,
          });
        }
      }
    }

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
          previous_applications: previousPeriodTotals[sovItem.id] || 0,
          work_this_period: 0,
          materials_this_period: 0,
          retainage_percent: sovItem.retainage_percent ?? 10,
          retainage_amount: previousPeriodRetainage[sovItem.id] || 0,
          is_general_conditions: isGCItem,
        });
        mergedLines.push(created);
      }
    }

    // Carry forward CO line items from previous period into this period
    if (per.period_number > 1) {
      const prevPeriods = await base44.entities.BillingPeriod.filter({ project_id: per.project_id, period_number: per.period_number - 1 });
      if (prevPeriods.length > 0) {
        const prevCoLines = await base44.entities.BillingLineItem.filter({ billing_period_id: prevPeriods[0].id });
        const prevCOItems = prevCoLines.filter(l => l.is_change_order);
        const currentCOItems = existingLines.filter(l => l.is_change_order);

        for (const prevCO of prevCOItems) {
          // Check if a matching CO already exists in this period (by description)
          const alreadyExists = currentCOItems.some(c => c.description === prevCO.description);
          if (!alreadyExists) {
            const prevCompleted = (prevCO.previous_applications || 0) + (prevCO.work_this_period || 0) + (prevCO.materials_this_period || 0);
            const created = await base44.entities.BillingLineItem.create({
              billing_period_id: periodId,
              project_id: per.project_id,
              description: prevCO.description,
              scheduled_value: prevCO.scheduled_value || 0,
              previous_applications: prevCompleted,
              work_this_period: 0,
              materials_this_period: 0,
              retainage_percent: 0,
              retainage_amount: 0,
              is_general_conditions: false,
              is_change_order: true,
              co_type: prevCO.co_type,
            });
            mergedLines.push(created);
          } else {
            const existing = currentCOItems.find(c => c.description === prevCO.description);
            mergedLines.push(existing);
          }
        }

        // Also add any CO items already in this period that weren't from prev period
        const prevCODescriptions = prevCOItems.map(c => c.description);
        currentCOItems
          .filter(c => !prevCODescriptions.includes(c.description))
          .forEach(c => mergedLines.push(c));
      } else {
        // No previous period - just add existing CO items
        existingLines.filter(l => l.is_change_order).forEach(c => mergedLines.push(c));
      }
    } else {
      // Period 1 - just add existing CO items directly
      existingLines.filter(l => l.is_change_order).forEach(c => mergedLines.push(c));
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

  const toggleLock = () => updatePeriod({ 
    locked: !period.locked,
    status: !period.locked ? "submitted" : "draft"
  });

  const handleGeneratePdf = async () => {
    setGeneratingPdf(true);
    await generateAIAPdf({
      project,
      period,
      lineItems,
      summaryValues: {
        originalContractSum,
        changeOrderNet,
        contractSumToDate,
        totalCompletedStored,
        totalRetainage,
        totalEarnedLessRetainage,
        previousCertificates,
        currentPaymentDue,
        balanceToFinish,
      },
    });
    setGeneratingPdf(false);
  };

  if (loading) return <div className="text-center py-16 text-gray-400">Loading...</div>;
  if (!period || !project) return <div className="text-center py-16 text-gray-400">Period not found.</div>;

  const backUrl = createPageUrl(`ProjectBilling?id=${project.id}`);

  // Compute G702 summary values
  const originalContractSum = project.contract_value || 0;
  const cumulativeCOAdditions = prevCOAdditions + (period.change_order_additions || 0);
  const cumulativeCODeductions = prevCODeductions + (period.change_order_deductions || 0);
  const changeOrderNet = cumulativeCOAdditions - cumulativeCODeductions;
  const contractSumToDate = originalContractSum + changeOrderNet;

  const cmLines = lineItems.filter(l => !l.is_general_conditions);
  const gcLines = lineItems.filter(l => l.is_general_conditions);
  const gcTotal = gcLines.reduce((s, l) => s + (l.work_this_period || 0) + (l.materials_this_period || 0), 0);

  const totalCompletedStored = lineItems.reduce((s, l) =>
    s + (l.previous_applications || 0) + (l.work_this_period || 0) + (l.materials_this_period || 0), 0);
  const totalRetainage = lineItems.reduce((s, l) => s + (l.retainage_amount || 0), 0);
  const totalEarnedLessRetainage = totalCompletedStored - totalRetainage;

  const previousCertificates = prevPeriodEarnedLessRetainage;
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
          <Button
            variant="outline" size="sm"
            className="gap-1 text-purple-700 border-purple-300 hover:bg-purple-50"
            onClick={() => setShowCOModal(true)}
            disabled={period.locked}
          >
            <PlusCircle className="w-3.5 h-3.5" /> Change Order
          </Button>
          <Button variant="outline" size="sm" className="gap-1 text-blue-700 border-blue-300" onClick={handleGeneratePdf} disabled={generatingPdf}>
            <Download className="w-3.5 h-3.5" /> {generatingPdf ? "Generating..." : "Generate PDF"}
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
                <div className="flex items-center border rounded-md px-3 h-9 bg-gray-50 text-sm text-green-700 font-medium gap-1">
                  <span className="text-gray-400">$</span>
                  {(prevCOAdditions + (period.change_order_additions || 0)).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  <span className="ml-auto text-xs text-gray-300 font-normal">via CO button ▲</span>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Change Order Deductions</label>
                <div className="flex items-center border rounded-md px-3 h-9 bg-gray-50 text-sm text-red-600 font-medium gap-1">
                  <span className="text-gray-400">$</span>
                  {(prevCODeductions + (period.change_order_deductions || 0)).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  <span className="ml-auto text-xs text-gray-300 font-normal">via CO button ▲</span>
                </div>
              </div>
            </div>
            {(changeOrderNet !== 0) && (
              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-3 text-xs text-gray-500">
                <span>Net Change Orders:</span>
                <span className={`font-semibold text-sm ${changeOrderNet >= 0 ? "text-green-700" : "text-red-600"}`}>
                  {changeOrderNet >= 0 ? "+" : ""}${Math.abs(changeOrderNet).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-gray-400">→ Contract Sum to Date:</span>
                <span className="font-semibold text-sm text-[#0f2a5e]">
                  ${contractSumToDate.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}
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
      {showCOModal && (
        <ChangeOrderModal
          open={showCOModal}
          onClose={() => setShowCOModal(false)}
          period={period}
          onSaved={loadAll}
        />
      )}
    </div>
  );
}