import React, { useState, useEffect, useRef } from 'react';
import { X, CheckCircle, Upload, Package, Plus, Trash2, Image, XCircle } from 'lucide-react';
import { MaintenanceTask, InventoryItem } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { demoInventoryItems, demoUsers } from '../../data/demoData';

interface CompleteTaskModalProps {
  task: MaintenanceTask;
  onClose: () => void;
  onComplete: (data: CompletionData) => void;
}

export interface CompletionData {
  completed_by_name: string;
  completed_by_email: string;
  completion_date: string;
  comments: string;
  photos: string[];
  parts_used: { inventory_id: string; quantity: number; name: string }[];
  issues_detected: string;
}

interface PartRow {
  inventory_id: string;
  name: string;
  unit: string;
  available: number;
  quantity: number;
}

const isDemoUser = (email: string) => demoUsers.some(u => u.email === email);

export const CompleteTaskModal: React.FC<CompleteTaskModalProps> = ({ task, onClose, onComplete }) => {
  const { currentUser } = useAuth();
  const [comments, setComments] = useState('');
  const [issuesDetected, setIssuesDetected] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);

  // parts rows: pre-populated from task.required_parts, user can edit qty or add/remove
  const [parts, setParts] = useState<PartRow[]>([]);
  const [addingPart, setAddingPart] = useState(false);
  const [newPartId, setNewPartId] = useState('');
  const [newPartQty, setNewPartQty] = useState(1);

  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadInventory(); }, []);

  const loadInventory = async () => {
    if (!currentUser) return;

    let items: InventoryItem[] = [];
    if (isDemoUser(currentUser.email)) {
      items = demoInventoryItems.filter(i =>
        !task.vessel_id || i.vessel_id === task.vessel_id
      ) as InventoryItem[];
    } else {
      let q = supabase.from('inventory_items').select('*');
      if (task.vessel_id) q = q.eq('vessel_id', task.vessel_id);
      const { data } = await q;
      items = data || [];
    }
    setInventoryItems(items);

    // pre-populate required_parts
    if (task.required_parts && task.required_parts.length > 0) {
      const rows: PartRow[] = task.required_parts
        .map(p => {
          const inv = items.find(i => i.id === p.inventory_id);
          if (!inv) return null;
          return {
            inventory_id: p.inventory_id,
            name: inv.name,
            unit: inv.unit_of_measure,
            available: inv.current_stock,
            quantity: p.quantity,
          };
        })
        .filter(Boolean) as PartRow[];
      setParts(rows);
    }
  };

  const updateQty = (idx: number, val: number) => {
    setParts(prev => prev.map((p, i) => i === idx ? { ...p, quantity: Math.max(0, val) } : p));
  };

  const removePart = (idx: number) => {
    setParts(prev => prev.filter((_, i) => i !== idx));
  };

  const addPart = () => {
    const inv = inventoryItems.find(i => i.id === newPartId);
    if (!inv || newPartQty <= 0) return;
    if (parts.some(p => p.inventory_id === newPartId)) {
      setParts(prev => prev.map(p => p.inventory_id === newPartId
        ? { ...p, quantity: p.quantity + newPartQty }
        : p
      ));
    } else {
      setParts(prev => [...prev, {
        inventory_id: inv.id,
        name: inv.name,
        unit: inv.unit_of_measure,
        available: inv.current_stock,
        quantity: newPartQty,
      }]);
    }
    setNewPartId('');
    setNewPartQty(1);
    setAddingPart(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmed) return;

    const photoUrls = await uploadPhotos();

    const completionData: CompletionData = {
      completed_by_name: currentUser?.full_name || '',
      completed_by_email: currentUser?.email || '',
      completion_date: new Date().toISOString(),
      comments,
      photos: photoUrls,
      parts_used: parts
        .filter(p => p.quantity > 0)
        .map(p => ({ inventory_id: p.inventory_id, quantity: p.quantity, name: p.name })),
      issues_detected: issuesDetected,
    };

    onComplete(completionData);
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = 5 - photoFiles.length;
    const selected = files.slice(0, remaining);
    setPhotoFiles(prev => [...prev, ...selected]);
    selected.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => setPhotoPreviews(prev => [...prev, ev.target?.result as string]);
      reader.readAsDataURL(file);
    });
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  const removePhoto = (idx: number) => {
    setPhotoFiles(prev => prev.filter((_, i) => i !== idx));
    setPhotoPreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const uploadPhotos = async (): Promise<string[]> => {
    if (photoFiles.length === 0 || !currentUser) return [];
    if (isDemoUser(currentUser.email)) return [];

    setUploadingPhotos(true);
    const urls: string[] = [];

    for (const file of photoFiles) {
      const ext = file.name.split('.').pop();
      const path = `${currentUser.id}/${task.id}_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('task-photos').upload(path, file);
      if (!error) {
        const { data } = supabase.storage.from('task-photos').getPublicUrl(path);
        urls.push(data.publicUrl);
      }
    }

    setUploadingPhotos(false);
    return urls;
  };

  const unusedItems = inventoryItems.filter(i => !parts.some(p => p.inventory_id === i.id));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between rounded-t-3xl">
          <h2 className="text-2xl font-bold text-gray-900">Complete Task</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Task name */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <h3 className="font-medium text-blue-900">{task.title}</h3>
            <p className="text-sm text-blue-700 mt-1">{task.category}</p>
          </div>

          {/* Completed by */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Completed By</label>
              <input
                type="text"
                value={currentUser?.full_name || ''}
                disabled
                className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
              <input
                type="text"
                value={new Date().toLocaleDateString()}
                disabled
                className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-600"
              />
            </div>
          </div>

          {/* Comments */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Comments / Observations <span className="text-red-500">*</span>
            </label>
            <textarea
              value={comments}
              onChange={e => setComments(e.target.value)}
              rows={4}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Describe the work performed and any observations..."
            />
          </div>

          {/* Issues */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Issues Detected (Optional)</label>
            <textarea
              value={issuesDetected}
              onChange={e => setIssuesDetected(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Describe any issues or concerns found during maintenance..."
            />
          </div>

          {/* Parts / consumables used */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                <Package className="w-4 h-4 text-gray-500" />
                Parts &amp; Consumables Used
              </label>
              <button
                type="button"
                onClick={() => setAddingPart(true)}
                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add item
              </button>
            </div>

            {parts.length === 0 && !addingPart ? (
              <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-xl">
                <Package className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No parts or consumables added</p>
              </div>
            ) : (
              <div className="space-y-2">
                {parts.map((part, idx) => (
                  <div key={part.inventory_id} className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{part.name}</p>
                      <p className="text-xs text-gray-500">Available: {part.available} {part.unit}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={part.quantity}
                        onChange={e => updateQty(idx, parseFloat(e.target.value) || 0)}
                        className="w-20 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center"
                      />
                      <span className="text-xs text-gray-500 w-6">{part.unit}</span>
                      {part.quantity > part.available && (
                        <span className="text-xs text-amber-600 font-medium">exceeds stock</span>
                      )}
                      <button
                        type="button"
                        onClick={() => removePart(idx)}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {addingPart && (
              <div className="mt-2 flex items-end gap-2 bg-blue-50 border border-blue-200 rounded-xl p-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Item</label>
                  <select
                    value={newPartId}
                    onChange={e => setNewPartId(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">Select item...</option>
                    {unusedItems.map(i => (
                      <option key={i.id} value={i.id}>
                        {i.name} ({i.current_stock} {i.unit_of_measure})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-20">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Qty</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={newPartQty}
                    onChange={e => setNewPartQty(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-center"
                  />
                </div>
                <button
                  type="button"
                  onClick={addPart}
                  disabled={!newPartId}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => { setAddingPart(false); setNewPartId(''); setNewPartQty(1); }}
                  className="px-3 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Photo upload */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Photo Uploads (Optional)
              </label>
              <span className="text-xs text-gray-400">{photoFiles.length}/5 photos</span>
            </div>

            {photoPreviews.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-3">
                {photoPreviews.map((src, idx) => (
                  <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 group">
                    <img src={src} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePhoto(idx)}
                      className="absolute top-1 right-1 p-0.5 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <XCircle className="w-4 h-4 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {photoFiles.length < 5 && (
              <div
                className="border-2 border-dashed border-gray-300 rounded-xl p-5 text-center hover:border-blue-400 hover:bg-blue-50/30 transition-colors cursor-pointer"
                onClick={() => photoInputRef.current?.click()}
              >
                <Image className="w-7 h-7 text-gray-400 mx-auto mb-1.5" />
                <p className="text-sm text-gray-600 font-medium">Click to add photos</p>
                <p className="text-xs text-gray-400 mt-0.5">PNG, JPG, WEBP up to 10MB each</p>
              </div>
            )}

            <input
              ref={photoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={handlePhotoSelect}
            />
          </div>

          {/* Confirm */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={e => setConfirmed(e.target.checked)}
                className="mt-1 w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
              />
              <div>
                <p className="font-medium text-green-900">Confirm Task Completion</p>
                <p className="text-sm text-green-700 mt-1">
                  I confirm that this maintenance task has been completed successfully according to the instructions and checklist.
                  {parts.filter(p => p.quantity > 0).length > 0 && (
                    <> Stock will be automatically deducted for {parts.filter(p => p.quantity > 0).length} item{parts.filter(p => p.quantity > 0).length > 1 ? 's' : ''}.</>
                  )}
                </p>
              </div>
            </label>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!confirmed || uploadingPhotos}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl font-medium hover:from-green-700 hover:to-green-800 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-5 h-5" />
              {uploadingPhotos ? 'Uploading photos...' : 'Complete Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
