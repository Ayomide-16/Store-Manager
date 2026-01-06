import React, { useState } from 'react';
import { useShop } from '../store';
import { UserRole, User } from '../types';
import { Plus, UserPlus, Shield, User as UserIcon, Mail, Trash2, Edit2, ShieldAlert, X, Settings, RefreshCw, AlertCircle, WifiOff, Loader2 } from 'lucide-react';

const UserManagement: React.FC = () => {
  const { users, currentUser, addUser, syncUsers, updateUserAccount, deleteUserAccount, error: globalError } = useShop();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    role: UserRole.SALESPERSON,
    password: ''
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await syncUsers();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingUserId) {
        await updateUserAccount(editingUserId, {
          fullName: formData.fullName,
          email: formData.email,
          role: formData.role
        });
      } else {
        await addUser({
          email: formData.email,
          fullName: formData.fullName,
          role: formData.role,
          password: formData.password
        });
      }
      closeModal();
    } catch (err: any) {
      alert("Error managing user: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (user: User) => {
    setEditingUserId(user.id);
    setFormData({
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      password: ''
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isSubmitting) return;
    setIsModalOpen(false);
    setEditingUserId(null);
    setFormData({ fullName: '', email: '', role: UserRole.SALESPERSON, password: '' });
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await deleteUserAccount(deleteConfirmId);
      setDeleteConfirmId(null);
    } catch (err: any) {
      alert("Delete failed: " + (err.message || "Unknown error"));
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Staff Management</h1>
          <p className="text-slate-500 font-medium">Add staff members and assign their shop access roles.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={`p-3 bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 rounded-xl transition-all shadow-sm ${isRefreshing ? 'animate-spin opacity-50' : ''}`}
            title="Refresh Staff List"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-600/20 transition-all flex items-center gap-2 transform active:scale-95"
          >
            <UserPlus className="w-5 h-5" />
            Add New Member
          </button>
        </div>
      </div>

      {globalError && (
        <div className="bg-rose-50 border border-rose-100 p-6 rounded-3xl flex items-start gap-5 animate-in slide-in-from-top-4 duration-300">
          <div className="w-12 h-12 bg-rose-600 text-white rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-rose-600/20">
            <WifiOff className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-black text-rose-900 uppercase tracking-widest mb-1">Database Connection Lost</h4>
            <p className="text-xs text-rose-700 font-medium leading-relaxed">{globalError}</p>
            <button onClick={handleRefresh} className="mt-3 text-[10px] font-black uppercase text-rose-900 bg-white px-3 py-1.5 rounded-lg border border-rose-200 hover:bg-rose-100 transition-all">Retry Connection</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {users.map(user => (
          <div key={user.id} className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between group hover:shadow-md transition-all relative overflow-hidden">
            {user.id === currentUser?.id && (
              <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[8px] font-black uppercase px-3 py-1 rounded-bl-xl">YOU</div>
            )}
            
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner ${user.role === UserRole.ADMIN ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-100 text-emerald-600'}`}>
                  {user.fullName ? user.fullName[0].toUpperCase() : '?'}
                </div>
                <div>
                  <h4 className="font-black text-slate-900 leading-tight">{user.fullName}</h4>
                  <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mt-1"><Mail className="w-3.5 h-3.5 opacity-50" /> {user.email}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 ${user.role === UserRole.ADMIN ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'}`}>
                  {user.role === UserRole.ADMIN ? <Shield className="w-3.5 h-3.5" /> : <UserIcon className="w-3.5 h-3.5" />}
                  {user.role}
                </div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Joined {new Date(user.createdAt).toLocaleDateString()}</span>
              </div>
              
              <div className="flex gap-2 pt-4 border-t border-slate-50 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                {user.id !== currentUser?.id ? (
                  <>
                    <button 
                      onClick={() => openEditModal(user)}
                      className="flex-1 py-2.5 bg-slate-50 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-50 hover:text-indigo-600 transition-all flex items-center justify-center gap-2"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button 
                      onClick={() => setDeleteConfirmId(user.id)}
                      className="flex-1 py-2.5 bg-rose-50 text-rose-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-100 transition-all flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </>
                ) : (
                  <div className="w-full py-2 px-3 bg-indigo-50 text-indigo-600 rounded-xl text-[9px] font-bold text-center leading-relaxed italic">
                    Use Account Settings in the header to modify your profile.
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={closeModal}></div>
          <div className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-xl font-black text-slate-900">{editingUserId ? 'Update Staff Member' : 'Add Staff Member'}</h3>
              <button disabled={isSubmitting} onClick={closeModal} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-white"><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-5">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Full Name</label>
                <input 
                  type="text" required placeholder="e.g. Adebayo Musa"
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                  value={formData.fullName}
                  onFocus={e => e.target.select()}
                  onChange={e => setFormData({...formData, fullName: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Email Address</label>
                <input 
                  type="email" required placeholder="adebayo@shop.com"
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                  value={formData.email}
                  onFocus={e => e.target.select()}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Access Role</label>
                <select 
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                  value={formData.role}
                  onChange={e => setFormData({...formData, role: e.target.value as UserRole})}
                >
                  <option value={UserRole.SALESPERSON}>Salesperson (Transaction logging only)</option>
                  <option value={UserRole.ADMIN}>Admin (Full shop access)</option>
                </select>
              </div>
              {!editingUserId && (
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Initial Password</label>
                  <input 
                    type="password" required placeholder="••••••••"
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                    value={formData.password}
                    onFocus={e => e.target.select()}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                  />
                </div>
              )}
              
              <div className="bg-amber-50 p-5 rounded-2xl border border-amber-100 flex gap-4 mt-4">
                <ShieldAlert className="w-6 h-6 text-amber-600 shrink-0" />
                <p className="text-[10px] text-amber-800 leading-relaxed font-black uppercase tracking-wider">Admins can view profit data, POS configuration, and process returns. Salespeople are limited to logging transactions and viewing inventory.</p>
              </div>
              
              <div className="flex gap-3 pt-6">
                <button type="button" disabled={isSubmitting} onClick={closeModal} className="flex-1 py-4 font-black text-[10px] uppercase tracking-widest text-slate-400 hover:text-slate-600">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/20 transform active:scale-95 flex items-center justify-center gap-2">
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingUserId ? 'Apply Changes' : 'Confirm & Add Member')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirmId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => setDeleteConfirmId(null)}></div>
          <div className="relative bg-white w-full max-w-sm rounded-[2rem] shadow-2xl p-8 animate-in zoom-in duration-200 text-center">
            <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2">Delete Staff Member?</h3>
            <p className="text-slate-500 text-sm mb-8">This action is permanent. This staff member will lose access to the shop immediately.</p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={confirmDelete}
                className="w-full py-4 bg-rose-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-rose-600/20 active:scale-95 transition-all"
              >
                Yes, Delete User
              </button>
              <button 
                onClick={() => setDeleteConfirmId(null)}
                className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all"
              >
                No, Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;