import React, { useState } from 'react';
import type { 
  Assignment, 
  GroupDeliverable, 
  AssignmentPriority, 
  AssignmentStatus 
} from '../types';
import { 
  Plus, 
  Calendar, 
  Clock, 
  ExternalLink, 
  Copy, 
  Download, 
  Users, 
  Trash2, 
  Share2, 
  Kanban, 
  List, 
  FileText,
  Sparkles,
  Bookmark
} from 'lucide-react';

interface AssignmentMatrixProps {
  assignments: Assignment[];
  onAddAssignment: (assignment: Omit<Assignment, 'id' | 'createdAt'>) => void;
  onUpdateAssignmentStatus: (id: string, status: AssignmentStatus) => void;
  onDeleteAssignment: (id: string) => void;
  groupDeliverables: GroupDeliverable[];
  onSaveGroupDeliverable: (group: GroupDeliverable) => void;
  onDeleteGroupDeliverable: (id: string) => void;
}

export const AssignmentMatrix: React.FC<AssignmentMatrixProps> = ({
  assignments,
  onAddAssignment,
  onUpdateAssignmentStatus,
  onDeleteAssignment,
  groupDeliverables,
  onSaveGroupDeliverable,
  onDeleteGroupDeliverable,
}) => {
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [showAddModal, setShowAddModal] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  // New assignment form state
  const [newTitle, setNewTitle] = useState('');
  const [newCourseCode, setNewCourseCode] = useState('SI401');
  const [newCourseTitle, setNewCourseTitle] = useState('Pemrograman Web Lanjut (Fullstack)');
  const [newDueDate, setNewDueDate] = useState('');
  const [newSubmissionUrl, setNewSubmissionUrl] = useState('');
  const [newPriority, setNewPriority] = useState<AssignmentPriority>('medium');
  const [newType, setNewType] = useState<'individual' | 'group'>('individual');
  const [newNotes, setNewNotes] = useState('');

  // Group Deliverable Generator form state
  const [groupTopic, setGroupTopic] = useState('Pengembangan Aplikasi PJJ UNSIA');
  const [groupCourseCode, setGroupCourseCode] = useState('SI401');
  const [groupCourseTitle, setGroupCourseTitle] = useState('Pemrograman Web Lanjut');
  const [groupDeadline, setGroupDeadline] = useState('2026-10-18T23:59');
  const [groupDriveLink, setGroupDriveLink] = useState('https://drive.google.com/drive/folders/sample-unsia-drive');
  const [groupExtraNotes, setGroupExtraNotes] = useState('Harap kumpul tepat waktu sebelum batas deadline.');
  const [memberRows, setMemberRows] = useState<Array<{ name: string; task: string }>>([
    { name: 'Ahmad Fauzi (PIC)', task: 'Arsitektur Frontend React & PWA' },
    { name: 'Dewi Lestari', task: 'Desain Wireframe UI/UX & Tailwind Styling' },
    { name: 'Budi Santoso', task: 'Dokumentasi Laporan PDF & Slide Presentasi' },
  ]);

  // Urgency tag calculation
  const getUrgency = (dueDateStr: string, status: AssignmentStatus) => {
    if (status === 'completed') {
      return {
        label: 'Completed',
        colorClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
        isPulse: false
      };
    }
    const dueTime = new Date(dueDateStr).getTime();
    const now = Date.now();
    const diffHours = (dueTime - now) / (1000 * 60 * 60);

    if (diffHours < 0) {
      return {
        label: 'Overdue',
        colorClass: 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/30',
        isPulse: false
      };
    }
    if (diffHours <= 24) {
      return {
        label: 'Due in 24h',
        colorClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/40 font-bold',
        isPulse: true
      };
    }
    if (diffHours <= 24 * 7) {
      return {
        label: 'Due this week',
        colorClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
        isPulse: false
      };
    }
    return {
      label: 'Upcoming',
      colorClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
      isPulse: false
    };
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    onAddAssignment({
      title: newTitle,
      courseCode: newCourseCode,
      courseTitle: newCourseTitle,
      dueDate: newDueDate || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      submissionUrl: newSubmissionUrl || 'https://cybercampus.unsia.ac.id',
      priority: newPriority,
      status: 'pending',
      type: newType,
      notes: newNotes,
    });

    setNewTitle('');
    setNewNotes('');
    setShowAddModal(false);
  };

  // Generate WhatsApp / Markdown formatted text
  const generateWhatsAppTemplate = () => {
    const formattedDeadline = groupDeadline 
      ? new Date(groupDeadline).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' WIB'
      : 'TBA';

    let text = `📋 *[TIMBANG TUGAS PJJ UNSIA]*\n`;
    text += `📌 *Mata Kuliah:* ${groupCourseCode} - ${groupCourseTitle}\n`;
    text += `🎯 *Topik:* ${groupTopic}\n\n`;
    text += `👥 *Anggota & PIC Tugas:*\n`;
    memberRows.forEach((m, idx) => {
      text += `   ${idx + 1}. *${m.name.trim() || 'Anggota'}*: ${m.task.trim() || 'Tugas'}\n`;
    });
    text += `\n⏰ *Batas Waktu:* ${formattedDeadline}\n`;
    if (groupDriveLink.trim()) {
      text += `🔗 *Link Drive / Repo:* ${groupDriveLink}\n`;
    }
    if (groupExtraNotes.trim()) {
      text += `💡 *Catatan:* ${groupExtraNotes}\n`;
    }
    text += `\n_Generated via SIA-Orbit: UNSIA Offline Study Matrix_`;
    return text;
  };

  const handleCopyToClipboard = async (textToCopy: string, label: string) => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopyFeedback(label);
      setTimeout(() => setCopyFeedback(null), 3000);
    } catch (e) {
      console.error('Failed to copy', e);
    }
  };

  // Export .ICS calendar file
  const handleExportICS = () => {
    const eventDate = new Date(groupDeadline || Date.now() + 2 * 24 * 60 * 60 * 1000);
    const startStr = eventDate.toISOString().replace(/-|:|\.\d+/g, '').substring(0, 15) + 'Z';
    const endDate = new Date(eventDate.getTime() + 60 * 60 * 1000);
    const endStr = endDate.toISOString().replace(/-|:|\.\d+/g, '').substring(0, 15) + 'Z';

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//SIA-Orbit//UNSIA PJJ Task Matrix//ID',
      'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      `UID:${Date.now()}@sia-orbit.unsia`,
      `DTSTAMP:${startStr}`,
      `DTSTART:${startStr}`,
      `DTEND:${endStr}`,
      `SUMMARY:Deadline PJJ: ${groupCourseCode} - ${groupTopic}`,
      `DESCRIPTION:${groupExtraNotes.replace(/\n/g, ' ')} | Drive: ${groupDriveLink}`,
      `LOCATION:UNSIA CyberCampus LMS`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `UNSIA-${groupCourseCode}-${groupTopic.replace(/\s+/g, '_')}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveGroup = () => {
    const newDeliverable: GroupDeliverable = {
      id: `grp-${Date.now()}`,
      topic: groupTopic,
      courseCode: groupCourseCode,
      courseTitle: groupCourseTitle,
      deadline: groupDeadline,
      driveLink: groupDriveLink,
      extraNotes: groupExtraNotes,
      members: memberRows.map((m, idx) => ({ id: `m-${idx}`, name: m.name, task: m.task })),
      createdAt: new Date().toISOString(),
    };
    onSaveGroupDeliverable(newDeliverable);
    setCopyFeedback('Saved to LocalStorage!');
    setTimeout(() => setCopyFeedback(null), 2500);
  };

  const handleLoadSavedGroup = (g: GroupDeliverable) => {
    setGroupTopic(g.topic);
    setGroupCourseCode(g.courseCode);
    setGroupCourseTitle(g.courseTitle);
    setGroupDeadline(g.deadline);
    setGroupDriveLink(g.driveLink);
    setGroupExtraNotes(g.extraNotes || '');
    setMemberRows(g.members.map(m => ({ name: m.name, task: m.task })));
    setCopyFeedback('Matrix dimuat ke editor!');
    setTimeout(() => setCopyFeedback(null), 2000);
  };

  const addMemberRow = () => {
    setMemberRows([...memberRows, { name: '', task: '' }]);
  };

  const removeMemberRow = (index: number) => {
    setMemberRows(memberRows.filter((_, i) => i !== index));
  };

  const updateMemberRow = (index: number, field: 'name' | 'task', value: string) => {
    const updated = [...memberRows];
    updated[index][field] = value;
    setMemberRows(updated);
  };

  return (
    <div className="space-y-8">
      
      {/* Toast Feedback */}
      {copyFeedback && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white dark:bg-emerald-600 px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-xs font-semibold animate-slide-up">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>{copyFeedback}</span>
        </div>
      )}

      {/* Top Controls: Header + View Toggle + Add Assignment Trigger */}
      <div className="glass-card p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-500" />
            Asynchronous Deadline Board
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Sinkronisasi tugas kuliah PJJ tersimpan 100% di browser LocalStorage.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {/* View Mode Toggle */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded text-xs font-medium flex items-center gap-1 ${
                viewMode === 'kanban' 
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-emerald-400 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Kanban</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded text-xs font-medium flex items-center gap-1 ${
                viewMode === 'list' 
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-emerald-400 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">List</span>
            </button>
          </div>

          {/* Add Assignment Button */}
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Tugas</span>
          </button>
        </div>
      </div>

      {/* Board View: Kanban or List */}
      {viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Column 1: Pending */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                Pending ({assignments.filter(a => a.status === 'pending').length})
              </span>
            </div>
            <div className="space-y-3">
              {assignments.filter(a => a.status === 'pending').map(a => renderAssignmentCard(a))}
            </div>
          </div>

          {/* Column 2: In Progress */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                Sedang Dikerjakan ({assignments.filter(a => a.status === 'in_progress').length})
              </span>
            </div>
            <div className="space-y-3">
              {assignments.filter(a => a.status === 'in_progress').map(a => renderAssignmentCard(a))}
            </div>
          </div>

          {/* Column 3: Completed */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                Selesai Disubmit ({assignments.filter(a => a.status === 'completed').length})
              </span>
            </div>
            <div className="space-y-3">
              {assignments.filter(a => a.status === 'completed').map(a => renderAssignmentCard(a))}
            </div>
          </div>

        </div>
      ) : (
        /* List View */
        <div className="glass-card rounded-2xl overflow-hidden divide-y divide-slate-200 dark:divide-slate-800">
          {assignments.map(a => (
            <div key={a.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {a.courseCode}
                  </span>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                    {a.title}
                  </h4>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                    {a.type === 'group' ? '👥 Kelompok' : '👤 Individu'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {a.courseTitle} • Batas: {new Date(a.dueDate).toLocaleString('id-ID')}
                </p>
              </div>

              <div className="flex items-center gap-3">
                {(() => {
                  const urgency = getUrgency(a.dueDate, a.status);
                  return (
                    <span className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-full border ${urgency.colorClass} ${urgency.isPulse ? 'animate-pulse' : ''}`}>
                      {urgency.label}
                    </span>
                  );
                })()}

                <select
                  value={a.status}
                  onChange={(e) => onUpdateAssignmentStatus(a.id, e.target.value as AssignmentStatus)}
                  className="text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-slate-800 dark:text-slate-200"
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>

                <a
                  href={a.submissionUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 dark:hover:text-emerald-400"
                  title="Buka link LMS / Tugas"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>

                <button
                  onClick={() => onDeleteAssignment(a.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500"
                  title="Hapus Tugas"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Module B2: One-Click Group Splitter & Deliverable Generator */}
      <div className="glass-card p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-gradient-to-tr from-emerald-500/20 to-blue-500/20 text-emerald-600 dark:text-emerald-400">
                <Users className="w-5 h-5" />
              </span>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                One-Click Group Splitter &amp; Deliverable Generator
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
              Solusi pembagian tugas kelompok PJJ UNSIA yang rapi &amp; terstruktur. Buat template chat WhatsApp/Telegram instan dan ekspor kalender .ICS untuk Google Calendar atau Apple Calendar.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCopyToClipboard(generateWhatsAppTemplate(), 'Template WhatsApp disalin!')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Salin Format WA</span>
            </button>

            <button
              onClick={handleExportICS}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export .ICS</span>
            </button>

            <button
              onClick={handleSaveGroup}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700 transition-all"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Simpan Matrix</span>
            </button>
          </div>
        </div>

        {/* Input Form Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Topik Tugas Kelompok
            </label>
            <input
              type="text"
              value={groupTopic}
              onChange={(e) => setGroupTopic(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="e.g. Analisis Arsitektur SI / Perancangan DBMS"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Nama Mata Kuliah
            </label>
            <input
              type="text"
              value={groupCourseTitle}
              onChange={(e) => setGroupCourseTitle(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Kode Mata Kuliah
              </label>
              <input
                type="text"
                value={groupCourseCode}
                onChange={(e) => setGroupCourseCode(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Batas Waktu (Deadline)
              </label>
              <input
                type="datetime-local"
                value={groupDeadline}
                onChange={(e) => setGroupDeadline(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Link Google Drive / Repository Github
            </label>
            <input
              type="text"
              value={groupDriveLink}
              onChange={(e) => setGroupDriveLink(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Catatan / Format Pengumpulan
            </label>
            <input
              type="text"
              value={groupExtraNotes}
              onChange={(e) => setGroupExtraNotes(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Member & Sub-Task Distribution Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Daftar Anggota &amp; Sub-Tasks (PIC)
            </span>
            <button
              onClick={addMemberRow}
              className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Tambah Anggota
            </button>
          </div>

          <div className="space-y-2">
            {memberRows.map((row, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Nama Anggota (e.g. Budi)"
                  value={row.name}
                  onChange={(e) => updateMemberRow(idx, 'name', e.target.value)}
                  className="w-1/3 text-xs px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <input
                  type="text"
                  placeholder="Sub-task / Pembagian Bagian (e.g. Bab 1 & UML)"
                  value={row.task}
                  onChange={(e) => updateMemberRow(idx, 'task', e.target.value)}
                  className="flex-1 text-xs px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                {memberRows.length > 1 && (
                  <button
                    onClick={() => removeMemberRow(idx)}
                    className="p-2 text-slate-400 hover:text-rose-500"
                    title="Hapus Baris"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Live Preview WhatsApp Output */}
        <div className="p-4 rounded-xl bg-slate-900 text-slate-200 font-mono text-xs whitespace-pre-wrap border border-slate-800 relative">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
              Live WhatsApp / Markdown Preview
            </span>
            <button
              onClick={() => handleCopyToClipboard(generateWhatsAppTemplate(), 'Teks berhasil disalin!')}
              className="text-emerald-400 hover:text-emerald-300 font-semibold"
            >
              Copy Template
            </button>
          </div>
          {generateWhatsAppTemplate()}
        </div>

        {/* Saved Groups Archive Section */}
        {groupDeliverables.length > 0 && (
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Bookmark className="w-4 h-4 text-emerald-500" />
              <span>Matriks Tugas Kelompok Tersimpan ({groupDeliverables.length})</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {groupDeliverables.map(g => (
                <div key={g.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      {g.courseCode}
                    </span>
                    <h5 className="text-xs font-semibold text-slate-900 dark:text-white line-clamp-1">
                      {g.topic}
                    </h5>
                    <p className="text-[11px] text-slate-400">
                      {g.members.length} Anggota • Deadline: {new Date(g.deadline).toLocaleDateString('id-ID')}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleLoadSavedGroup(g)}
                      className="text-[11px] px-2 py-1 rounded bg-blue-600/10 text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white transition-colors"
                      title="Muat ke editor"
                    >
                      Buka
                    </button>
                    <button
                      onClick={() => onDeleteGroupDeliverable(g.id)}
                      className="p-1 text-slate-400 hover:text-rose-500"
                      title="Hapus"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Modal: Add Custom Assignment */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-[#111726] border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Tambah Tugas PJJ Baru
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Judul Tugas
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tugas 2: Laporan Praktikum Jaringan"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Kode Matkul
                  </label>
                  <input
                    type="text"
                    value={newCourseCode}
                    onChange={(e) => setNewCourseCode(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nama Matkul
                  </label>
                  <input
                    type="text"
                    value={newCourseTitle}
                    onChange={(e) => setNewCourseTitle(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Prioritas
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as AssignmentPriority)}
                    className="w-full text-xs px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none"
                  >
                    <option value="low">Rendah (Low)</option>
                    <option value="medium">Sedang (Medium)</option>
                    <option value="high">Tinggi (High)</option>
                    <option value="urgent">Mendesak (Urgent)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tipe Pengerjaan
                  </label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as 'individual' | 'group')}
                    className="w-full text-xs px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none"
                  >
                    <option value="individual">Individu</option>
                    <option value="group">Kelompok</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Batas Waktu (Due Date)
                </label>
                <input
                  type="datetime-local"
                  required
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Link Pengumpulan LMS
                </label>
                <input
                  type="url"
                  placeholder="https://cybercampus.unsia.ac.id/..."
                  value={newSubmissionUrl}
                  onChange={(e) => setNewSubmissionUrl(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Catatan / Instruksi Dosen
                </label>
                <textarea
                  rows={2}
                  placeholder="Format PDF, ukuran maksimal 5MB..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-sm"
                >
                  Simpan Tugas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );

  // Render individual card in Kanban column
  function renderAssignmentCard(assignment: Assignment) {
    const urgency = getUrgency(assignment.dueDate, assignment.status);

    return (
      <div 
        key={assignment.id} 
        className={`glass-card p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 transition-all duration-200 ${
          urgency.isPulse ? 'ring-1 ring-rose-500/50 shadow-md' : ''
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
              {assignment.courseCode}
            </span>
            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${urgency.colorClass} ${urgency.isPulse ? 'animate-pulse' : ''}`}>
              {urgency.label}
            </span>
          </div>

          <button
            onClick={() => onDeleteAssignment(assignment.id)}
            className="text-slate-400 hover:text-rose-500 p-1"
            title="Hapus"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white leading-snug">
            {assignment.title}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
            {assignment.courseTitle}
          </p>
        </div>

        {assignment.notes && (
          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 italic bg-slate-50 dark:bg-slate-900/40 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
            {assignment.notes}
          </p>
        )}

        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 text-[11px]">
            <Calendar className="w-3.5 h-3.5" />
            <span>{new Date(assignment.dueDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={assignment.submissionUrl}
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 dark:text-emerald-400 hover:underline flex items-center gap-1 text-[11px]"
            >
              <span>LMS</span>
              <ExternalLink className="w-3 h-3" />
            </a>

            <select
              value={assignment.status}
              onChange={(e) => onUpdateAssignmentStatus(assignment.id, e.target.value as AssignmentStatus)}
              className="text-[11px] bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 font-medium"
            >
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>
      </div>
    );
  }
};
