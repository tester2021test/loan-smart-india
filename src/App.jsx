import React, { useState, useEffect, useMemo } from 'react';
import { 
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend 
} from 'recharts';
import { 
  Calculator, ChevronDown, ChevronUp, Download, Info, 
  IndianRupee, TrendingDown, PiggyBank, Calendar, 
  CheckCircle2, AlertCircle, Save, Share2, Menu 
} from 'lucide-react';

// --- Utility Functions ---

const formatCurrency = (value) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
};

const formatCurrencyCompact = (value) => {
  if (value >= 10000000) return `₹ ${(value / 10000000).toFixed(2)} Cr`;
  if (value >= 100000) return `₹ ${(value / 100000).toFixed(2)} L`;
  return formatCurrency(value);
};

// --- Components ---

const InputSlider = ({ label, value, onChange, min, max, step, unit, suffix = "" }) => {
  const handleInputChange = (e) => {
    const val = e.target.value === '' ? '' : Number(e.target.value);
    onChange(val);
  };

  const handleBlur = () => {
    if (value < min) onChange(min);
    if (value > max * 2) onChange(max * 2); // Allow some flexibility above slider max
  };

  return (
    <div className="mb-6">
      <div className="flex flex-row justify-between items-center mb-3">
        <label className="text-gray-700 font-semibold text-sm sm:text-base flex-1 mr-2">
          {label}
        </label>
        <div className="flex items-center bg-indigo-50 rounded-lg border border-indigo-100 px-2 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:bg-white transition-all">
          {unit === '₹' && <span className="text-indigo-400 text-sm font-medium mr-1">₹</span>}
          <input
            type="number"
            value={value}
            onChange={handleInputChange}
            onBlur={handleBlur}
            className="w-24 sm:w-32 py-2 text-right bg-transparent font-bold text-indigo-700 focus:outline-none text-sm sm:text-base placeholder-indigo-300"
            placeholder="0"
          />
          {suffix && <span className="text-indigo-400 text-sm font-medium ml-1">{suffix}</span>}
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={typeof value === 'number' ? Math.min(value, max) : min}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 hover:accent-indigo-700 transition-all touch-action-manipulation"
      />
      <div className="flex justify-between text-xs text-gray-400 mt-2">
        <span>{unit === '₹' ? formatCurrencyCompact(min) : `${min} ${suffix}`}</span>
        <span>{unit === '₹' ? formatCurrencyCompact(max) : `${max} ${suffix}`}</span>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, subtext, icon: Icon, colorClass, highlight = false }) => (
  <div className={`p-5 rounded-2xl border transition-all duration-300 ${highlight ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' : 'bg-white border-gray-100 shadow-sm'}`}>
    <div className="flex justify-between items-start mb-2">
      <p className={`text-sm font-medium ${highlight ? 'text-indigo-100' : 'text-gray-500'}`}>{title}</p>
      {Icon && <Icon size={18} className={highlight ? 'text-indigo-200' : colorClass} />}
    </div>
    <h3 className="text-2xl font-bold mb-1 truncate">{value}</h3>
    {subtext && <p className={`text-xs ${highlight ? 'text-indigo-200' : 'text-gray-400'}`}>{subtext}</p>}
  </div>
);

// --- Main Application ---

export default function IndianHomeLoanCalculator() {
  // --- State ---
  const [loanAmount, setLoanAmount] = useState(5000000); // 50 Lakhs
  const [interestRate, setInterestRate] = useState(8.5);
  const [tenureYears, setTenureYears] = useState(20);
  const [tenureMonths, setTenureMonths] = useState(0);
  
  // Prepayment State
  const [monthlyPrepayment, setMonthlyPrepayment] = useState(0);
  const [annualPrepayment, setAnnualPrepayment] = useState(0);
  const [prepaymentStartYear, setPrepaymentStartYear] = useState(1);
  
  // Settings
  const [taxSlab, setTaxSlab] = useState(30); // 30% slab
  const [activeTab, setActiveTab] = useState('summary');
  
  // --- Calculations ---

  const calculations = useMemo(() => {
    // Safety check for NaN
    const safeLoanAmount = loanAmount || 0;
    const safeRate = interestRate || 0;
    const safeTenureYears = tenureYears || 0;
    const safeTenureMonths = tenureMonths || 0;

    const principal = safeLoanAmount;
    const ratePerMonth = safeRate / 12 / 100;
    const totalMonths = (safeTenureYears * 12) + safeTenureMonths;
    
    // Standard EMI Formula
    let emi = 0;
    if (ratePerMonth > 0 && totalMonths > 0) {
        emi = Math.round((principal * ratePerMonth * Math.pow(1 + ratePerMonth, totalMonths)) / (Math.pow(1 + ratePerMonth, totalMonths) - 1));
    }
    
    // --- Prepayment Scenario (This is now the SOURCE OF TRUTH for the schedule if prepayments exist) ---
    
    let prepayBalance = principal;
    let prepayTotalInterest = 0;
    let prepayMonths = 0;
    let prepayYearlyData = []; 
    
    // Trackers for the loop
    let ppCurrentYearInterest = 0;
    let ppCurrentYearPrincipal = 0;
    
    // We run a loop that simulates month by month.
    // If no prepayment, this loop behaves exactly like a standard loan.
    // If prepayment exists, it finishes early.
    // Limit loop to avoid infinite loops in edge cases (2x tenure is safe)
    const maxLoop = totalMonths * 2 || 1200; 

    for (let i = 1; i <= maxLoop; i++) { 
      if (prepayBalance <= 0) break;

      const interestForMonth = prepayBalance * ratePerMonth;
      let monthlyPayment = emi;
      
      // Add Monthly Prepayment
      if (i >= prepaymentStartYear * 12) {
        monthlyPayment += (monthlyPrepayment || 0);
      }
      
      // Add Annual Prepayment (in the 12th month of the year)
      // Note: We check if it is the 12th month (i % 12 === 0) 
      // AND if the current year count (i/12) is >= start year
      if (i % 12 === 0 && (i / 12) >= prepaymentStartYear) {
         monthlyPayment += (annualPrepayment || 0);
      }

      // Cap payment to balance (Last Month Logic)
      let principalForMonth = monthlyPayment - interestForMonth;
      
      // If payment is more than balance + interest, we just pay off balance
      if (monthlyPayment > (prepayBalance + interestForMonth)) {
          monthlyPayment = prepayBalance + interestForMonth;
          principalForMonth = prepayBalance;
      }

      prepayBalance -= principalForMonth;
      prepayTotalInterest += interestForMonth;
      prepayMonths++;
      
      ppCurrentYearInterest += interestForMonth;
      ppCurrentYearPrincipal += principalForMonth;

       // End of Year or End of Loan
       if (i % 12 === 0 || prepayBalance <= 0.1) { // 0.1 float tolerance
        // Tax Logic (Indian Context)
        const taxSaveInterest = Math.min(ppCurrentYearInterest, 200000) * (taxSlab / 100);
        const taxSavePrincipal = Math.min(ppCurrentYearPrincipal, 150000) * (taxSlab / 100);

        prepayYearlyData.push({
            year: Math.ceil(i/12),
            principalPaid: Math.round(ppCurrentYearPrincipal),
            interestPaid: Math.round(ppCurrentYearInterest),
            balance: Math.max(0, Math.round(prepayBalance)),
            taxSaved: Math.round(taxSaveInterest + taxSavePrincipal)
        });
        
        // Reset yearly trackers
        ppCurrentYearInterest = 0;
        ppCurrentYearPrincipal = 0;
       }
    }

    const prepayTotalAmount = principal + prepayTotalInterest;
    
    // --- Regular Loan Calculation (Just for comparison stats) ---
    // We only need the total interest to calculate "Savings"
    const standardTotalInterest = (emi * totalMonths) - principal;
    
    const savedInterest = Math.max(0, standardTotalInterest - prepayTotalInterest);
    const savedMonths = Math.max(0, totalMonths - prepayMonths);
    const savedYears = (savedMonths / 12).toFixed(1);

    return {
      emi,
      totalInterest: standardTotalInterest, // Original Interest
      totalAmount: principal + standardTotalInterest, // Original Total
      
      // The Schedule Data now comes from the Prepayment loop 
      // because that is the "Actual" schedule the user will follow
      finalSchedule: prepayYearlyData, 
      
      prepayTotalInterest,
      prepayTotalAmount,
      prepayMonths,
      savedInterest,
      savedYears,
      savedMonths
    };

  }, [loanAmount, interestRate, tenureYears, tenureMonths, monthlyPrepayment, annualPrepayment, prepaymentStartYear, taxSlab]);

  // --- Charts Data ---
  const pieData = [
    { name: 'Principal', value: loanAmount || 0, color: '#4F46E5' }, 
    { name: 'Interest', value: calculations.totalInterest, color: '#F87171' }, 
  ];

  const prepayPieData = [
    { name: 'Principal', value: loanAmount || 0, color: '#4F46E5' },
    { name: 'Interest', value: calculations.prepayTotalInterest, color: '#34D399' }, 
  ];

  // --- UI Handlers ---
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800 pb-10">
      
      {/* Navbar */}
      <nav className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <div className="flex items-center gap-2">
                <div className="bg-indigo-600 p-1.5 sm:p-2 rounded-lg">
                    <IndianRupee className="text-white h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <span className="font-bold text-lg sm:text-xl tracking-tight text-gray-900 leading-tight">
                    Loan<span className="text-indigo-600">Smart</span> India
                </span>
              </div>
              <span className="text-xs sm:text-sm font-medium text-gray-500 sm:border-l sm:pl-2 sm:border-gray-300">
                by Vivek Narkhede
              </span>
            </div>
            <div className="flex gap-2">
               <button 
                onClick={handlePrint}
                className="flex items-center gap-1 sm:gap-2 px-3 py-1.5 text-xs sm:text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
               >
                 <Download size={14} className="sm:w-4 sm:h-4" /> <span className="hidden sm:inline">Export</span>
               </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
          
          {/* Left Column: Inputs */}
          <div className="lg:col-span-4 space-y-4 sm:space-y-6">
            
            {/* Base Loan Inputs */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
                <Calculator className="text-indigo-600" size={20} /> Loan Details
              </h2>
              
              <InputSlider 
                label="Loan Amount" 
                value={loanAmount} 
                onChange={setLoanAmount} 
                min={100000} 
                max={50000000} 
                step={50000} 
                unit="₹" 
              />
              
              <InputSlider 
                label="Interest Rate" 
                value={interestRate} 
                onChange={setInterestRate} 
                min={1} 
                max={15} 
                step={0.1} 
                unit="%" 
                suffix="%" 
              />
              
              {/* Custom Tenure Input Section */}
              <div className="mb-6">
                <div className="flex flex-row justify-between items-center mb-3">
                  <label className="text-gray-700 font-semibold text-sm sm:text-base flex-1 mr-2">
                    Tenure
                  </label>
                  <div className="flex gap-2">
                      <div className="flex items-center bg-indigo-50 rounded-lg border border-indigo-100 px-2 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:bg-white transition-all">
                        <input
                          type="number"
                          value={tenureYears}
                          onChange={(e) => setTenureYears(Number(e.target.value))}
                          onBlur={() => {
                              if (tenureYears < 0) setTenureYears(0);
                              if (tenureYears > 30) setTenureYears(30);
                          }}
                          className="w-10 sm:w-16 py-2 text-right bg-transparent font-bold text-indigo-700 focus:outline-none text-sm sm:text-base placeholder-indigo-300"
                          placeholder="0"
                        />
                        <span className="text-indigo-400 text-sm font-medium ml-1">Yrs</span>
                      </div>
                      <div className="flex items-center bg-indigo-50 rounded-lg border border-indigo-100 px-2 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:bg-white transition-all">
                        <input
                          type="number"
                          value={tenureMonths}
                          onChange={(e) => {
                              let val = Number(e.target.value);
                              if (val > 11) val = 11;
                              if (val < 0) val = 0;
                              setTenureMonths(val);
                          }}
                          className="w-8 sm:w-12 py-2 text-right bg-transparent font-bold text-indigo-700 focus:outline-none text-sm sm:text-base placeholder-indigo-300"
                          placeholder="0"
                        />
                        <span className="text-indigo-400 text-sm font-medium ml-1">Mos</span>
                      </div>
                  </div>
                </div>
                <input
                  type="range"
                  min={1}
                  max={30}
                  step={1}
                  value={tenureYears}
                  onChange={(e) => setTenureYears(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 hover:accent-indigo-700 transition-all touch-action-manipulation"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-2">
                  <span>1 Yr</span>
                  <span>30 Yrs</span>
                </div>
              </div>
            </div>

            {/* Smart Prepayment Inputs */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3 opacity-10 pointer-events-none">
                <TrendingDown size={100} className="text-green-600" />
              </div>
              
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-900">
                <PiggyBank className="text-green-600" size={20} /> Prepayment
              </h2>
              <p className="text-sm text-gray-500 mb-6">See how small extra payments save lakhs.</p>

              <InputSlider 
                label="Extra Monthly" 
                value={monthlyPrepayment} 
                onChange={setMonthlyPrepayment} 
                min={0} 
                max={100000} 
                step={1000} 
                unit="₹" 
              />

              <InputSlider 
                label="Extra Annual" 
                value={annualPrepayment} 
                onChange={setAnnualPrepayment} 
                min={0} 
                max={500000} 
                step={10000} 
                unit="₹" 
              />
              
              {(monthlyPrepayment > 0 || annualPrepayment > 0) && (
                <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-100">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-sm mb-1 gap-2">
                    <span className="text-green-700 font-medium">Start Prepaying From Year:</span>
                    <select 
                      value={prepaymentStartYear} 
                      onChange={(e) => setPrepaymentStartYear(Number(e.target.value))}
                      className="bg-white border border-green-200 text-green-800 text-sm rounded-md p-1.5 focus:ring-green-500 focus:border-green-500 w-full sm:w-auto"
                    >
                      {[...Array(Math.max(1, tenureYears)).keys()].map(y => (
                        <option key={y+1} value={y+1}>{y+1}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Tax Settings */}
             <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-gray-100">
               <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                 <Info className="text-blue-500" size={20} /> Tax Settings
               </h2>
               <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                 <label className="text-sm text-gray-600">Your Income Tax Slab</label>
                 <select 
                  value={taxSlab} 
                  onChange={(e) => setTaxSlab(Number(e.target.value))}
                  className="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 w-full sm:w-auto"
                 >
                   <option value={0}>0% (Exempt)</option>
                   <option value={10}>10%</option>
                   <option value={20}>20%</option>
                   <option value={30}>30%</option>
                 </select>
               </div>
             </div>

          </div>

          {/* Right Column: Results */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Top Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard 
                title="Monthly EMI" 
                value={formatCurrency(calculations.emi)} 
                subtext="Fixed Monthly Payment"
                icon={Calendar}
                colorClass="text-gray-400"
                highlight={true}
              />
              <StatCard 
                title="Total Interest" 
                value={formatCurrencyCompact(calculations.totalInterest)} 
                subtext={`${((calculations.totalInterest/(calculations.totalAmount || 1))*100).toFixed(1)}% of total`}
                icon={TrendingDown}
                colorClass="text-red-500"
              />
              <StatCard 
                title="Total Amount" 
                value={formatCurrencyCompact(calculations.totalAmount)} 
                subtext={`Principal + Interest`}
                icon={IndianRupee}
                colorClass="text-gray-500"
              />
            </div>

            {/* Prepayment Impact Banner - Shows only if savings exist */}
            {(calculations.savedInterest > 0) && (
              <div className="bg-gradient-to-r from-emerald-500 to-green-600 rounded-2xl p-5 sm:p-6 text-white shadow-lg transform transition-all hover:scale-[1.01]">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
                  <div>
                    <h3 className="text-lg font-semibold text-emerald-100 mb-1 flex items-center justify-center md:justify-start gap-2">
                      <CheckCircle2 size={20}/> Smart Strategy Active!
                    </h3>
                    <p className="text-3xl font-bold">
                      Save {formatCurrencyCompact(calculations.savedInterest)}
                    </p>
                    <p className="text-emerald-100 text-sm mt-1">
                      Loan finishes <span className="font-bold text-white">{calculations.savedYears} years</span> earlier!
                    </p>
                  </div>
                  <div className="bg-white/20 p-4 rounded-xl backdrop-blur-sm border border-white/10 min-w-[200px] w-full md:w-auto">
                     <div className="text-xs text-emerald-100 uppercase tracking-wider mb-1">New Tenure</div>
                     <div className="text-2xl font-bold">{(calculations.prepayMonths/12).toFixed(1)} Years</div>
                     <div className="text-xs text-emerald-50 mt-1">vs {tenureYears} Years originally</div>
                  </div>
                </div>
              </div>
            )}

            {/* Visual Analysis Tabs */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden min-h-[500px]">
              <div className="flex border-b overflow-x-auto">
                <button 
                  onClick={() => setActiveTab('summary')}
                  className={`flex-1 py-4 px-4 text-sm font-medium whitespace-nowrap transition-colors ${activeTab === 'summary' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Visual Analysis
                </button>
                <button 
                   onClick={() => setActiveTab('schedule')}
                   className={`flex-1 py-4 px-4 text-sm font-medium whitespace-nowrap transition-colors ${activeTab === 'schedule' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Schedule
                </button>
                 <button 
                   onClick={() => setActiveTab('tax')}
                   className={`flex-1 py-4 px-4 text-sm font-medium whitespace-nowrap transition-colors ${activeTab === 'tax' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Tax Savings
                </button>
              </div>

              <div className="p-4 sm:p-6">
                {activeTab === 'summary' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center h-full">
                    <div className="h-64 relative">
                      <h4 className="text-center text-sm font-semibold text-gray-500 mb-4">Original Loan Split</h4>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <RechartsTooltip formatter={(value) => formatCurrencyCompact(value)} />
                          <Legend verticalAlign="bottom" height={36} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none mt-2">
                        <div className="text-xs text-gray-400">Total</div>
                        <div className="font-bold text-gray-700 text-xs sm:text-sm">{formatCurrencyCompact(calculations.totalAmount)}</div>
                      </div>
                    </div>

                    <div className="h-64 relative">
                       <h4 className="text-center text-sm font-semibold text-gray-500 mb-4">With Prepayment</h4>
                       <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={prepayPieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {prepayPieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <RechartsTooltip formatter={(value) => formatCurrencyCompact(value)} />
                          <Legend verticalAlign="bottom" height={36} />
                        </PieChart>
                      </ResponsiveContainer>
                       <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none mt-2">
                        <div className="text-xs text-gray-400">New Total</div>
                        <div className="font-bold text-gray-700 text-xs sm:text-sm">{formatCurrencyCompact(calculations.prepayTotalAmount)}</div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'schedule' && (
                  <div className="overflow-x-auto -mx-4 sm:mx-0">
                    <div className="min-w-full inline-block align-middle">
                        <div className="border rounded-lg overflow-hidden">
                            <table className="min-w-full text-sm text-left">
                              <thead className="bg-gray-50 text-gray-600 font-medium">
                                <tr>
                                  <th className="px-4 py-3">Year</th>
                                  <th className="px-4 py-3">Principal</th>
                                  <th className="px-4 py-3">Interest</th>
                                  <th className="px-4 py-3 text-right">Balance</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100 bg-white">
                                {calculations.finalSchedule.map((row) => (
                                  <tr key={row.year} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3 font-medium text-indigo-600 whitespace-nowrap">Year {row.year}</td>
                                    <td className="px-4 py-3 whitespace-nowrap">{formatCurrency(row.principalPaid)}</td>
                                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatCurrency(row.interestPaid)}</td>
                                    <td className="px-4 py-3 text-right font-mono whitespace-nowrap">{formatCurrency(row.balance)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                        </div>
                    </div>
                  </div>
                )}

                {activeTab === 'tax' && (
                   <div className="space-y-6">
                     <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-start gap-3">
                        <AlertCircle className="text-blue-600 mt-1 flex-shrink-0" size={20} />
                        <div>
                          <h4 className="font-bold text-blue-800 text-sm sm:text-base">Tax Benefit Estimation</h4>
                          <p className="text-xs sm:text-sm text-blue-700 mt-1">
                            Based on Old Tax Regime. Saves tax under Section 80C (Principal, max ₹1.5L) and Section 24b (Interest, max ₹2L).
                          </p>
                        </div>
                     </div>

                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       <div className="p-4 border rounded-xl bg-gray-50">
                         <div className="text-gray-500 text-sm mb-1">Max Yearly Principal Deduction</div>
                         <div className="text-xl font-bold">₹ 1,50,000</div>
                         <div className="text-xs text-gray-400 mt-1">Section 80C</div>
                       </div>
                       <div className="p-4 border rounded-xl bg-gray-50">
                         <div className="text-gray-500 text-sm mb-1">Max Yearly Interest Deduction</div>
                         <div className="text-xl font-bold">₹ 2,00,000</div>
                         <div className="text-xs text-gray-400 mt-1">Section 24(b)</div>
                       </div>
                     </div>

                     <h4 className="font-bold text-gray-700 mt-4">Yearly Tax Saving Schedule (Estimated)</h4>
                     <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={calculations.finalSchedule.slice(0, 15)}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="year" tick={{fontSize: 12}} />
                            <YAxis tickFormatter={(val) => `₹${val/1000}k`} tick={{fontSize: 12}} />
                            <RechartsTooltip formatter={(value) => formatCurrency(value)} />
                            <Bar dataKey="taxSaved" name="Tax Saved" fill="#818CF8" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                     </div>
                   </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="mt-12 border-t pt-8 text-center text-gray-400 text-sm">
          <p>© 2024 Indian LoanSmart Calculator. Built for financial freedom.</p>
          <p className="mt-2 text-xs">Disclaimer: This tool provides estimates. Bank policies and floating interest rates may vary. Tax laws are subject to change.</p>
        </div>

      </main>
    </div>
  );
}
