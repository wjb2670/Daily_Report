import React from "react";

const fmt = (val) =>
  val == null ? "$0.00" : `$${Math.abs(val).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function G702Summary({
  originalContractSum,
  changeOrderNet,
  contractSumToDate,
  totalCompletedStored,
  totalRetainage,
  totalEarnedLessRetainage,
  previousCertificates,
  currentPaymentDue,
  balanceToFinish,
}) {
  const rows = [
    { num: "1.", label: "Original Contract Sum", value: fmt(originalContractSum) },
    { num: "2.", label: "Net Change by Change Orders", value: fmt(changeOrderNet) },
    { num: "3.", label: "Contract Sum to Date", value: fmt(contractSumToDate) },
    { num: "4.", label: "Total Completed & Stored", value: fmt(totalCompletedStored) },
    { num: "5.", label: "Retainage", value: fmt(totalRetainage), highlight: "text-orange-500" },
    { num: "6.", label: "Total Earned Less Retainage", value: fmt(totalEarnedLessRetainage) },
    { num: "7.", label: "Less Previous Certificates", value: fmt(previousCertificates) },
  ];

  return (
    <div className="bg-[#0f2a5e] text-white rounded-xl shadow-lg p-5">
      <h3 className="font-bold text-sm mb-4 text-blue-100">Application Summary (G702)</h3>

      <div className="space-y-3">
        {rows.map(({ num, label, value, highlight }) => (
          <div key={num} className="flex justify-between items-start gap-2">
            <div className="text-xs text-blue-200 leading-tight">
              <span className="font-semibold">{num}</span> {label}
            </div>
            <div className={`text-sm font-semibold whitespace-nowrap ${highlight || "text-white"}`}>
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* Current Payment Due */}
      <div className="mt-4 pt-4 border-t border-white/20">
        <div className="text-xs text-blue-200 mb-1">8. Current Payment Due</div>
        <div className="text-3xl font-bold text-white">
          {fmt(currentPaymentDue)}
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-white/20 text-xs text-blue-300">
        Balance to Finish: {fmt(balanceToFinish)}
      </div>
    </div>
  );
}