import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { FiPlus, FiDownload } from 'react-icons/fi';
import Table from '../../components/common/Table';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import Pagination from '../../components/common/Pagination';
import { getAllPayments, recordManual, getReceipt } from '../../services/paymentService';
import { getStudents } from '../../services/studentService';
import { formatCurrency, formatDate, getErrorMessage } from '../../utils/helpers';
import { TERMS, SESSIONS, FEE_TYPES } from '../../utils/constants';

const EMPTY = { studentId: '', amount: '', feeType: 'tuition', term: 'first', session: '2025/2026', paymentMethod: 'cash', notes: '' };

export default function AdminPayments() {
  const [payments, setPayments] = useState([]);
  const [students, setStudents] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading]   = useState(true);
  const [page, setPage]         = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [form, setForm]         = useState(EMPTY);
  const [totalRevenue, setTotalRevenue] = useState(0);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAllPayments({ page, limit: 10 });
      setPayments(res.data.data);
      setPagination(res.data.pagination);
      setTotalRevenue(res.data.totalRevenue);
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);
  useEffect(() => { getStudents({ limit: 200 }).then((r) => setStudents(r.data.data)).catch(() => {}); }, []);

  const handleRecord = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await recordManual({ ...form, amount: Number(form.amount) });
      toast.success('Payment recorded'); setShowModal(false); setForm(EMPTY); fetchPayments();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSaving(false); }
  };

  const handleReceipt = async (id) => {
    try {
      const res = await getReceipt(id);
      const r = res.data.receipt;
      toast.success(`Receipt: ${r.receiptNumber}`);
      // In production this would download a PDF
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const statusBadge = { paid: 'success', pending: 'warning', failed: 'danger' };

  const columns = [
    { key: 'studentId', label: 'Student', render: (v) => v?.admissionNumber || '—' },
    { key: 'amount',    label: 'Amount',  render: (v) => <span className="font-semibold text-secondary-800">{formatCurrency(v)}</span> },
    { key: 'feeType',   label: 'Fee Type', render: (v) => <span className="capitalize">{v}</span> },
    { key: 'term',      label: 'Term',    render: (v) => <span className="capitalize">{v}</span> },
    { key: 'session',   label: 'Session' },
    { key: 'paymentMethod', label: 'Method', render: (v) => <Badge variant="info">{v}</Badge> },
    { key: 'status',    label: 'Status',  render: (v) => <Badge variant={statusBadge[v]}>{v}</Badge> },
    { key: 'paidAt',    label: 'Date',    render: (v) => formatDate(v) },
    { key: '_id', label: '', render: (id, row) => row.status === 'paid' && (
      <button onClick={() => handleReceipt(id)} className="p-1.5 rounded-lg hover:bg-secondary-100 text-secondary-500 hover:text-primary-600 transition-colors" title="View Receipt"><FiDownload size={14} /></button>
    )},
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Payments</h1>
          <p className="page-subtitle">Total Revenue: <span className="text-primary-600 font-semibold">{formatCurrency(totalRevenue)}</span></p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary"><FiPlus size={16} />Record Payment</button>
      </div>
      <Table columns={columns} data={payments} loading={loading} emptyMessage="No payments found" />
      <Pagination {...pagination} onPage={setPage} />

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Record Manual Payment">
        <form onSubmit={handleRecord} className="space-y-4">
          <div><label className="input-label">Student *</label>
            <select className="input-field" value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })} required>
              <option value="">— Select Student —</option>
              {students.map((s) => <option key={s._id} value={s._id}>{s.userId?.name} ({s.admissionNumber})</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="input-label">Amount (₦) *</label><input type="number" min="1" className="input-field" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></div>
            <div><label className="input-label">Fee Type *</label>
              <select className="input-field" value={form.feeType} onChange={(e) => setForm({ ...form, feeType: e.target.value })}>
                {FEE_TYPES.map((f) => <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>)}
              </select>
            </div>
            <div><label className="input-label">Term *</label>
              <select className="input-field" value={form.term} onChange={(e) => setForm({ ...form, term: e.target.value })}>
                {TERMS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div><label className="input-label">Session *</label>
              <select className="input-field" value={form.session} onChange={(e) => setForm({ ...form, session: e.target.value })}>
                {SESSIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div><label className="input-label">Method</label>
              <select className="input-field" value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}>
                <option value="cash">Cash</option><option value="bank_transfer">Bank Transfer</option>
              </select>
            </div>
          </div>
          <div><label className="input-label">Notes</label><input className="input-field" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Recording...' : 'Record Payment'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}