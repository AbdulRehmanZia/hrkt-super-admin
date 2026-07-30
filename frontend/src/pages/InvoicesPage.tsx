import React, { useEffect, useState } from 'react';
import {
  Typography,
  Card,
  Table,
  Tag,
  Button,
  Input,
  Select,
  Row,
  Col,
  Statistic,
  Space,
  Drawer,
  Popconfirm,
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

const statusColors: Record<string, string> = {
  paid: 'green',
  due: 'gold',
  overdue: 'red',
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

  // Itemized Breakdown Drawer state
  const [breakdownVisible, setBreakdownVisible] = useState(false);
  const [breakdownData, setBreakdownData] = useState<BreakdownData | null>(null);
  const [breakdownLoading, setBreakdownLoading] = useState(false);

  // Action Loading states
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

  // Open Itemized Breakdown Drawer
  const handleOpenBreakdown = async (id: string) => {
    setBreakdownData(null); // Clear stale previous state
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

  // Send Payment Reminder (with 24h Cooldown Validation & Modal Notification)
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

  // Mark Invoice as Paid
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

  // Helper function to check if reminder is on 24h cooldown
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
          <Text strong style={{ fontSize: 14 }}>
            {r.facility?.name || (r.facilityId as any)?.name || 'Unknown Facility'}
          </Text>
          <div style={{ fontSize: 12, color: '#8c8c8c' }}>
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
        <Tag color="blue" style={{ fontWeight: 600 }}>
          {m}
        </Tag>
      ),
    },
    {
      title: 'Amount Due (PKR)',
      key: 'amountDue',
      render: (_: any, r: InvoiceRow) => (
        <div>
          <Text strong style={{ fontSize: 15, color: '#1f1f1f' }}>
            PKR {r.amountDue.toLocaleString()}
          </Text>
          <div style={{ fontSize: 12, color: r.amountPaid >= r.amountDue ? '#52c41a' : '#8c8c8c' }}>
            Paid: PKR {r.amountPaid.toLocaleString()}
          </div>
        </div>
      ),
    },
    {
      title: 'Due Date',
      dataIndex: 'dueDate',
      key: 'dueDate',
      render: (dt: string) => new Date(dt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }),
    },
    {
      title: 'Payment Status',
      dataIndex: 'status',
      key: 'status',
      render: (st: string) => (
        <Tag color={statusColors[st] || 'default'} style={{ fontWeight: 700, padding: '2px 10px', textTransform: 'uppercase' }}>
          {st}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'right' as const,
      render: (_: any, r: InvoiceRow) => {
        const cooldown = getCooldownStatus(r.lastReminderSentAt);

        return (
          <Space>
            {/* Itemized Breakdown Button */}
            <Tooltip title="View formula itemized billing breakdown">
              <Button
                size="small"
                icon={<FileTextOutlined />}
                onClick={() => handleOpenBreakdown(r._id)}
              >
                Breakdown
              </Button>
            </Tooltip>

            {/* Send Reminder (with 24h Cooldown Rule) */}
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
                  icon={<NotificationOutlined />}
                  disabled={cooldown.isCooldown}
                  loading={sendingReminderId === r._id}
                  onClick={() => handleSendReminder(r._id)}
                >
                  {cooldown.isCooldown ? `Cooldown (${cooldown.remainingHours}h)` : 'Send Reminder'}
                </Button>
              </Tooltip>
            )}

            {/* Mark as Paid Action */}
            {r.status !== 'paid' && (
              <Popconfirm
                title="Mark Invoice as Paid?"
                description={`Confirm payment of PKR ${r.amountDue.toLocaleString()} for ${r.facility?.name || (r.facilityId as any)?.name}?`}
                onConfirm={() => handleMarkAsPaid(r._id)}
                okText="Yes, Mark Paid"
                cancelText="Cancel"
              >
                <Button size="small" type="primary" icon={<CheckCircleOutlined />} loading={payingId === r._id}>
                  Mark Paid
                </Button>
              </Popconfirm>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>
          Platform Billing & Invoices
        </Title>
        <Text type="secondary">
          Track subscription invoices, itemized formula breakdowns, payment statuses, and 24-hour reminder cooldowns
        </Text>
      </div>

      {/* Summary KPI Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={8}>
          <Card style={{ borderRadius: 8 }} styles={{ body: { padding: 20 } }}>
            <Statistic
              title="Overdue Outstanding Revenue"
              value={summary.totalOverdueRevenue}
              precision={0}
              suffix="PKR"
              styles={{ content: { color: '#cf1322', fontWeight: 700 } }}
              prefix={<ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />}
            />
            <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
              {summary.overdueCount} overdue invoice(s) pending collection
            </Text>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={8}>
          <Card style={{ borderRadius: 8 }} styles={{ body: { padding: 20 } }}>
            <Statistic
              title="Total Collected Revenue"
              value={summary.totalPaidRevenue}
              precision={0}
              suffix="PKR"
              styles={{ content: { color: '#389e0d', fontWeight: 700 } }}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
            />
            <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
              {summary.paidCount} invoice(s) fully settled
            </Text>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={8}>
          <Card style={{ borderRadius: 8 }} styles={{ body: { padding: 20 } }}>
            <Statistic
              title="Pending Invoices"
              value={summary.dueCount + summary.overdueCount}
              styles={{ content: { color: '#d46b08', fontWeight: 700 } }}
              prefix={<ClockCircleOutlined style={{ color: '#fa8c16' }} />}
            />
            <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
              {summary.dueCount} Due · {summary.overdueCount} Overdue
            </Text>
          </Card>
        </Col>
      </Row>

      {/* Filter Controls & Table */}
      <Card style={{ borderRadius: 8 }}>
        <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <Input
            placeholder="Search by facility name, city, or month..."
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            style={{ width: 320 }}
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
            style={{ width: 180 }}
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
          pagination={{
            current: page,
            total,
            pageSize: 10,
            onChange: (p) => setPage(p),
            showTotal: (t) => `Total ${t} platform invoices`,
          }}
        />
      </Card>

      {/* Itemized Payment Breakdown Drawer (Formula Requirement P1) */}
      <Drawer
        title="Itemized Payment Breakdown"
        placement="right"
        size={480 as any}
        onClose={() => setBreakdownVisible(false)}
        open={breakdownVisible}
      >
        {breakdownLoading || !breakdownData ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 50 }}>
            <Typography.Text type="secondary">Loading formula breakdown...</Typography.Text>
          </div>
        ) : (
          <div>
            <Alert
              title={`Invoice #${breakdownData.invoice._id.slice(-6)}`}
              description={`Facility: ${(breakdownData.invoice.facilityId as any)?.name || breakdownData.facilityName || breakdownData.facility?.name || breakdownData.invoice.facility?.name || 'Facility Venue'} (${breakdownData.invoice.periodMonth})`}
              type="info"
              showIcon
              style={{ marginBottom: 20 }}
            />

            <Title level={4} style={{ marginBottom: 16 }}>
              Billing Formula Breakdown
            </Title>
            <Paragraph type="secondary" style={{ fontSize: 13 }}>
              Total Invoice = Base Plan Fee + (Courts Count x PKR 1,500) + (Bookings Count x PKR 50)
            </Paragraph>

            <div style={{ background: '#fafafa', padding: 16, borderRadius: 8, border: '1px solid #f0f0f0', marginBottom: 20 }}>
              {/* Line 1: Base Fee */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <Text strong style={{ display: 'block' }}>1. Subscription Plan Base Fee</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Plan: {breakdownData.itemized.monthlyBaseFee.plan.toUpperCase()}
                  </Text>
                </div>
                <Text strong style={{ fontSize: 15 }}>
                  PKR {breakdownData.itemized.monthlyBaseFee.amount.toLocaleString()}
                </Text>
              </div>

              {/* Line 2: Court Usage Charge */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <Text strong style={{ display: 'block' }}>2. Court Usage Fee</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {breakdownData.itemized.courtUsage.courtCount} Courts x PKR {breakdownData.itemized.courtUsage.ratePerCourt.toLocaleString()}
                  </Text>
                </div>
                <Text strong style={{ fontSize: 15 }}>
                  PKR {breakdownData.itemized.courtUsage.amount.toLocaleString()}
                </Text>
              </div>

              {/* Line 3: Booking Platform Usage Fee */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <Text strong style={{ display: 'block' }}>3. Per-Booking Platform Fee</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {breakdownData.itemized.bookingUsage.bookingsCount} Bookings x PKR {breakdownData.itemized.bookingUsage.ratePerBooking}
                  </Text>
                </div>
                <Text strong style={{ fontSize: 15 }}>
                  PKR {breakdownData.itemized.bookingUsage.amount.toLocaleString()}
                </Text>
              </div>

              <div style={{ borderTop: '2px solid #e8e8e8', paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text strong style={{ fontSize: 16 }}>Calculated Total Amount</Text>
                <Text strong style={{ fontSize: 18, color: '#1677ff' }}>
                  PKR {breakdownData.itemized.totalCalculated.toLocaleString()}
                </Text>
              </div>
            </div>

            <div style={{ padding: 12, background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text strong>Current Invoice Amount Due:</Text>
                <Text strong style={{ color: '#389e0d' }}>
                  PKR {breakdownData.itemized.invoiceAmountDue.toLocaleString()}
                </Text>
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};
