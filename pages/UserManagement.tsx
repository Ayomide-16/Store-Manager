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
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight font-medium text-slate-900 tracking-tight ">Staff Management</h1>
          <p className="text-slate-500 font-medium text-sm  tracking-normal mt-2">Add staff members and assign their shop access roles.</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={`w-12 h-12 flex items-center justify-center bg-white border border-slate-200 rounded-2xl text-slate-900 hover:bg-slate-50 transition-all shadow-[0_2px_10px_rgb(0,0,0,0.02)] hover:-translate-y-0.5 hover:shadow-sm ${isRefreshing ? 'animate-spin opacity-50' : ''}`}
            title="Refresh Staff List"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 text-white border border-slate-200 rounded-2xl px-6 py-3 font-medium font-bold text-xs  tracking-normal shadow-[0_2px_10px_rgb(0,0,0,0.02)] transition-all flex items-center justify-center gap-3 hover:-translate-y-0.5 hover:shadow-[0_2px_10px_rgb(0,0,0,0.02)]"
          >
            <UserPlus className="w-5 h-5" />
            Add New Member
          </button>
        </div>
      </div>

      {globalError && (
        <div className="bg-red-50 border-4 border-red-600 p-6 flex items-start gap-5 animate-in slide-in-from-top-4 duration-300 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="w-12 h-12 bg-red-600 text-white flex items-center justify-center shrink-0 border-2 border-red-900">
            <WifiOff className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold tracking-tight font-medium text-red-900  tracking-normal mb-1 text-lg">Database Connection Lost</h4>
            <p className="font-medium text-sm text-red-700 leading-relaxed max-w-2xl">{globalError}</p>
            <button onClick={handleRefresh} className="mt-4 text-xs font-medium font-bold  text-white bg-red-600 px-4 py-2 border-2 border-red-900 hover:bg-red-700 transition-all shadow-[0_2px_10px_rgb(0,0,0,0.02)] hover:-translate-y-0.5 hover:shadow-sm">Retry Connection</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {users.map(user => (
          <div key={user.id} className="bg-white p-8 border border-slate-200 rounded-[2rem] shadow-sm bg-white/80 backdrop-blur-xl ring-1 ring-slate-100/50 shadow-[0_2px_10px_rgb(0,0,0,0.02)] flex flex-col justify-between group relative overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-[0_2px_10px_rgb(0,0,0,0.02)]">
            {user.id === currentUser?.id && (
              <div className="absolute top-0 right-0 bg-blue-600 text-white border-b-2 border-l-2 border-slate-200 text-[10px] font-medium font-bold  px-4 py-1">YOU</div>
            )}
            
            <div className="flex items-start justify-between mb-8">
              <div className="flex items-center gap-5">
                <div className={`w-16 h-16 border border-slate-200 rounded-2xl text-slate-900 flex items-center justify-center font-semibold tracking-tight font-medium text-3xl shadow-[0_2px_10px_rgb(0,0,0,0.02)] ${user.role === UserRole.ADMIN ? 'bg-blue-600 text-white' : 'bg-[#10b981] text-slate-900'}`}>
                  {user.fullName ? user.fullName[0].toUpperCase() : '?'}
                </div>
                <div>
                  <h4 className="font-semibold tracking-tight font-medium text-2xl text-slate-900 leading-none">{user.fullName}</h4>
                  <p className="font-medium text-xs text-slate-500  tracking-normal mt-2 flex items-center gap-2"><Mail className="w-4 h-4 opacity-50" /> {user.email}</p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className={`px-4 py-2 border border-slate-200 rounded-2xl font-medium font-bold text-[10px]  tracking-normal flex items-center gap-2 shadow-[0_2px_10px_rgb(0,0,0,0.02)] ${user.role === UserRole.ADMIN ? 'bg-blue-600 text-white' : 'bg-[#10b981] text-slate-900'}`}>
                  {user.role === UserRole.ADMIN ? <Shield className="w-4 h-4" /> : <UserIcon className="w-4 h-4" />}
                  {user.role}
                </div>
                <span className="text-[10px] font-medium font-bold text-slate-400  tracking-normal">Joined {new Date(user.createdAt).toLocaleDateString()}</span>
              </div>
              
              <div className="flex gap-3 pt-6 border-t-2 border-slate-200 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                {user.id !== currentUser?.id ? (
                  <>
                    <button 
                      onClick={() => openEditModal(user)}
                      className="flex-1 py-3 bg-white/60 backdrop-blur-3xl border border-slate-200 rounded-2xl text-slate-900 font-medium font-bold text-[10px]  tracking-normal hover:bg-slate-100 hover:shadow-[0_2px_10px_rgb(0,0,0,0.02)] transition-all flex items-center justify-center gap-2"
                    >
                      <Edit2 className="w-4 h-4" /> Edit
                    </button>
                    <button 
                      onClick={() => setDeleteConfirmId(user.id)}
                      className="flex-1 py-3 bg-red-600 border border-slate-200 rounded-2xl text-white font-medium font-bold text-[10px]  tracking-normal hover:bg-red-700 hover:shadow-[0_2px_10px_rgb(0,0,0,0.02)] transition-all flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" /> Delete
                    </button>
                  </>
                ) : (
                  <div className="w-full py-3 px-4 bg-slate-100 border border-slate-200 rounded-2xl text-slate-900 font-medium text-[9px]  font-bold text-center">
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
          <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm" onClick={closeModal}></div>
          <div className="relative bg-white w-full max-w-lg border border-slate-200 rounded-[2rem] shadow-sm bg-white/80 backdrop-blur-xl ring-1 ring-slate-100/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden animate-in zoom-in duration-200">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white/60 backdrop-blur-3xl">
              <h3 className="text-3xl font-semibold tracking-tight font-medium text-slate-900  tracking-tight">{editingUserId ? 'Update Staff Member' : 'Add Staff Member'}</h3>
              <button disabled={isSubmitting} onClick={closeModal} className="w-10 h-10 flex items-center justify-center border border-slate-200 rounded-2xl hover:bg-red-500 hover:text-white transition-colors bg-white"><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div>
                <label className="block text-[10px] font-medium font-bold text-slate-500  tracking-normal mb-2">Full Name</label>
                <input 
                  type="text" required placeholder="e.g. Adebayo Musa"
                  className="w-full px-5 py-4 border border-slate-200 rounded-2xl bg-white outline-none focus:ring-0 focus:bg-slate-50 font-medium font-bold text-slate-900"
                  value={formData.fullName}
                  onFocus={e => e.target.select()}
                  onChange={e => setFormData({...formData, fullName: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium font-bold text-slate-500  tracking-normal mb-2">Email Address</label>
                <input 
                  type="email" required placeholder="adebayo@shop.com"
                  className="w-full px-5 py-4 border border-slate-200 rounded-2xl bg-white outline-none focus:ring-0 focus:bg-slate-50 font-medium font-bold text-slate-900"
                  value={formData.email}
                  onFocus={e => e.target.select()}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium font-bold text-slate-500  tracking-normal mb-2">Access Role</label>
                <select 
                  className="w-full px-5 py-4 border border-slate-200 rounded-2xl bg-white outline-none focus:ring-0 focus:bg-slate-50 font-medium font-bold text-slate-900 appearance-none"
                  value={formData.role}
                  onChange={e => setFormData({...formData, role: e.target.value as UserRole})}
                >
                  <option value={UserRole.SALESPERSON}>Salesperson (Transaction logging only)</option>
                  <option value={UserRole.ADMIN}>Admin (Full shop access)</option>
                </select>
              </div>
              {!editingUserId && (
                <div>
                  <label className="block text-[10px] font-medium font-bold text-slate-500  tracking-normal mb-2">Initial Password</label>
                  <input 
                    type="password" required placeholder="••••••••"
                    className="w-full px-5 py-4 border border-slate-200 rounded-2xl bg-white outline-none focus:ring-0 focus:bg-slate-50 font-medium font-bold text-slate-900"
                    value={formData.password}
                    onFocus={e => e.target.select()}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                  />
                </div>
              )}
              
              <div className="bg-yellow-400 p-6 border border-slate-200 rounded-[2rem] shadow-sm bg-white/80 backdrop-blur-xl ring-1 ring-slate-100/50 flex gap-5 mt-6 shadow-[0_2px_10px_rgb(0,0,0,0.02)]">
                <ShieldAlert className="w-8 h-8 text-slate-900 shrink-0" />
                <p className="text-[10px] text-slate-900 leading-relaxed font-medium font-bold  tracking-normal mt-1">Admins can view profit data, POS configuration, and process returns. Salespeople are limited to logging transactions and viewing inventory.</p>
              </div>
              
              <div className="flex gap-4 pt-8">
                <button type="button" disabled={isSubmitting} onClick={closeModal} className="flex-1 py-4 border border-slate-200 rounded-2xl font-medium font-bold text-xs  tracking-normal text-slate-900 hover:bg-slate-100 bg-white">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="flex-[2] py-4 bg-blue-600 text-white border border-slate-200 rounded-2xl font-medium font-bold text-xs  tracking-normal shadow-[0_2px_10px_rgb(0,0,0,0.02)] hover:-translate-y-0.5 hover:shadow-[0_2px_10px_rgb(0,0,0,0.02)] transition-all flex items-center justify-center gap-3">
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (editingUserId ? 'Apply Changes' : 'Confirm')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirmId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm" onClick={() => setDeleteConfirmId(null)}></div>
          <div className="relative bg-white w-full max-w-md border border-slate-200 rounded-[2rem] shadow-sm bg-white/80 backdrop-blur-xl ring-1 ring-slate-100/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-10 animate-in zoom-in duration-200 text-center">
            <div className="w-20 h-20 bg-red-600 border border-slate-200 rounded-[2rem] shadow-sm bg-white/80 backdrop-blur-xl ring-1 ring-slate-100/50 text-white flex items-center justify-center mx-auto mb-8 shadow-[0_2px_10px_rgb(0,0,0,0.02)]">
              <AlertCircle className="w-10 h-10" />
            </div>
            <h3 className="text-3xl font-semibold tracking-tight font-medium text-slate-900 mb-4 ">Delete Member?</h3>
            <p className="text-slate-900 font-medium text-xs  tracking-normal mb-10 leading-relaxed">This action is permanent. This staff member will lose access immediately.</p>
            <div className="flex flex-col gap-4">
              <button 
                onClick={confirmDelete}
                className="w-full py-5 bg-red-600 text-white border border-slate-200 rounded-2xl font-medium font-bold text-sm  tracking-normal shadow-[0_2px_10px_rgb(0,0,0,0.02)] hover:-translate-y-0.5 hover:shadow-[0_2px_10px_rgb(0,0,0,0.02)] transition-all"
              >
                Yes, Delete User
              </button>
              <button 
                onClick={() => setDeleteConfirmId(null)}
                className="w-full py-5 bg-white text-slate-900 border border-slate-200 rounded-2xl font-medium font-bold text-sm  tracking-normal hover:bg-slate-100 transition-all font-medium"
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