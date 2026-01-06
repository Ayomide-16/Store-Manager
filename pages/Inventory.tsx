import React, { useState, useRef, useMemo } from 'react';
import { useShop } from '../store';
import { UserRole, Item } from '../types';
import { formatCurrency, downloadData, parseFile, formatDate, generateSKU } from '../utils';
import { 
  Plus, Search, Edit2, Package, Upload, X, CheckCircle, 
  Download, Tag as TagIcon, Clock, FileDown, Layers, ChevronRight, Info,
  AlertTriangle, History, RefreshCw, Trash2, Loader2, Save, Scissors
} from 'lucide-react';
import FileActionMenu from '../components/FileActionMenu';
import ConfirmationModal from '../components/ConfirmationModal';

const Inventory: React.FC = () => {
  const { 
    currentUser, items, categories, shopName,
    addItem, addItems, updateItem, deleteItem, addCategory, clearInventory
  } = useShop();
  
  const isAdmin = currentUser?.role === UserRole.ADMIN;
  
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedDetailItem, setSelectedDetailItem] = useState<Item | null>(null);
  const [bulkPreview, setBulkPreview] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Custom Confirmation States
  const [showWipeConfirm, setShowWipeConfirm] = useState(false);

  const [newItem, setNewItem] = useState({
    id: '',
    name: '',
    categoryId: '',
    newCategoryName: '',
    sellingPrice: 0,
    costPrice: 0,
    quantityInStock: 0,
    reorderLevel: 5,
    unit: 'pcs',
    allowFractional: false
  });

  const parseNaira = (val: any): number => {
    if (val === undefined || val === null || val === '') return 0;
    const cleaned = String(val).replace(/[^\d.]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  const filteredItems = useMemo(() => {
    const tokens = searchTerm.toLowerCase().trim().split(/\s+/).filter(Boolean);
    return items.filter(item => {
      if (categoryFilter !== 'all' && item.categoryId !== categoryFilter) return false;
      if (tokens.length === 0) return true;
      const itemInfo = `${item.name} ${item.sku} ${item.categoryId}`.toLowerCase();
      return tokens.every(token => itemInfo.includes(token));
    });
  }, [items, searchTerm, categoryFilter]);

  const handleExport = (format: 'csv' | 'xlsx' | 'pdf') => {
    if (format === 'pdf') {
      window.print();
      return;
    }
    const data = filteredItems.map(i => ({
      Item: i.name,
      Category: categories.find(c => c.id === i.categoryId)?.name || 'General',
      'Selling Price (₦)': i.sellingPrice,
      'Cost Price (₦)': i.costPrice,
      'Profit (₦)': i.sellingPrice - i.costPrice,
      Quantity: i.quantityInStock,
      'Fractional Selling': i.allowFractional ? 'Yes' : 'No'
    }));
    const filename = `${shopName.replace(/\s+/g, '_')}_Inventory`;
    downloadData(data, filename, format);
  };

  const handleWipe = async () => {
    setIsImporting(true);
    try {
      await clearInventory();
      setShowWipeConfirm(false);
    } catch (err: any) {
      alert("Error clearing inventory: " + (err.message || JSON.stringify(err)));
    } finally {
      setIsImporting(false);
    }
  };

  const openAddModal = () => {
    setIsEditMode(false);
    setNewItem({ id: '', name: '', categoryId: '', newCategoryName: '', sellingPrice: 0, costPrice: 0, quantityInStock: 0, reorderLevel: 5, unit: 'pcs', allowFractional: false });
    setIsAddModalOpen(true);
  };

  const openEditModal = (item: Item) => {
    setIsEditMode(true);
    setNewItem({
      id: item.id,
      name: item.name,
      categoryId: item.categoryId || '',
      newCategoryName: '',
      sellingPrice: item.sellingPrice,
      costPrice: item.costPrice,
      quantityInStock: item.quantityInStock,
      reorderLevel: item.reorderLevel,
      unit: item.unit,
      allowFractional: item.allowFractional === true
    });
    setIsAddModalOpen(true);
    setSelectedDetailItem(null);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isImporting) return;
    
    setIsImporting(true);
    try {
      let finalCategoryId = newItem.categoryId;
      if (newItem.categoryId === 'new' && newItem.newCategoryName) {
        finalCategoryId = await addCategory(newItem.newCategoryName);
      } else if (!finalCategoryId) {
        finalCategoryId = await addCategory('General');
      }

      const itemPayload = {
        name: newItem.name,
        categoryId: finalCategoryId,
        sellingPrice: Number(newItem.sellingPrice),
        costPrice: Number(newItem.costPrice),
        quantityInStock: Number(newItem.quantityInStock),
        reorderLevel: Number(newItem.reorderLevel),
        unit: newItem.unit,
        allowFractional: newItem.allowFractional === true
      };

      if (isEditMode && newItem.id) {
        await updateItem(newItem.id, itemPayload);
      } else {
        await addItem(itemPayload);
      }
      
      setIsAddModalOpen(false);
    } catch (err: any) {
      console.error("Save failure:", err);
      // Fixed: prevent [object Object] display
      alert("Error saving item: " + (err.message || (typeof err === 'string' ? err : JSON.stringify(err))));
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Inventory</h1>
          <p className="text-slate-500 font-medium">Manage product listing for {shopName}.</p>
        </div>
        <div className="flex flex-wrap gap-2 no-print items-center">
          <FileActionMenu label="Export Data" type="export" onAction={handleExport} showPdf />
          {isAdmin && (
            <>
              <button 
                onClick={() => setShowWipeConfirm(true)} 
                className="px-4 py-2 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl font-bold hover:bg-rose-100 flex items-center gap-2 shadow-sm transition-all active:scale-95 text-xs"
              >
                <Trash2 className="w-4 h-4" /> Wipe
              </button>
              <button onClick={openAddModal} className="px-4 py-2 bg-slate-900 text-white rounded-xl font-bold hover:bg-black flex items-center gap-2 shadow-xl transition-all active:scale-95 text-xs">
                <Plus className="w-4 h-4" /> New Product
              </button>
              <FileActionMenu label="Bulk Upload" type="import" onAction={() => setIsBulkModalOpen(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 flex items-center gap-2 shadow-xl shadow-indigo-600/20 transition-all active:scale-95 text-xs" />
            </>
          )}
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 no-print">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input type="text" placeholder="Search products..." className="w-full pl-10 pr-4 py-3 bg-slate-50 border-transparent rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <select className="px-4 py-3 bg-slate-50 border-transparent rounded-xl outline-none font-bold text-slate-600" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="all">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden print:border-0 print:shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
              <tr>
                <th className="px-8 py-5">Product Name</th>
                <th className="px-8 py-5">Category</th>
                <th className="px-8 py-5">Stock Level</th>
                <th className="px-8 py-5">Selling Price</th>
                <th className="px-8 py-5 text-right no-print">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.map(item => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer group" onClick={() => setSelectedDetailItem(item)}>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2">
                      <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{item.name}</div>
                      {item.allowFractional && (
                        <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-500 rounded text-[8px] font-black uppercase tracking-tighter">Part-Sales</span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">{item.sku}</div>
                  </td>
                  <td className="px-8 py-5 text-sm font-medium">{categories.find(c => c.id === item.categoryId)?.name || 'N/A'}</td>
                  <td className={`px-8 py-5 font-black ${item.quantityInStock <= item.reorderLevel ? 'text-rose-600' : 'text-slate-900'}`}>{item.quantityInStock} {item.unit}</td>
                  <td className="px-8 py-5 font-black text-slate-900">{formatCurrency(item.sellingPrice)}</td>
                  <td className="px-8 py-5 text-right no-print">
                    <button className="p-2 text-slate-300 hover:text-indigo-600 transition-colors"><Info className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isImporting && setIsAddModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-xl font-black text-slate-900 tracking-tight">{isEditMode ? 'Edit Product' : 'Add New Product'}</h3>
              <button disabled={isImporting} onClick={() => setIsAddModalOpen(false)}><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleSaveItem} className="p-8 space-y-5 overflow-y-auto max-h-[75vh] custom-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Product Name</label>
                  <input required className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Category</label>
                  <select className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold" value={newItem.categoryId} onChange={e => setNewItem({...newItem, categoryId: e.target.value})}>
                    <option value="">Select Category</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    <option value="new">+ Create New</option>
                  </select>
                </div>
                {newItem.categoryId === 'new' && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">New Category Name</label>
                    <input required className="w-full px-5 py-3 bg-indigo-50 border border-indigo-200 rounded-xl font-bold" value={newItem.newCategoryName} onChange={e => setNewItem({...newItem, newCategoryName: e.target.value})} />
                  </div>
                )}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Unit</label>
                  <input className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold" value={newItem.unit} onChange={e => setNewItem({...newItem, unit: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cost Price (₦)</label>
                  <input type="number" step="any" className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold" value={newItem.costPrice || ''} onFocus={e => e.target.select()} onChange={e => setNewItem({...newItem, costPrice: Number(e.target.value)})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Selling Price (₦)</label>
                  <input type="number" step="any" required className="w-full px-5 py-3 bg-indigo-50 border border-indigo-200 rounded-xl font-bold text-indigo-700" value={newItem.sellingPrice || ''} onFocus={e => e.target.select()} onChange={e => setNewItem({...newItem, sellingPrice: Number(e.target.value)})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Stock Level</label>
                  <input type="number" step="any" className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold" value={newItem.quantityInStock || ''} onFocus={e => e.target.select()} onChange={e => setNewItem({...newItem, quantityInStock: Number(e.target.value)})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Reorder Level</label>
                  <input type="number" step="any" className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold" value={newItem.reorderLevel || ''} onFocus={e => e.target.select()} onChange={e => setNewItem({...newItem, reorderLevel: Number(e.target.value)})} />
                </div>
              </div>

              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white text-indigo-600 rounded-xl flex items-center justify-center shadow-sm border border-slate-100"><Scissors className="w-5 h-5" /></div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900">Fractional Selling</h4>
                      <p className="text-[10px] text-slate-500 font-medium">Allow sales of portions (1/2, 1/4, etc).</p>
                    </div>
                  </div>
                  <div 
                    onClick={() => setNewItem({...newItem, allowFractional: !newItem.allowFractional})}
                    className={`w-14 h-8 rounded-full p-1 cursor-pointer transition-colors duration-200 ease-in-out ${newItem.allowFractional ? 'bg-indigo-600' : 'bg-slate-300'}`}
                  >
                    <div className={`bg-white w-6 h-6 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${newItem.allowFractional ? 'translate-x-6' : 'translate-x-0'}`} />
                  </div>
                </div>
              </div>

              <button type="submit" disabled={isImporting} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2">
                {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isEditMode ? 'Update Product' : 'Save Product'}
              </button>
            </form>
          </div>
        </div>
      )}

      {selectedDetailItem && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedDetailItem(null)}></div>
          <div className="relative bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="bg-indigo-600 p-8 text-white relative">
              <h3 className="text-3xl font-black tracking-tight">{selectedDetailItem.name}</h3>
              <p className="text-indigo-100 font-black uppercase text-[10px] tracking-widest mt-2">{selectedDetailItem.sku}</p>
              {isAdmin && <button onClick={() => openEditModal(selectedDetailItem)} className="absolute top-8 right-8 p-3 bg-white/20 hover:bg-white/30 text-white rounded-2xl transition-all"><Edit2 className="w-5 h-5" /></button>}
            </div>
            <div className="p-10 grid grid-cols-2 gap-8">
               <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Stock Availability</p>
                  <p className="text-3xl font-black text-slate-900">{selectedDetailItem.quantityInStock} {selectedDetailItem.unit}</p>
               </div>
               <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Sale Price</p>
                  <p className="text-3xl font-black text-indigo-600">{formatCurrency(selectedDetailItem.sellingPrice)}</p>
               </div>
               {selectedDetailItem.allowFractional && (
                 <div className="col-span-2 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center gap-3">
                   <Scissors className="w-5 h-5 text-indigo-600" />
                   <p className="text-xs font-bold text-indigo-800 uppercase tracking-widest">Supports Fractional Selling</p>
                 </div>
               )}
            </div>
            <div className="p-10 pt-0">
               <button onClick={() => setSelectedDetailItem(null)} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl transform active:scale-95 transition-all">Close Details</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modals */}
      <ConfirmationModal 
        isOpen={showWipeConfirm}
        onClose={() => setShowWipeConfirm(false)}
        onConfirm={handleWipe}
        title="Wipe Inventory?"
        message="This action will delete every product currently stored in your shop. This cannot be undone."
        confirmLabel="Yes, Wipe Everything"
        variant="danger"
        isLoading={isImporting}
      />
    </div>
  );
};

export default Inventory;