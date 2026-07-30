import React, { useEffect, useState } from 'react';
import {
  Typography,
  Card,
  Button,
  Tag,
  Row,
  Col,
  Statistic,
  Tabs,
  Table,
  Space,
  Spin,
  Alert,
  Badge,
  Input,
  Select,
  Tooltip,
  Modal,
  Form,
  InputNumber,
  Popconfirm,
  message,
} from 'antd';
import {
  ArrowLeftOutlined,
  DollarOutlined,
  CalendarOutlined,
  UserOutlined,
  BankOutlined,
  CheckCircleOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  GlobalOutlined,
  MobileOutlined,
  RobotOutlined,
  EditOutlined,
  LockOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { CreateFacilityModal } from '../components/CreateFacilityModal';

const { Title, Text, Paragraph } = Typography;

interface FacilityUser {
  _id: string;
  name: string;
  email: string;
  role: string;
  status: string;
}

interface AuditLogItem {
  _id: string;
  performedBy: string;
  action: string;
  details: string;
  createdAt: string;
}

interface FacilityDetailResponse {
  facility: {
    _id: string;
    name: string;
    city: string;
    status: string;
    courtLimit: number;
    createdAt: string;
  };
  courts: Array<{
    _id: string;
    name: string;
    sport: string;
    hourlyRate: number;
    isActive: boolean;
  }>;
  usersByRole: {
    facility_admin: FacilityUser[];
    manager: FacilityUser[];
    staff: FacilityUser[];
    coach: FacilityUser[];
  };
  subscription: {
    plan: string;
    status: string;
    monthlyBaseFee: number;
    renewsAt: string;
  } | null;
  latestInvoice: {
    periodMonth: string;
    amountDue: number;
    amountPaid: number;
    status: string;
  } | null;
  bookingRules: Array<{
    key: string;
    value: string;
    isEnabled: boolean;
  }>;
  discounts: Array<{
    _id: string;
    name: string;
    type: string;
    value: number;
    isActive: boolean;
    timesUsed: number;
  }>;
  auditLogs?: AuditLogItem[];
  paymentBreakdown: {
    fully_paid: { count: number; revenue: number };
    partially_paid: { count: number; revenue: number };
    unpaid: { count: number; revenue: number };
  };
  stats: {
    revenue30Days: number;
    totalRevenueAllTime: number;
    totalBookings: number;
    cancelledBookings: number;
    cancellationRate: number;
    activeCustomers: number;
    sourceBreakdown: { web: number; portal: number; bot: number };
  };
}

interface BookingRow {
  _id: string;
  startTime: string;
  endTime: string;
  totalAmount: number;
  amountPaid: number;
  paymentStatus: string;
  source: string;
  status: string;
  courtId?: { name: string; sport: string };
  customerId?: { name: string; phone: string; email: string };
}

interface CustomerRow {
  _id: string;
  name: string;
  phone: string;
  email: string;
  status: string;
  createdAt: string;
}

const statusColors: Record<string, string> = {
  active: 'green',
  inactive: 'default',
  suspended: 'red',
};

const subStatusColors: Record<string, string> = {
  active: 'processing',
  trial: 'warning',
  past_due: 'error',
  cancelled: 'default',
};

const ruleNames: Record<string, string> = {
  cash_only: 'Cash Only Payments Allowed',
  advance_payment_required: 'Advance Payment Required',
  cancellation_window_hours: 'Cancellation Window (Hours)',
  min_slot_duration: 'Minimum Slot Duration (Mins)',
};

const channelIcons: Record<string, any> = {
  web: GlobalOutlined,
  portal: MobileOutlined,
  bot: RobotOutlined,
};

export const FacilityDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();

  const [detail, setDetail] = useState<FacilityDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals & Control Action States
  const [courtLimitModalVisible, setCourtLimitModalVisible] = useState(false);
  const [courtLimitForm] = Form.useForm();
  const [courtLimitSubmitting, setCourtLimitSubmitting] = useState(false);

  const [credentialsModalVisible, setCredentialsModalVisible] = useState(false);
  const [credentialsForm] = Form.useForm();
  const [credentialsSubmitting, setCredentialsSubmitting] = useState(false);

  const [statusSubmitting, setStatusSubmitting] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);

  // Bookings Tab State
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingsPage, setBookingsPage] = useState(1);
  const [bookingsTotal, setBookingsTotal] = useState(0);
  const [paymentFilter, setPaymentFilter] = useState<string | undefined>(undefined);

  // Customers Tab State
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customersPage, setCustomersPage] = useState(1);
  const [customersTotal, setCustomersTotal] = useState(0);
  const [customerSearch, setCustomerSearch] = useState('');

  const fetchDetail = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await api.get<FacilityDetailResponse>(`/facilities/${id}`, token!);
      setDetail(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to load facility detail');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id, token]);

  const fetchBookings = async (p: number, payStatus?: string) => {
    if (!id) return;
    setBookingsLoading(true);
    try {
      let path = `/facilities/${id}/bookings?page=${p}&limit=10`;
      if (payStatus) path += `&paymentStatus=${payStatus}`;
      const res = await api.get<{ data: BookingRow[]; meta: { total: number } }>(path, token!);
      setBookings(res.data);
      setBookingsTotal(res.meta.total);
    } catch (err) {
      console.error('Failed to fetch bookings', err);
    } finally {
      setBookingsLoading(false);
    }
  };

  const fetchCustomers = async (p: number, s?: string) => {
    if (!id) return;
    setCustomersLoading(true);
    try {
      let path = `/facilities/${id}/customers?page=${p}&limit=10`;
      if (s) path += `&search=${encodeURIComponent(s)}`;
      const res = await api.get<{ data: CustomerRow[]; meta: { total: number } }>(path, token!);
      setCustomers(res.data);
      setCustomersTotal(res.meta.total);
    } catch (err) {
      console.error('Failed to fetch customers', err);
    } finally {
      setCustomersLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings(bookingsPage, paymentFilter);
  }, [id, bookingsPage, paymentFilter]);

  useEffect(() => {
    fetchCustomers(customersPage, customerSearch);
  }, [id, customersPage, customerSearch]);

  // Control Action 1: Handle Court Limit Update with Validation
  const handleUpdateCourtLimit = async (values: { courtLimit: number }) => {
    if (!id || !detail) return;
    const currentCourtCount = detail.courts.length;
    if (values.courtLimit < currentCourtCount) {
      message.error(
        `Cannot set court limit to ${values.courtLimit} because facility already has ${currentCourtCount} courts configured!`,
      );
      return;
    }

    setCourtLimitSubmitting(true);
    try {
      await api.patch(`/facilities/${id}/court-limit`, values, token!);
      message.success(`Court limit successfully updated to ${values.courtLimit}`);
      setCourtLimitModalVisible(false);
      fetchDetail();
    } catch (err: any) {
      message.error(err?.message || 'Failed to update court limit');
    } finally {
      setCourtLimitSubmitting(false);
    }
  };

  // Control Action 2: Handle Admin Credentials Reset (with Audit Log)
  const handleUpdateAdminCredentials = async (values: { email: string; password?: string }) => {
    if (!id) return;
    setCredentialsSubmitting(true);
    try {
      await api.patch(`/facilities/${id}/admin-credentials`, values, token!);
      message.success('Admin credentials updated & audit log recorded successfully');
      setCredentialsModalVisible(false);
      credentialsForm.resetFields();
      fetchDetail();
    } catch (err: any) {
      message.error(err?.message || 'Failed to update admin credentials');
    } finally {
      setCredentialsSubmitting(false);
    }
  };

  // Control Action 3: Handle Suspend / Reactivate Status Toggle
  const handleToggleStatus = async () => {
    if (!id || !detail) return;
    const newStatus = detail.facility.status === 'active' ? 'suspended' : 'active';
    setStatusSubmitting(true);
    try {
      await api.patch(`/facilities/${id}/status`, { status: newStatus }, token!);
      message.success(`Facility status updated to ${newStatus.toUpperCase()}`);
      fetchDetail();
    } catch (err: any) {
      message.error(err?.message || 'Failed to update facility status');
    } finally {
      setStatusSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 450 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/facilities')} style={{ marginBottom: 16 }}>
          Back to Facilities
        </Button>
        <Alert message="Facility Not Found" description={error || 'The requested facility does not exist'} type="error" showIcon />
      </div>
    );
  }

  const { facility, courts, usersByRole, subscription, bookingRules, auditLogs, paymentBreakdown, stats } = detail;
  const adminUser = usersByRole.facility_admin[0];

  const bookingColumns = [
    {
      title: 'Booking Time',
      key: 'time',
      render: (_: any, r: BookingRow) => (
        <div>
          <Text strong style={{ fontSize: 13 }}>
            {new Date(r.startTime).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
          </Text>
          <div style={{ fontSize: 12, color: '#8c8c8c' }}>
            {new Date(r.startTime).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })} - {new Date(r.endTime).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      ),
    },
    {
      title: 'Court',
      key: 'court',
      render: (_: any, r: BookingRow) => (
        <span>{r.courtId ? `${r.courtId.name} (${r.courtId.sport})` : 'Main Court'}</span>
      ),
    },
    {
      title: 'Customer',
      key: 'customer',
      render: (_: any, r: BookingRow) => (
        <div>
          <Text strong>{r.customerId?.name || 'Guest'}</Text>
          {r.customerId?.phone && <div style={{ fontSize: 12, color: '#8c8c8c' }}>{r.customerId.phone}</div>}
        </div>
      ),
    },
    {
      title: 'Channel',
      key: 'source',
      align: 'center' as const,
      render: (_: any, r: BookingRow) => {
        const IconComp = channelIcons[r.source] || GlobalOutlined;
        return (
          <Tooltip title={`Source: ${r.source}`}>
            <IconComp style={{ fontSize: 16, color: '#1677ff' }} />
          </Tooltip>
        );
      },
    },
    {
      title: 'Payment Status',
      dataIndex: 'paymentStatus',
      key: 'paymentStatus',
      render: (status: string) => (
        <Tag color={status === 'fully_paid' ? 'green' : status === 'partially_paid' ? 'orange' : 'red'}>
          {status ? status.toUpperCase() : 'UNPAID'}
        </Tag>
      ),
    },
    {
      title: 'Amount (PKR)',
      key: 'amount',
      align: 'right' as const,
      render: (_: any, r: BookingRow) => (
        <div>
          <Text strong>PKR {r.amountPaid.toLocaleString()}</Text>
          <div style={{ fontSize: 11, color: '#8c8c8c' }}>Total: {r.totalAmount.toLocaleString()}</div>
        </div>
      ),
    },
  ];

  const customerColumns = [
    { title: 'Customer Name', dataIndex: 'name', key: 'name' },
    { title: 'Phone Number', dataIndex: 'phone', key: 'phone' },
    { title: 'Email Address', dataIndex: 'email', key: 'email' },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (st: string) => <Tag color={st === 'active' ? 'green' : 'default'}>{st.toUpperCase()}</Tag>,
    },
    {
      title: 'Joined Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (dt: string) => new Date(dt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }),
    },
  ];

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      {/* Back Button */}
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/facilities')} style={{ marginBottom: 16 }}>
        Back to Facilities
      </Button>

      {/* Header Banner with Administrative Controls (P1) */}
      <Card style={{ marginBottom: 24, borderRadius: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Title level={2} style={{ margin: 0 }}>
                {facility.name}
              </Title>
              <Tag color={statusColors[facility.status] || 'default'} style={{ fontSize: 13, padding: '2px 10px' }}>
                {facility.status.toUpperCase()}
              </Tag>
              {subscription && (
                <Tag color={subStatusColors[subscription.status] || 'default'} style={{ fontSize: 13, padding: '2px 10px' }}>
                  {subscription.plan.toUpperCase()} · {subscription.status.toUpperCase()}
                </Tag>
              )}
            </div>
            <Paragraph type="secondary" style={{ margin: '4px 0 0' }}>
              <BankOutlined style={{ marginRight: 6 }} /> {facility.city}, Pakistan · Onboarded on{' '}
              {new Date(facility.createdAt).toLocaleDateString('en-PK', { month: 'long', year: 'numeric' })}
            </Paragraph>
          </div>

          {/* Action Control Buttons (P1 Requirement) */}
          <Space wrap>
            <Button
              icon={<EditOutlined />}
              type="primary"
              onClick={() => setEditModalOpen(true)}
            >
              Edit Facility Info
            </Button>

            <Button
              icon={<EditOutlined />}
              onClick={() => {
                courtLimitForm.setFieldsValue({ courtLimit: facility.courtLimit });
                setCourtLimitModalVisible(true);
              }}
            >
              Edit Court Limit ({facility.courtLimit})
            </Button>

            <Button
              icon={<LockOutlined />}
              onClick={() => {
                credentialsForm.setFieldsValue({ email: adminUser?.email || '' });
                setCredentialsModalVisible(true);
              }}
            >
              Reset Admin Credentials
            </Button>

            <Popconfirm
              title={`${facility.status === 'active' ? 'Suspend' : 'Reactivate'} Facility?`}
              description={`Are you sure you want to ${facility.status === 'active' ? 'suspend' : 'reactivate'} ${facility.name}?`}
              onConfirm={handleToggleStatus}
              okText="Yes, Proceed"
              cancelText="Cancel"
              okButtonProps={{ danger: facility.status === 'active', loading: statusSubmitting }}
            >
              <Button
                danger={facility.status === 'active'}
                type={facility.status === 'active' ? 'default' : 'primary'}
                icon={facility.status === 'active' ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
              >
                {facility.status === 'active' ? 'Suspend Facility' : 'Reactivate Facility'}
              </Button>
            </Popconfirm>
          </Space>
        </div>
      </Card>

      {/* Stats Cards Row */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ borderRadius: 8 }} bodyStyle={{ padding: 18 }}>
            <Statistic
              title="30-Day Revenue"
              value={stats.revenue30Days}
              precision={0}
              suffix="PKR"
              prefix={<DollarOutlined style={{ color: '#52c41a' }} />}
            />
            <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
              All-Time: PKR {stats.totalRevenueAllTime.toLocaleString()}
            </Text>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card style={{ borderRadius: 8 }} bodyStyle={{ padding: 18 }}>
            <Statistic
              title="Lifetime Bookings"
              value={stats.totalBookings}
              prefix={<CalendarOutlined style={{ color: '#1677ff' }} />}
            />
            <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
              Cancellation Rate: <strong>{stats.cancellationRate}%</strong> ({stats.cancelledBookings} cancelled)
            </Text>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card style={{ borderRadius: 8 }} bodyStyle={{ padding: 18 }}>
            <Statistic
              title="Active Customers"
              value={stats.activeCustomers}
              prefix={<UserOutlined style={{ color: '#722ed1' }} />}
            />
            <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
              Scoped to facilityId
            </Text>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card style={{ borderRadius: 8 }} bodyStyle={{ padding: 18 }}>
            <Statistic
              title="Monthly Base Fee"
              value={subscription?.monthlyBaseFee || 0}
              suffix="PKR"
              prefix={<SafetyCertificateOutlined style={{ color: '#fa8c16' }} />}
            />
            <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
              Renews: {subscription ? new Date(subscription.renewsAt).toLocaleDateString('en-PK') : 'N/A'}
            </Text>
          </Card>
        </Col>
      </Row>

      {/* VIEW-ONLY P0 SECTIONS ROW 1: Users by Role & Bookings Payment Breakdown */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {/* Section 1: Users Broken Down by Role */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <UserOutlined style={{ color: '#1677ff' }} />
                <span>Facility Team Users (Grouped by Role)</span>
                <Badge count={Object.values(usersByRole).flat().length} overflowCount={999} style={{ backgroundColor: '#1677ff' }} />
              </Space>
            }
            bodyStyle={{ minHeight: 280 }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <Text type="secondary" style={{ fontSize: 12, textTransform: 'uppercase', fontWeight: 600 }}>
                  FACILITY ADMINS ({usersByRole.facility_admin.length})
                </Text>
                {usersByRole.facility_admin.map((u) => (
                  <div key={u._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dashed #f0f0f0' }}>
                    <Text strong>{u.name}</Text>
                    <Text type="secondary">{u.email}</Text>
                  </div>
                ))}
              </div>

              <div>
                <Text type="secondary" style={{ fontSize: 12, textTransform: 'uppercase', fontWeight: 600 }}>
                  MANAGERS ({usersByRole.manager.length})
                </Text>
                {usersByRole.manager.length === 0 ? (
                  <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>No managers assigned</Text>
                ) : (
                  usersByRole.manager.map((u) => (
                    <div key={u._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dashed #f0f0f0' }}>
                      <Text strong>{u.name}</Text>
                      <Text type="secondary">{u.email}</Text>
                    </div>
                  ))
                )}
              </div>

              <div>
                <Text type="secondary" style={{ fontSize: 12, textTransform: 'uppercase', fontWeight: 600 }}>
                  STAFF & COACHES ({usersByRole.staff.length + usersByRole.coach.length})
                </Text>
                {[...usersByRole.staff, ...usersByRole.coach].length === 0 ? (
                  <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>No staff or coaches assigned</Text>
                ) : (
                  [...usersByRole.staff, ...usersByRole.coach].map((u) => (
                    <div key={u._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dashed #f0f0f0' }}>
                      <Text strong>{u.name} ({u.role})</Text>
                      <Text type="secondary">{u.email}</Text>
                    </div>
                  ))
                )}
              </div>
            </div>
          </Card>
        </Col>

        {/* Section 2: Bookings Breakdown by Payment Type */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <DollarOutlined style={{ color: '#52c41a' }} />
                <span>Bookings Breakdown by Payment Type</span>
              </Space>
            }
            bodyStyle={{ minHeight: 280 }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 8 }}>
              {/* Fully Paid */}
              <div style={{ background: '#f6ffed', padding: 12, borderRadius: 8, border: '1px solid #b7eb8f', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <Tag color="green" style={{ margin: 0, fontWeight: 600 }}>FULLY PAID</Tag>
                  <div style={{ fontSize: 12, color: '#595959', marginTop: 4 }}>{paymentBreakdown.fully_paid.count} Bookings</div>
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#389e0d' }}>
                  PKR {paymentBreakdown.fully_paid.revenue.toLocaleString()}
                </div>
              </div>

              {/* Partially Paid */}
              <div style={{ background: '#fffbe6', padding: 12, borderRadius: 8, border: '1px solid #ffe58f', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <Tag color="orange" style={{ margin: 0, fontWeight: 600 }}>PARTIALLY PAID</Tag>
                  <div style={{ fontSize: 12, color: '#595959', marginTop: 4 }}>{paymentBreakdown.partially_paid.count} Bookings</div>
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#d46b08' }}>
                  PKR {paymentBreakdown.partially_paid.revenue.toLocaleString()}
                </div>
              </div>

              {/* Unpaid */}
              <div style={{ background: '#fff2f0', padding: 12, borderRadius: 8, border: '1px solid #ffccc7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <Tag color="red" style={{ margin: 0, fontWeight: 600 }}>UNPAID / OUTSTANDING</Tag>
                  <div style={{ fontSize: 12, color: '#595959', marginTop: 4 }}>{paymentBreakdown.unpaid.count} Bookings</div>
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#cf1322' }}>
                  PKR {paymentBreakdown.unpaid.revenue.toLocaleString()}
                </div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* VIEW-ONLY P0 SECTIONS ROW 2: Booking Rules & Audit Logs */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {/* Booking Rules Summary */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <CheckCircleOutlined style={{ color: '#1677ff' }} />
                <span>Booking Rules Configuration</span>
              </Space>
            }
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {bookingRules.map((rule) => (
                <div key={rule.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#fafafa', borderRadius: 6 }}>
                  <div>
                    <Text strong>{ruleNames[rule.key] || rule.key}</Text>
                    <div style={{ fontSize: 12, color: '#8c8c8c' }}>Configured Value: {rule.value}</div>
                  </div>
                  <Tag color={rule.isEnabled ? 'green' : 'default'}>
                    {rule.isEnabled ? 'ENABLED' : 'DISABLED'}
                  </Tag>
                </div>
              ))}
            </div>
          </Card>
        </Col>

        {/* Audit Log Trail (P1 Control Requirement) */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <HistoryOutlined style={{ color: '#fa8c16' }} />
                <span>Super Admin Audit Log Trail</span>
              </Space>
            }
          >
            {!auditLogs || auditLogs.length === 0 ? (
              <Text type="secondary">No administrative actions logged for this facility yet.</Text>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {auditLogs.map((log) => (
                  <div key={log._id} style={{ padding: '8px 12px', background: '#fafafa', borderRadius: 6, border: '1px solid #f0f0f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                      <Tag color="orange">{log.action}</Tag>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {new Date(log.createdAt).toLocaleString('en-PK')}
                      </Text>
                    </div>
                    <div style={{ fontSize: 12, color: '#262626' }}>{log.details}</div>
                    <div style={{ fontSize: 11, color: '#8c8c8c', marginTop: 2 }}>By: {log.performedBy}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* Tabbed Paginated Tables (Bookings & Customers) */}
      <Card>
        <Tabs
          defaultActiveKey="bookings"
          items={[
            {
              key: 'bookings',
              label: `Bookings History (${bookingsTotal})`,
              children: (
                <div>
                  <div style={{ marginBottom: 16 }}>
                    <Select
                      placeholder="Filter by payment status"
                      value={paymentFilter}
                      onChange={(val) => { setPaymentFilter(val); setBookingsPage(1); }}
                      allowClear
                      style={{ width: 220 }}
                      options={[
                        { value: 'fully_paid', label: 'Payment: Fully Paid' },
                        { value: 'partially_paid', label: 'Payment: Partially Paid' },
                        { value: 'unpaid', label: 'Payment: Unpaid' },
                      ]}
                    />
                  </div>
                  <Table
                    dataSource={bookings}
                    columns={bookingColumns}
                    rowKey="_id"
                    loading={bookingsLoading}
                    pagination={{
                      current: bookingsPage,
                      total: bookingsTotal,
                      pageSize: 10,
                      onChange: (p) => setBookingsPage(p),
                      showTotal: (t) => `Total ${t} bookings for this facility`,
                    }}
                  />
                </div>
              ),
            },
            {
              key: 'customers',
              label: `Facility Customers (${customersTotal})`,
              children: (
                <div>
                  <div style={{ marginBottom: 16 }}>
                    <Input
                      placeholder="Search customer by name, phone, or email..."
                      prefix={<SearchOutlined />}
                      value={customerSearch}
                      onChange={(e) => { setCustomerSearch(e.target.value); setCustomersPage(1); }}
                      style={{ width: 300 }}
                      allowClear
                    />
                  </div>
                  <Table
                    dataSource={customers}
                    columns={customerColumns}
                    rowKey="_id"
                    loading={customersLoading}
                    pagination={{
                      current: customersPage,
                      total: customersTotal,
                      pageSize: 10,
                      onChange: (p) => setCustomersPage(p),
                      showTotal: (t) => `Total ${t} customers for this facility`,
                    }}
                  />
                </div>
              ),
            },
          ]}
        />
      </Card>

      {/* Control Modal 1: Edit Court Limit */}
      <Modal
        title="Edit Court Limit"
        open={courtLimitModalVisible}
        onCancel={() => setCourtLimitModalVisible(false)}
        onOk={() => courtLimitForm.submit()}
        confirmLoading={courtLimitSubmitting}
        okText="Update Limit"
      >
        <Alert
          message="Validation Notice"
          description={`Facility currently has ${courts.length} active courts configured. Court limit cannot be lower than ${courts.length}.`}
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Form form={courtLimitForm} layout="vertical" onFinish={handleUpdateCourtLimit}>
          <Form.Item
            name="courtLimit"
            label="Maximum Allowed Court Limit"
            rules={[
              { required: true, message: 'Please enter court limit' },
              {
                validator: (_, value) =>
                  value >= courts.length
                    ? Promise.resolve()
                    : Promise.reject(
                        new Error(`Court limit cannot be lower than ${courts.length} existing courts!`),
                      ),
              },
            ]}
          >
            <InputNumber min={courts.length} max={50} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Control Modal 2: Reset Admin Credentials (with Audit Log) */}
      <Modal
        title="Reset Facility Admin Credentials"
        open={credentialsModalVisible}
        onCancel={() => setCredentialsModalVisible(false)}
        onOk={() => credentialsForm.submit()}
        confirmLoading={credentialsSubmitting}
        okText="Save Credentials & Record Audit"
      >
        <Alert
          message="Audit Log Requirement"
          description="Updating admin email or password will automatically create an immutable Audit Log entry in database."
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Form form={credentialsForm} layout="vertical" onFinish={handleUpdateAdminCredentials}>
          <Form.Item
            name="email"
            label="Facility Admin Email Address"
            rules={[
              { required: true, message: 'Please enter email' },
              { type: 'email', message: 'Please enter a valid email' },
            ]}
          >
            <Input prefix={<UserOutlined />} />
          </Form.Item>

          <Form.Item
            name="password"
            label="New Temporary Password (Optional)"
            extra="Leave blank if you only want to update the email address"
            rules={[{ min: 6, message: 'Password must be at least 6 characters' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Enter new password" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Facility Info Modal (Spec 4.3 Reused Form) */}
      {facility && (
        <CreateFacilityModal
          open={editModalOpen}
          facilityToEdit={{
            _id: facility._id,
            name: facility.name,
            city: facility.city,
            courtLimit: facility.courtLimit,
          }}
          onClose={() => setEditModalOpen(false)}
          onSuccess={() => {
            setEditModalOpen(false);
            fetchDetail();
          }}
        />
      )}
    </div>
  );
};
