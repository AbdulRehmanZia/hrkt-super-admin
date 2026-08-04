import React, { useEffect, useState } from 'react';
import {
  Typography,
  Card,
  Table,
  Button,
  Input,
  Select,
  Row,
  Col,
  Space,
  Drawer,
  message,
  Tooltip,
  Alert,
  Modal,
} from 'antd';
import {
  SearchOutlined,
  NotificationOutlined,
  CheckCircleOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  BankOutlined,
  ClearOutlined,
} from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

const { Title, Text, Paragraph } = Typography;

interface InvoiceRow {
  _id: string;
  periodMonth: string;
  amountDue: number;
  amountPaid: number;
  dueDate: string;
  status: string;
  lastReminderSentAt?: string;
  facility?: {
    _id: string;
    name: string;
    city: string;
    status: string;
  };
  facilityId?: {
    _id: string;
    name: string;
    city: string;
    status: string;
  };
}

interface InvoicesResponse {
  data: InvoiceRow[];
  summary: {
    totalOverdueRevenue: number;
    totalPaidRevenue: number;
    overdueCount: number;
    dueCount: number;
    paidCount: number;
  };
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface BreakdownData {
  facilityName?: string;
  facility?: { name: string; city: string };
  invoice: InvoiceRow;
  subscriptionPlan: string;
  itemized: {
    monthlyBaseFee: { plan: string; amount: number };
    courtUsage: { courtCount: number; ratePerCourt: number; amount: number };
    bookingUsage: { bookingsCount: number; ratePerBooking: number; amount: number };
    totalCalculated: number;
    invoiceAmountDue: number;
  };
}

const getInvoiceStatusBadge = (status: string) => {
  switch (status.toLowerCase()) {
    case 'paid':
      return <span className="hrkt-badge hrkt-badge-green">PAID</span>;
    case 'overdue':
      return <span className="hrkt-badge hrkt-badge-red">OVERDUE</span>;
    case 'due':
      return <span className="hrkt-badge hrkt-badge-blue">DUE</span>;
    default:
      return <span className="hrkt-badge hrkt-badge-gray">{status.toUpperCase()}</span>;
  }
};

export const InvoicesPage: React.FC = () => {
  const { token } = useAuth();

  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [summary, setSummary] = useState<InvoicesResponse['summary']>({
    totalOverdueRevenue: 0,
    totalPaidRevenue: 0,
    overdueCount: 0,
    dueCount: 0,
    paidCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);

  const [breakdownVisible, setBreakdownVisible] = useState(false);
  const [breakdownData, setBreakdownData] = useState<BreakdownData | null>(null);
  const [breakdownLoading, setBreakdownLoading] = useState(false);

  const [sendingReminderId, setSendingReminderId] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);

  const fetchInvoices = async (p: number, s?: string, st?: string) => {
    setLoading(true);
    try {
      let path = `/invoices?page=${p}&limit=10`;
      if (s) path += `&search=${encodeURIComponent(s)}`;
      if (st) path += `&status=${st}`;

      const res = await api.get<InvoicesResponse>(path, token!);
      setInvoices(res.data);
      setSummary(res.summary);
      setTotal(res.meta.total);
    } catch (err: any) {
      message.error(err?.message || 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices(page, search, statusFilter);
  }, [page, search, statusFilter, token]);

  const handleOpenBreakdown = async (id: string) => {
    setBreakdownData(null);
    setBreakdownVisible(true);
    setBreakdownLoading(true);
    try {
      const res = await api.get<BreakdownData>(`/invoices/${id}/breakdown`, token!);
      setBreakdownData(res);
    } catch (err: any) {
      message.error(err?.message || 'Failed to load billing breakdown');
    } finally {
      setBreakdownLoading(false);
    }
  };

  const handleSendReminder = async (id: string) => {
    setSendingReminderId(id);
    try {
      await api.post(`/invoices/${id}/reminder`, {}, token!);
      Modal.success({
        title: 'Payment Reminder Sent',
        content: 'A payment reminder has been successfully dispatched to the facility administration.',
        okText: 'OK',
      });
      fetchInvoices(page, search, statusFilter);
    } catch (err: any) {
      message.error(err?.message || 'Failed to send payment reminder');
    } finally {
      setSendingReminderId(null);
    }
  };

  const showMarkAsPaidConfirm = (r: InvoiceRow) => {
    const facilityName = r.facility?.name || (r.facilityId as any)?.name || 'Facility';
    Modal.confirm({
      title: 'Confirm Financial Status Change',
      icon: <ExclamationCircleOutlined style={{ color: '#00C27A' }} />,
      content: (
        <div>
          <Paragraph style={{ margin: 0 }}>
            Are you sure you want to mark the invoice for <strong>{facilityName}</strong> ({r.periodMonth}) as <strong>PAID</strong>?
          </Paragraph>
          <div style={{ marginTop: 8, padding: 8, background: '#f5f5f5', borderRadius: 6, fontSize: 13 }}>
            <div><strong>Amount Due:</strong> PKR {r.amountDue.toLocaleString()}</div>
            <div><strong>Due Date:</strong> {new Date(r.dueDate).toLocaleDateString('en-PK')}</div>
          </div>
        </div>
      ),
      okText: 'Confirm & Mark Paid',
      okType: 'primary',
      cancelText: 'Cancel',
      onOk: () => handleMarkAsPaid(r._id),
    });
  };

  const handleMarkAsPaid = async (id: string) => {
    setPayingId(id);
    try {
      await api.patch(`/invoices/${id}/pay`, {}, token!);
      message.success('Invoice marked as PAID successfully!');
      fetchInvoices(page, search, statusFilter);
    } catch (err: any) {
      message.error(err?.message || 'Failed to update invoice payment status');
    } finally {
      setPayingId(null);
    }
  };

  const getCooldownStatus = (lastReminderSentAt?: string) => {
    if (!lastReminderSentAt) return { isCooldown: false, remainingHours: 0 };
    const now = new Date();
    const sentAt = new Date(lastReminderSentAt);
    const msDiff = now.getTime() - sentAt.getTime();
    const hoursDiff = msDiff / (1000 * 60 * 60);

    if (hoursDiff < 24) {
      return { isCooldown: true, remainingHours: Math.ceil(24 - hoursDiff) };
    }
    return { isCooldown: false, remainingHours: 0 };
  };

  const handleClearFilters = () => {
    setSearch('');
    setStatusFilter(undefined);
    setPage(1);
  };

  const columns = [
    {
      title: 'Facility Name & Location',
      key: 'facility',
      render: (_: any, r: InvoiceRow) => (
        <div>
          <Text strong style={{ fontSize: 14, color: '#111827' }}>
            {r.facility?.name || (r.facilityId as any)?.name || 'Unknown Facility'}
          </Text>
          <div style={{ fontSize: 12, color: '#6B7280' }}>
            <BankOutlined style={{ marginRight: 4 }} /> {r.facility?.city || (r.facilityId as any)?.city || 'Pakistan'}
          </div>
        </div>
      ),
    },
    {
      title: 'Period Month',
      dataIndex: 'periodMonth',
      key: 'periodMonth',
      render: (m: string) => (
        <span className="hrkt-badge hrkt-badge-blue">{m}</span>
      ),
    },
    {
      title: 'Amount Due (PKR)',
      key: 'amountDue',
      render: (_: any, r: InvoiceRow) => {
        const currentlyDue = Math.max(0, r.amountDue - r.amountPaid);
        return (
          <div>
            <Text strong style={{ fontSize: 15, color: currentlyDue === 0 ? '#15803D' : '#111827' }}>
              PKR {currentlyDue.toLocaleString()}
            </Text>
            <div style={{ fontSize: 12, color: '#6B7280' }}>
              Total: PKR {r.amountDue.toLocaleString()} · Paid: PKR {r.amountPaid.toLocaleString()}
            </div>
          </div>
        );
      },
    },
    {
      title: 'Due Date',
      dataIndex: 'dueDate',
      key: 'dueDate',
      render: (dt: string) => <Text style={{ color: '#4B5563' }}>{new Date(dt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>,
    },
    {
      title: 'Payment Status',
      dataIndex: 'status',
      key: 'status',
      render: (st: string) => getInvoiceStatusBadge(st),
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'center' as const,
      render: (_: any, r: InvoiceRow) => {
        const cooldown = getCooldownStatus(r.lastReminderSentAt);

        return (
          <Space>
            <Tooltip title="View formula itemized billing breakdown">
              <Button
                size="small"
                type="text"
                icon={<FileTextOutlined style={{ color: '#6B7280' }} />}
                onClick={() => handleOpenBreakdown(r._id)}
                style={{ color: '#6B7280', fontWeight: 500 }}
              >
                Breakdown
              </Button>
            </Tooltip>

            {r.status !== 'paid' && (
              <Tooltip
                title={
                  cooldown.isCooldown
                    ? `Reminder cooldown active! Available in ${cooldown.remainingHours} hour(s)`
                    : 'Send payment reminder to facility admin'
                }
              >
                <Button
                  size="small"
                  type="text"
                  icon={<NotificationOutlined style={{ color: cooldown.isCooldown ? '#9CA3AF' : '#F59E0B' }} />}
                  disabled={cooldown.isCooldown}
                  loading={sendingReminderId === r._id}
                  onClick={() => handleSendReminder(r._id)}
                  style={{ color: cooldown.isCooldown ? '#9CA3AF' : '#B45309', fontWeight: 500 }}
                >
                  {cooldown.isCooldown ? `Cooldown (${cooldown.remainingHours}h)` : 'Send Reminder'}
                </Button>
              </Tooltip>
            )}

            {r.status !== 'paid' && (
              <Button
                size="small"
                type="primary"
                icon={<CheckCircleOutlined />}
                loading={payingId === r._id}
                onClick={() => showMarkAsPaidConfirm(r)}
                style={{ backgroundColor: '#00C27A', borderColor: '#00C27A', fontWeight: 600 }}
              >
                Mark Paid
              </Button>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto' }}>
      <div style={{ marginBottom: 28 }}>
        <Title level={2} style={{ margin: 0, fontSize: 26, fontWeight: 700, color: '#111827' }}>
          Platform Billing & Invoices
        </Title>
        <Text type="secondary" style={{ fontSize: 14, color: '#6B7280' }}>
          Track subscription invoices, itemized formula breakdowns, payment statuses, and 24-hour reminder cooldowns
        </Text>
      </div>

      <Row gutter={[20, 20]} style={{ marginBottom: 28 }}>
        <Col xs={24} sm={12} lg={8}>
          <Card className="hrkt-card hrkt-card-hover" bodyStyle={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <Text style={{ fontSize: 13, fontWeight: 500, color: '#6B7280' }}>Overdue Outstanding Revenue</Text>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#EF4444', marginTop: 8, marginBottom: 6 }}>
                  PKR {summary.totalOverdueRevenue.toLocaleString()}
                </div>
              </div>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ExclamationCircleOutlined style={{ fontSize: 22, color: '#EF4444' }} />
              </div>
            </div>
            <Text type="secondary" style={{ fontSize: 12, color: '#6B7280', marginTop: 4, display: 'block' }}>
              {summary.overdueCount} overdue invoice(s) pending collection
            </Text>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={8}>
          <Card className="hrkt-card hrkt-card-hover" bodyStyle={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <Text style={{ fontSize: 13, fontWeight: 500, color: '#6B7280' }}>Total Collected Revenue</Text>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#00C27A', marginTop: 8, marginBottom: 6 }}>
                  PKR {summary.totalPaidRevenue.toLocaleString()}
                </div>
              </div>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: '#E8FFF5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircleOutlined style={{ fontSize: 22, color: '#00C27A' }} />
              </div>
            </div>
            <Text type="secondary" style={{ fontSize: 12, color: '#6B7280', marginTop: 4, display: 'block' }}>
              {summary.paidCount} paid invoice(s) settled
            </Text>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={8}>
          <Card className="hrkt-card hrkt-card-hover" bodyStyle={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <Text style={{ fontSize: 13, fontWeight: 500, color: '#6B7280' }}>Current Month Pending Due</Text>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#1D4ED8', marginTop: 8, marginBottom: 6 }}>
                  {summary.dueCount} invoices
                </div>
              </div>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ClockCircleOutlined style={{ fontSize: 22, color: '#1D4ED8' }} />
              </div>
            </div>
            <Text type="secondary" style={{ fontSize: 12, color: '#6B7280', marginTop: 4, display: 'block' }}>
              Pending invoices active in current billing cycle
            </Text>
          </Card>
        </Col>
      </Row>

      <Card className="hrkt-card" bodyStyle={{ padding: 0 }} style={{ overflow: 'hidden' }}>
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #E5E7EB',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <Input
            placeholder="Search by facility name, city, or month (YYYY-MM)..."
            prefix={<SearchOutlined style={{ color: '#9CA3AF' }} />}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            style={{ width: 320, borderRadius: 8, height: 40 }}
            allowClear
          />

          <Select
            placeholder="Filter by payment status"
            value={statusFilter}
            onChange={(val) => {
              setStatusFilter(val);
              setPage(1);
            }}
            allowClear
            style={{ width: 245, height: 40 }}
            options={[
              { value: 'due', label: 'DUE' },
              { value: 'overdue', label: 'OVERDUE' },
              { value: 'paid', label: 'PAID' },
            ]}
          />

          {(search || statusFilter) && (
            <Button
              icon={<ClearOutlined />}
              onClick={handleClearFilters}
              style={{ borderRadius: 8, height: 40 }}
            >
              Clear Filters
            </Button>
          )}
        </div>

        <Table
          dataSource={invoices}
          columns={columns}
          rowKey="_id"
          loading={loading}
          scroll={{ x: 950 }}
          pagination={{
            current: page,
            total,
            pageSize: 10,
            onChange: (p) => setPage(p),
            showTotal: (t) => `Total ${t} platform invoices`,
            style: { padding: '16px 24px', margin: 0 },
          }}
        />
      </Card>

      <Drawer
        title="Itemized Payment Breakdown"
        placement="right"
        size={480 as any}
        onClose={() => setBreakdownVisible(false)}
        open={breakdownVisible}
      >
        {breakdownLoading || !breakdownData ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 50 }}>
            <Text type="secondary">Loading formula breakdown...</Text>
          </div>
        ) : (
          <div>
            <Alert
              title={`Invoice #${breakdownData.invoice._id.slice(-6)}`}
              description={`Facility: ${(breakdownData.invoice.facilityId as any)?.name || breakdownData.facilityName || breakdownData.facility?.name || breakdownData.invoice.facility?.name || 'Facility Venue'} (${breakdownData.invoice.periodMonth})`}
              type="info"
              showIcon
              style={{ marginBottom: 20, borderRadius: 10 }}
            />

            <Title level={4} style={{ marginBottom: 12, color: '#111827' }}>
              Billing Formula Breakdown
            </Title>
            <Paragraph type="secondary" style={{ fontSize: 13, color: '#6B7280' }}>
              Total Invoice = Base Plan Fee + (Courts Count x PKR 1,500) + (Bookings Count x PKR 20)
            </Paragraph>

            <div style={{ background: '#F9FAFB', padding: 18, borderRadius: 12, border: '1px solid #E5E7EB', marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <Text strong style={{ display: 'block', color: '#111827' }}>1. Subscription Plan Base Fee</Text>
                  <Text type="secondary" style={{ fontSize: 12, color: '#6B7280' }}>
                    Plan: {breakdownData.itemized.monthlyBaseFee.plan.toUpperCase()}
                  </Text>
                </div>
                <Text strong style={{ fontSize: 15, color: '#111827' }}>
                  PKR {breakdownData.itemized.monthlyBaseFee.amount.toLocaleString()}
                </Text>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <Text strong style={{ display: 'block', color: '#111827' }}>2. Court Usage Fee</Text>
                  <Text type="secondary" style={{ fontSize: 12, color: '#6B7280' }}>
                    {breakdownData.itemized.courtUsage.courtCount} Courts x PKR {breakdownData.itemized.courtUsage.ratePerCourt.toLocaleString()}
                  </Text>
                </div>
                <Text strong style={{ fontSize: 15, color: '#111827' }}>
                  PKR {breakdownData.itemized.courtUsage.amount.toLocaleString()}
                </Text>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <Text strong style={{ display: 'block', color: '#111827' }}>3. Per-Booking Platform Fee</Text>
                  <Text type="secondary" style={{ fontSize: 12, color: '#6B7280' }}>
                    {breakdownData.itemized.bookingUsage.bookingsCount} Bookings x PKR {breakdownData.itemized.bookingUsage.ratePerBooking}
                  </Text>
                </div>
                <Text strong style={{ fontSize: 15, color: '#111827' }}>
                  PKR {breakdownData.itemized.bookingUsage.amount.toLocaleString()}
                </Text>
              </div>

              <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text strong style={{ fontSize: 16, color: '#111827' }}>Calculated Total Amount</Text>
                <Text strong style={{ fontSize: 18, color: '#00C27A' }}>
                  PKR {breakdownData.itemized.totalCalculated.toLocaleString()}
                </Text>
              </div>
            </div>

            {(() => {
              const inv = breakdownData.invoice;
              const remainingBalance = Math.max(0, inv.amountDue - inv.amountPaid);
              const isTrial = inv.amountDue === 0;
              const isPaid = inv.amountPaid >= inv.amountDue && inv.amountDue > 0;

              return (
                <div style={{ padding: 14, background: isPaid || isTrial ? '#E8FFF5' : '#FEF2F2', border: `1px solid ${isPaid || isTrial ? '#6EE7B7' : '#FCA5A5'}`, borderRadius: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <Text strong style={{ color: isPaid || isTrial ? '#065F46' : '#991B1B' }}>Remaining Balance Due:</Text>
                      <div style={{ fontSize: 12, color: '#6B7280' }}>
                        {isTrial ? 'Trial Subscription (PKR 0 Billed)' : `Total: PKR ${inv.amountDue.toLocaleString()} · Paid: PKR ${inv.amountPaid.toLocaleString()}`}
                      </div>
                    </div>
                    <Text strong style={{ color: isPaid || isTrial ? '#00C27A' : '#EF4444', fontSize: 18 }}>
                      PKR {remainingBalance.toLocaleString()}
                    </Text>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </Drawer>
    </div>
  );
};
