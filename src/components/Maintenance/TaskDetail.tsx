import React, { useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  Wrench,
  FileText,
  CheckSquare,
  Package,
  AlertCircle,
  Pencil,
  Image,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { MaintenanceTask, MaintenanceHistory } from '../../types';
import { formatDate, calculateDaysUntilDue, getTaskStatusColor, getPriorityColor } from '../../utils/helpers';

interface TaskDetailProps {
  task: MaintenanceTask;
  onBack: () => void;
  onComplete: () => void;
  onEdit?: () => void;
  equipmentMap?: Record<string, { id: string; name: string; type?: string; vessel_id: string }>;
  vesselMap?: Record<string, { id: string; name: string; type?: string }>;
  usersMap?: Record<string, { id: string; full_name: string; email?: string }>;
  lastCompletion?: MaintenanceHistory | null;
}

export const TaskDetail: React.FC<TaskDetailProps> = ({
  task,
  onBack,
  onComplete,
  onEdit,
  equipmentMap = {},
  vesselMap = {},
  usersMap = {},
  lastCompletion = null,
}) => {
  const equipment = equipmentMap[task.equipment_id];
  const vessel = vesselMap[task.vessel_id];
  const assignedUser = usersMap[task.assigned_user_id];
  const daysUntil = calculateDaysUntilDue(task.next_due_date);
  const [lightbox, setLightbox] = useState<{ index: number } | null>(null);
  const photos = lastCompletion?.photos || [];
  const openLightbox = (index: number) => setLightbox({ index });
  const closeLightbox = () => setLightbox(null);
  const lightboxPrev = () => setLightbox(lb => lb ? { index: (lb.index - 1 + photos.length) % photos.length } : null);
  const lightboxNext = () => setLightbox(lb => lb ? { index: (lb.index + 1) % photos.length } : null);

  return (
    <div className="space-y-6">
    {lightbox && photos.length > 0 && (
      <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center" onClick={closeLightbox}>
        <button onClick={closeLightbox} className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
          <X className="w-6 h-6 text-white" />
        </button>
        {photos.length > 1 && (
          <>
            <button onClick={e => { e.stopPropagation(); lightboxPrev(); }} className="absolute left-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>
            <button onClick={e => { e.stopPropagation(); lightboxNext(); }} className="absolute right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
              <ChevronRight className="w-6 h-6 text-white" />
            </button>
          </>
        )}
        <img src={photos[lightbox.index]} alt={`Photo ${lightbox.index + 1}`} className="max-w-[90vw] max-h-[85vh] object-contain rounded-xl" onClick={e => e.stopPropagation()} />
        {photos.length > 1 && (
          <div className="absolute bottom-4 flex gap-2">
            {photos.map((_, i) => (
              <button key={i} onClick={e => { e.stopPropagation(); setLightbox({ index: i }); }} className={`w-2 h-2 rounded-full transition-colors ${i === lightbox.index ? 'bg-white' : 'bg-white/40'}`} />
            ))}
          </div>
        )}
      </div>
    )}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">{task.title}</h1>
          <p className="text-gray-600 mt-1">{task.category}</p>
        </div>
        <div className="flex items-center gap-2">
          {onEdit && (
            <button
              onClick={onEdit}
              className="flex items-center gap-2 px-5 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
            >
              <Pencil className="w-4 h-4" />
              Edit
            </button>
          )}
          {task.status !== 'completed' && (
            <button
              onClick={onComplete}
              className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl font-medium hover:from-green-700 hover:to-green-800 transition-all shadow-lg"
            >
              Complete Task
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Task Details</h2>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Description</label>
                <p className="text-gray-900 mt-1">{task.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Status</label>
                  <span className={`inline-block mt-1 px-3 py-1 rounded-lg text-sm font-medium ${getTaskStatusColor(task.status)}`}>
                    {task.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600">Priority</label>
                  <span className={`inline-block mt-1 px-3 py-1 rounded-lg text-sm font-medium ${getPriorityColor(task.priority)}`}>
                    {task.priority.toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Frequency</label>
                  <p className="text-gray-900 mt-1 capitalize">{task.frequency.replace('_', ' ')}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600">Estimated Duration</label>
                  <p className="text-gray-900 mt-1">{task.estimated_duration_hours} hours</p>
                </div>
              </div>
            </div>
          </div>

          {task.instructions && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Instructions
              </h2>
              <div className="bg-blue-50 rounded-xl p-4">
                <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans">{task.instructions}</pre>
              </div>
            </div>
          )}

          {task.checklist_items && task.checklist_items.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-green-600" />
                Checklist
              </h2>
              <div className="space-y-2">
                {task.checklist_items.map((item, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="w-5 h-5 border-2 border-gray-300 rounded"></div>
                    <span className="text-gray-800">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {task.required_parts && task.required_parts.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Package className="w-5 h-5 text-orange-600" />
                Required Parts
              </h2>
              <div className="space-y-3">
                {task.required_parts.map((part, index) => (
                  <div key={index} className="p-4 rounded-xl border bg-gray-50 border-gray-200">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900">Part ID: {part.inventory_id}</h3>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">Qty: {part.quantity}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Schedule</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Next Due Date</label>
                <p className="text-gray-900 mt-1 font-semibold">{formatDate(task.next_due_date)}</p>
                <p className={`text-sm mt-1 ${
                  daysUntil < 0 ? 'text-red-600' :
                  daysUntil <= 3 ? 'text-orange-600' : 'text-blue-600'
                }`}>
                  {daysUntil < 0 ? `${Math.abs(daysUntil)} days overdue` : `${daysUntil} days remaining`}
                </p>
              </div>

              {task.last_completed_date && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Last Completed</label>
                  <p className="text-gray-900 mt-1">{formatDate(task.last_completed_date)}</p>
                </div>
              )}

              {task.reminder_days_before && task.reminder_days_before.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Reminders</label>
                  <div className="mt-2 space-y-1">
                    {task.reminder_days_before.map((days, index) => (
                      <p key={index} className="text-sm text-gray-700">
                        {days} {days === 1 ? 'day' : 'days'} before
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Assignment</h2>
            <div className="space-y-4">
              {equipment && (
                <div>
                  <label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                    <Wrench className="w-4 h-4" />
                    Equipment
                  </label>
                  <p className="text-gray-900 mt-1 font-medium">{equipment.name}</p>
                  {equipment.type && <p className="text-sm text-gray-600">{equipment.type}</p>}
                </div>
              )}

              {vessel && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Vessel</label>
                  <p className="text-gray-900 mt-1 font-medium">{vessel.name}</p>
                  {vessel.type && <p className="text-sm text-gray-600">{vessel.type}</p>}
                </div>
              )}

              {assignedUser && (
                <div>
                  <label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Assigned To
                  </label>
                  <p className="text-gray-900 mt-1 font-medium">{assignedUser.full_name}</p>
                  {assignedUser.email && <p className="text-sm text-gray-600">{assignedUser.email}</p>}
                </div>
              )}
            </div>
          </div>

          {task.notes && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
                Notes
              </h2>
              <p className="text-sm text-gray-700">{task.notes}</p>
            </div>
          )}

          {lastCompletion && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-green-600" />
                Last Completion
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-gray-500">Completed by</p>
                  <p className="text-sm font-medium text-gray-900">{lastCompletion.completed_by_name}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">Date</p>
                  <p className="text-sm text-gray-900">{formatDate(lastCompletion.completion_date)}</p>
                </div>
                {lastCompletion.comments && (
                  <div>
                    <p className="text-xs font-medium text-gray-500">Comments</p>
                    <p className="text-sm text-gray-700">{lastCompletion.comments}</p>
                  </div>
                )}
                {lastCompletion.issues_detected && (
                  <div className="bg-yellow-50 rounded-xl p-3">
                    <p className="text-xs font-medium text-yellow-800 mb-1">Issues Detected</p>
                    <p className="text-sm text-yellow-700">{lastCompletion.issues_detected}</p>
                  </div>
                )}
                {photos.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1">
                      <Image className="w-3.5 h-3.5" />
                      Photos ({photos.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {photos.map((url, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => openLightbox(idx)}
                          className="relative w-16 h-16 rounded-xl overflow-hidden border border-gray-200 hover:border-blue-400 hover:shadow-md transition-all group"
                        >
                          <img src={url} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
