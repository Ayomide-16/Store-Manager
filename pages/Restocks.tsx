
import React, { useState, useRef, useMemo } from 'react';
import { useShop } from '../store';
import { formatCurrency, formatDate, downloadData, parseFile } from '../utils';
import { 
  Plus, Truck, Search, History, ChevronRight, Trash2, Calendar, 
  User, Package, Upload, X, CheckCircle, Download, FileDown, Printer 
} from 'lucide-react';
import FileActionMenu from '../components/FileActionMenu';

const Restocks: React.FC = () => {
  const { items, categories, restocks, processAdditiveRestockCSV, currentUser, shopName } = useShop();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [bulkPreview, setBulkPreview] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const parsedData = await parseFile(file);
      setBulkPreview(parsedData);
    } catch (err) {
      alert("Error parsing restock file.");
      console.error(err);
    }
  };

  const handleCommitBulkRestock = () => {
    processAdditiveRestockCSV(bulkPreview);
    setBulkPreview([]);
    setIsModalOpen(false);
  };

  const handleDownloadSheet = (format: 'csv' | 'xlsx' | 'pdf') => {
    if (format === 'pdf') {
      window.print();
      return;
    }

    const data = items.map(i => {
      const categoryName = categories.find(c => c.id === i.categoryId)?.name || i.categoryId || 'General';
      return {
        'Item': i.name,
        'Category': categoryName,
        'Selling Price (₦)': i.sellingPrice,
        'Cost Price (₦)': i.costPrice,
        'Quantity Bought': '' 
      };
    });
    const filename = `${shopName.replace(/\s+/g, '_')}_Restock_Trip_Sheet`;
    downloadData(data, filename, format);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Purchase Trip & Restocks</h1>
          <p className="text-slate-500 font-medium">Generate trip sheets or upload additive restock files.</p>
        </div>
        <div className="flex flex-wrap gap-2 no-print items-center">
          <FileActionMenu 
            label="Download Trip Sheet" 
            type="export" 
            onAction={handleDownloadSheet} 
            showPdf
          />
          <FileActionMenu 
            label="Upload Restock" 
            type="import" 
            onAction={() => setIsModalOpen(true)}
            className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-600/20 transition-all flex items-center gap-2 transform active:scale-95"
          />
        </div>
      </div>

      <div className="hidden print:block space-y-8">
        <div className="text-center pb-8 border-b-2 border-slate-900">
           <h2 className="text-3xl font-black uppercase">{shopName}</h2>
           <h3 className="text-xl font-bold text-slate-500">Inventory Purchase List</h3>
           <p className="text-slate-400 font-bold mt-2">Date: {new Date().toLocaleDateString()} &nbsp; Prepared By: {currentUser?.fullName}</p>
        </div>
        <table className="w-full text-left border-collapse border-2 border-slate-900">
           <thead>
             <tr className="bg-slate-50">
               <th className="p-4 border border-slate-900 font-black uppercase text-xs">Product Name</th>
               <th className="p-4 border border-slate-900 font-black uppercase text-xs">Category</th>
               <th className="p-4 border border-slate-900 font-black uppercase text-xs">Current Stock</th>
               <th className="p-4 border border-slate-900 font-black uppercase text-xs w-40 text-center">New Qty Bought</th>
               <th className="p-4 border border-slate-900 font-black uppercase text-xs w-40 text-center">Unit Cost (₦)</th>
             </tr>
           </thead>
           <tbody>
             {items.sort((a,b) => a.name.localeCompare(b.name)).map(item => (
               <tr key={item.id}>
                 <td className="p-4 border border-slate-900 font-bold">{item.name}</td>
                 <td className="p-4 border border-slate-900 text-xs font-medium">{categories.find(c => c.id === item.categoryId)?.name || 'General'}</td>
                 <td className="p-4 border border-slate-900 text-slate-400 font-medium text-center">{item.quantityInStock}</td>
                 <td className="p-4 border border-slate-900 bg-slate-50/20 h-12"></td>
                 <td className="p-4 border border-slate-900 bg-slate-50/20 h-12"></td>
               </tr>
             ))}
           </tbody>
        </table>
        <div className="pt-12 flex justify-between font-black uppercase text-xs">
           <p>Total Trip Expense: ₦____________________</p>
           <p>Authorized Signature: ____________________</p>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden no-print">
        <div className="p-8 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
           <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3">
             <History className="w-6 h-6 text-indigo-500" />
             Recent Purchase Records
           </h3>
        </div>
        <div className="divide-y divide-slate-50">
          {restocks.map(restock => (
            <div key={restock.id} className="p-8 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-inner">
                  <Truck className="w-7 h-7" />
                </div>
                <div>
                  <p className="font-black text-slate-900 text-lg leading-tight">{restock.supplierName}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5 flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5" /> {formatDate(restock.restockDate)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-black text-indigo-600">{formatCurrency(restock.totalAmount)}</p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Total Trip Value</p>
              </div>
            </div>
          ))}
          {restocks.length === 0 && (
            <div className="p-20 text-center text-slate-300 font-black uppercase text-xs tracking-widest italic">
              No recent restock records.
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-xl font-black text-slate-900">Upload Restock File</h3>
              <button onClick={() => setIsModalOpen(false)}><X className="w-6 h-6" /></button>
            </div>
            
            <div className="p-10 space-y-10">
              <div 
                className="border-4 border-dashed border-slate-100 rounded-[2.5rem] p-12 text-center cursor-pointer hover:bg-indigo-50 hover:border-indigo-100 transition-all group"
                onClick={() => fileInputRef.current?.click()}
              >
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv,.xlsx" className="hidden" />
                <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform shadow-lg shadow-indigo-600/10">
                  <Upload className="w-10 h-10" />
                </div>
                <p className="text-xl font-black text-slate-900 mb-3">Select CSV or Excel Trip File</p>
                <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-sm mx-auto text-center">
                  Format: <strong>Item, Category, Cost Price (₦), Quantity</strong><br/>
                  Quantities will be <span className="text-indigo-600 font-bold underline">added</span> to existing stock.
                </p>
              </div>

              {bulkPreview.length > 0 && (
                <div className="space-y-6 animate-in slide-in-from-bottom-6">
                  <div className="flex items-center justify-between p-6 bg-emerald-50 border border-emerald-100 rounded-[2rem]">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-lg"><CheckCircle className="w-6 h-6" /></div>
                      <div>
                        <p className="font-black text-slate-900 uppercase text-[10px] tracking-widest">{bulkPreview.length} items parsed</p>
                        <p className="text-xs text-emerald-700 font-bold">Trip data is ready for upload.</p>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={handleCommitBulkRestock}
                    className="w-full py-6 bg-indigo-600 text-white rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-2xl shadow-indigo-600/30 hover:bg-indigo-700 transition-all transform active:scale-95"
                  >
                    Confirm & Update Inventory
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Restocks;
