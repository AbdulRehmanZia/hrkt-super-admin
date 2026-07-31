import React, { useEffect, useState } from 'react';
import {
  Typography,
  Row,
  Col,
  Card,
  Progress,
  Table,
  Spin,
  Alert,
  Tooltip,
  Space,
} from 'antd';
import {
  BankOutlined,
  UserOutlined,
  DollarOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
  GlobalOutlined,
  MobileOutlined,
  RobotOutlined,
  TagOutlined,
} from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

const { Title, Text } = Typography;

interface DashboardStats {
  kpis: {
    totalFacilities: number;
    activeFacilities: number;
    inactiveFacilities: number;
    suspendedFacilities: number;
    totalActiveCustomers: number;
    revenue30Days: number;
    bookings30Days: number;
    totalBookings: number;
    totalRevenueAllTime: number;
  };
  sourceBreakdown: {
    web: number;
    portal: number;
    bot: number;
  };
  paymentBreakdown?: {
    fully_paid: { count: number; revenue: number };
    partially_paid: { count: number; revenue: number };
    unpaid: { count: number; revenue: number };
  };
  revenueTrend: Array<{
    month: string;
    revenue: number;
    bookings: number;
  }>;
  ruleAdoption: Array<{
    key: string;
    enabledCount: number;
    totalFacilities: number;
    percentage: number;
  }>;
  discountAdoption: Array<{
    type: string;
    activeCount: number;
    totalTimesUsed: number;
  }>;
}

const ruleNames: Record<string, string> = {
  cash_only: 'Cash Only Payments',
  advance_payment_required: 'Advance Payment Required',
  cancellation_window_hours: '24h Cancellation Window',
  min_slot_duration: 'Minimum Slot Duration (60m)',
};

const discountTypeNames: Record<string, string> = {
  percentage: 'Percentage Discount (%)',
  fixed: 'Flat Fixed Discount (PKR)',
  promo_code: 'Promo Code Discount',
};

export const DashboardPage: React.FC = () => {
  const { token } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const res = await api.get<DashboardStats>('/dashboard/stats', token!);
        setStats(res);
      } catch (err: any) {
        setError(err?.message || 'Failed to load dashboard metrics');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [token]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <Alert
        message="Failed to load dashboard"
        description={error || 'An unexpected error occurred'}
        type="error"
        showIcon
      />
    );
  }

  const { kpis, sourceBreakdown, revenueTrend, ruleAdoption, discountAdoption } = stats;
  const maxMonthlyRevenue = Math.max(...revenueTrend.map((m) => m.revenue), 1);

  const ruleColumns = [
    {
      title: 'Booking Rule',
      dataIndex: 'key',
      key: 'key',
      render: (key: string) => (
        <Space>
          <CheckCircleOutlined style={{ color: '#00C27A' }} />
          <Text strong style={{ color: '#111827' }}>{ruleNames[key] || key}</Text>
        </Space>
      ),
    },
    {
      title: 'Adoption Rate',
      key: 'adoption',
      render: (_: any, record: (typeof ruleAdoption)[0]) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Progress
            percent={record.percentage}
            size="small"
            style={{ width: 160 }}
            strokeColor="#00C27A"
          />
          <Text type="secondary" style={{ fontSize: 12, color: '#6B7280' }}>
            {record.enabledCount} of {record.totalFacilities} active facilities
          </Text>
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'percentage',
      key: 'status',
      align: 'right' as const,
      render: (pct: number) => (
        <span className={pct >= 60 ? 'hrkt-badge hrkt-badge-green' : pct >= 30 ? 'hrkt-badge hrkt-badge-orange' : 'hrkt-badge hrkt-badge-gray'}>
          {pct}% Adopted
        </span>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto' }}>
      {/* Page Header with Increased Hierarchy */}
      <div style={{ marginBottom: 32 }}>
        <Title level={1} style={{ margin: 0, fontSize: 28, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.02em' }}>
          Platform Overview
        </Title>
        <Text type="secondary" style={{ fontSize: 13, color: '#64748B', display: 'block', marginTop: 4 }}>
          System-wide performance, revenue trends, and tenant feature adoption across HRKT platform
        </Text>
      </div>

      {/* Primary KPI Cards with Top-to-Bottom Metric Hierarchy */}
      <Row gutter={[20, 20]} style={{ marginBottom: 32 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="hrkt-card hrkt-card-hover" bodyStyle={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <Text style={{ fontSize: 13, fontWeight: 500, color: '#64748B' }}>30-Day Platform Revenue</Text>
                <div style={{ fontSize: 26, fontWeight: 700, color: '#0F172A', marginTop: 6, marginBottom: 8, letterSpacing: '-0.02em' }}>
                  PKR {kpis.revenue30Days.toLocaleString()}
                </div>
              </div>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: '#E8FFF5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <DollarOutlined style={{ fontSize: 20, color: '#00C27A' }} />
              </div>
            </div>
            <Text type="secondary" style={{ fontSize: 12, color: '#94A3B8', marginTop: 8, display: 'block' }}>
              All-time: PKR {kpis.totalRevenueAllTime.toLocaleString()}
            </Text>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card className="hrkt-card hrkt-card-hover" bodyStyle={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <Text style={{ fontSize: 13, fontWeight: 500, color: '#64748B' }}>Total Facilities</Text>
                <div style={{ fontSize: 26, fontWeight: 700, color: '#0F172A', marginTop: 6, marginBottom: 8, letterSpacing: '-0.02em' }}>
                  {kpis.totalFacilities}
                </div>
              </div>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BankOutlined style={{ fontSize: 20, color: '#475569' }} />
              </div>
            </div>
            <Space size={4} wrap style={{ marginTop: 2 }}>
              <span className="hrkt-badge hrkt-badge-green">{kpis.activeFacilities} Active</span>
              {kpis.suspendedFacilities > 0 && <span className="hrkt-badge hrkt-badge-red">{kpis.suspendedFacilities} Suspended</span>}
              {kpis.inactiveFacilities > 0 && <span className="hrkt-badge hrkt-badge-gray">{kpis.inactiveFacilities} Inactive</span>}
            </Space>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card className="hrkt-card hrkt-card-hover" bodyStyle={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <Text style={{ fontSize: 13, fontWeight: 500, color: '#64748B' }}>Active Customers</Text>
                <div style={{ fontSize: 26, fontWeight: 700, color: '#0F172A', marginTop: 6, marginBottom: 8, letterSpacing: '-0.02em' }}>
                  {kpis.totalActiveCustomers.toLocaleString()}
                </div>
              </div>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <UserOutlined style={{ fontSize: 20, color: '#2563EB' }} />
              </div>
            </div>
            <Text type="secondary" style={{ fontSize: 12, color: '#94A3B8', marginTop: 8, display: 'block' }}>
              Active platform customers
            </Text>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card className="hrkt-card hrkt-card-hover" bodyStyle={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <Text style={{ fontSize: 13, fontWeight: 500, color: '#64748B' }}>30-Day Bookings</Text>
                <div style={{ fontSize: 26, fontWeight: 700, color: '#0F172A', marginTop: 6, marginBottom: 8, letterSpacing: '-0.02em' }}>
                  {kpis.bookings30Days.toLocaleString()}
                </div>
              </div>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CalendarOutlined style={{ fontSize: 20, color: '#B45309' }} />
              </div>
            </div>
            <Text type="secondary" style={{ fontSize: 12, color: '#94A3B8', marginTop: 8, display: 'block' }}>
              Total All-Time: {kpis.totalBookings.toLocaleString()}
            </Text>
          </Card>
        </Col>
      </Row>

      {/* Featured Focal Section: Month-over-Month Revenue Chart + Discount Adoption */}
      <Row gutter={[20, 20]} style={{ marginBottom: 32 }}>
        <Col xs={24} lg={15}>
          <Card
            className="hrkt-card"
            title={
              <Space>
                <DollarOutlined style={{ color: '#00C27A', fontSize: 18 }} />
                <span style={{ fontSize: 16, fontWeight: 600, color: '#0F172A' }}>Month-over-Month Revenue Performance</span>
              </Space>
            }
          >
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, height: 220, paddingTop: 20, paddingBottom: 8 }}>
              {revenueTrend.map((m, i) => {
                const heightPct = Math.round((m.revenue / maxMonthlyRevenue) * 100);
                const isCurrentMonth = i === revenueTrend.length - 1;
                return (
                  <div key={m.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                    <Text style={{ fontSize: 11, fontWeight: 600, color: isCurrentMonth ? '#00C27A' : '#64748B', marginBottom: 6 }}>
                      PKR {Math.round(m.revenue / 1000)}k
                    </Text>
                    <Tooltip title={`PKR ${m.revenue.toLocaleString()} (${m.bookings} bookings)`}>
                      <div
                        style={{
                          width: '100%',
                          maxWidth: 44,
                          height: `${Math.max(heightPct, 12)}%`,
                          backgroundColor: 'rgba(0, 194, 122, 0.70)',
                          borderRadius: '6px 6px 0 0',
                          transition: 'all 0.2s ease',
                          opacity: isCurrentMonth ? 1 : 0.8,
                          cursor: 'pointer',
                        }}
                      />
                    </Tooltip>
                    <Text style={{ fontSize: 11, color: '#64748B', marginTop: 8 }}>{m.month}</Text>
                  </div>
                );
              })}
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={9}>
          <Card
            className="hrkt-card"
            title={
              <Space>
                <TagOutlined style={{ color: '#00C27A', fontSize: 18 }} />
                <span style={{ fontSize: 16, fontWeight: 600, color: '#0F172A' }}>Discount Type Adoption</span>
              </Space>
            }
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {discountAdoption.map((d) => (
                <div
                  key={d.type}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: 14,
                    background: '#F8FAFC',
                    borderRadius: 10,
                    border: '1px solid #E2E8F0',
                  }}
                >
                  <div>
                    <Text strong style={{ display: 'block', fontSize: 13, color: '#0F172A' }}>
                      {discountTypeNames[d.type] || d.type}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 12, color: '#64748B' }}>
                      {d.activeCount} active rules across platform
                    </Text>
                  </div>
                  <span className="hrkt-badge hrkt-badge-green" style={{ fontSize: 12 }}>
                    {d.totalTimesUsed.toLocaleString()} Uses
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </Col>
      </Row>

      {/* Secondary Section: Booking Rule Adoption + Booking Channel Distribution */}
      <Row gutter={[20, 20]}>
        <Col xs={24} lg={15}>
          <Card
            className="hrkt-card"
            title={
              <Space>
                <CheckCircleOutlined style={{ color: '#00C27A', fontSize: 18 }} />
                <span style={{ fontSize: 16, fontWeight: 600, color: '#0F172A' }}>Booking-Rule Adoption Metric</span>
                <Tooltip title="Tracks how many active facilities have enabled each rule key across the platform">
                  <InfoCircleOutlined style={{ color: '#94A3B8' }} />
                </Tooltip>
              </Space>
            }
            bodyStyle={{ padding: 0 }}
          >
            <Table
              dataSource={ruleAdoption}
              columns={ruleColumns}
              rowKey="key"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>

        <Col xs={24} lg={9}>
          <Card
            className="hrkt-card"
            title={
              <Space>
                <GlobalOutlined style={{ color: '#00C27A', fontSize: 18 }} />
                <span style={{ fontSize: 16, fontWeight: 600, color: '#0F172A' }}>Booking Channel Distribution</span>
              </Space>
            }
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18, paddingTop: 4 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={{ fontWeight: 500, color: '#334155' }}>
                    <GlobalOutlined style={{ marginRight: 8, color: '#00C27A' }} /> Web Widget
                  </Text>
                  <Text strong style={{ color: '#0F172A' }}>
                    {sourceBreakdown.web} ({kpis.totalBookings > 0 ? Math.round((sourceBreakdown.web / kpis.totalBookings) * 100) : 0}%)
                  </Text>
                </div>
                <Progress percent={kpis.totalBookings > 0 ? Math.round((sourceBreakdown.web / kpis.totalBookings) * 100) : 0} showInfo={false} strokeColor="#00C27A" />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={{ fontWeight: 500, color: '#334155' }}>
                    <MobileOutlined style={{ marginRight: 8, color: '#00C27A' }} /> Customer Portal
                  </Text>
                  <Text strong style={{ color: '#0F172A' }}>
                    {sourceBreakdown.portal} ({kpis.totalBookings > 0 ? Math.round((sourceBreakdown.portal / kpis.totalBookings) * 100) : 0}%)
                  </Text>
                </div>
                <Progress percent={kpis.totalBookings > 0 ? Math.round((sourceBreakdown.portal / kpis.totalBookings) * 100) : 0} showInfo={false} strokeColor="#00C27A" />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={{ fontWeight: 500, color: '#334155' }}>
                    <RobotOutlined style={{ marginRight: 8, color: '#F59E0B' }} /> WhatsApp/AI Bot
                  </Text>
                  <Text strong style={{ color: '#0F172A' }}>
                    {sourceBreakdown.bot} ({kpis.totalBookings > 0 ? Math.round((sourceBreakdown.bot / kpis.totalBookings) * 100) : 0}%)
                  </Text>
                </div>
                <Progress percent={kpis.totalBookings > 0 ? Math.round((sourceBreakdown.bot / kpis.totalBookings) * 100) : 0} showInfo={false} strokeColor="#F59E0B" />
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Platform Payment Status Breakdown (Item 5c) */}
      {stats.paymentBreakdown && (
        <Row gutter={[20, 20]} style={{ marginTop: 20 }}>
          <Col xs={24}>
            <Card
              className="hrkt-card"
              title={
                <Space>
                  <DollarOutlined style={{ color: '#00C27A', fontSize: 18 }} />
                  <span style={{ fontSize: 16, fontWeight: 600, color: '#0F172A' }}>Platform-Wide Bookings by Payment Status</span>
                </Space>
              }
            >
              <Row gutter={[16, 16]}>
                <Col xs={24} md={8}>
                  <div style={{ background: '#F6FFED', border: '1px solid #B7EB8F', padding: 16, borderRadius: 10 }}>
                    <Text strong style={{ color: '#389E0D', fontSize: 13 }}>FULLY PAID BOOKINGS</Text>
                    <div style={{ fontSize: 22, fontWeight: 700, color: '#111827', marginTop: 4 }}>
                      {stats.paymentBreakdown.fully_paid.count.toLocaleString()} Bookings
                    </div>
                    <Text style={{ fontSize: 13, color: '#52C41A', fontWeight: 600 }}>
                      PKR {stats.paymentBreakdown.fully_paid.revenue.toLocaleString()}
                    </Text>
                  </div>
                </Col>

                <Col xs={24} md={8}>
                  <div style={{ background: '#FFFBE6', border: '1px solid #FFE58F', padding: 16, borderRadius: 10 }}>
                    <Text strong style={{ color: '#D46B08', fontSize: 13 }}>PARTIALLY PAID BOOKINGS</Text>
                    <div style={{ fontSize: 22, fontWeight: 700, color: '#111827', marginTop: 4 }}>
                      {stats.paymentBreakdown.partially_paid.count.toLocaleString()} Bookings
                    </div>
                    <Text style={{ fontSize: 13, color: '#FA8C16', fontWeight: 600 }}>
                      PKR {stats.paymentBreakdown.partially_paid.revenue.toLocaleString()}
                    </Text>
                  </div>
                </Col>

                <Col xs={24} md={8}>
                  <div style={{ background: '#FFF2F0', border: '1px solid #FFCCC7', padding: 16, borderRadius: 10 }}>
                    <Text strong style={{ color: '#CF1322', fontSize: 13 }}>UNPAID / OUTSTANDING</Text>
                    <div style={{ fontSize: 22, fontWeight: 700, color: '#111827', marginTop: 4 }}>
                      {stats.paymentBreakdown.unpaid.count.toLocaleString()} Bookings
                    </div>
                    <Text style={{ fontSize: 13, color: '#FF4D4F', fontWeight: 600 }}>
                      PKR {stats.paymentBreakdown.unpaid.revenue.toLocaleString()}
                    </Text>
                  </div>
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>
      )}
    </div>
  );
};
