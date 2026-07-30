import React, { useEffect, useState } from 'react';
import {
  Typography,
  Row,
  Col,
  Card,
  Statistic,
  Progress,
  Table,
  Tag,
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
          <CheckCircleOutlined style={{ color: '#52c41a' }} />
          <Text strong>{ruleNames[key] || key}</Text>
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
            strokeColor="#1677ff"
          />
          <Text type="secondary" style={{ fontSize: 12 }}>
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
        <Tag color={pct >= 60 ? 'green' : pct >= 30 ? 'orange' : 'default'}>
          {pct}% Adopted
        </Tag>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>
          Platform Dashboard
        </Title>
        <Text type="secondary">
          System-wide performance, revenue trends, and tenant feature adoption across hrkt platform
        </Text>
      </div>

      {/* Primary KPI Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ borderRadius: 8 }} bodyStyle={{ padding: 20 }}>
            <Statistic
              title={
                <Space>
                  <DollarOutlined style={{ color: '#52c41a' }} />
                  <span>30-Day Platform Revenue</span>
                </Space>
              }
              value={kpis.revenue30Days}
              precision={0}
              suffix="PKR"
              valueStyle={{ color: '#1f1f1f', fontWeight: 600 }}
            />
            <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
              All-time: PKR {kpis.totalRevenueAllTime.toLocaleString()}
            </Text>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card style={{ borderRadius: 8 }} bodyStyle={{ padding: 20 }}>
            <Statistic
              title={
                <Space>
                  <BankOutlined style={{ color: '#1677ff' }} />
                  <span>Total Facilities</span>
                </Space>
              }
              value={kpis.totalFacilities}
              valueStyle={{ color: '#1f1f1f', fontWeight: 600 }}
            />
            <Space size={4} style={{ marginTop: 4 }}>
              <Tag color="green">{kpis.activeFacilities} Active</Tag>
              <Tag color="red">{kpis.suspendedFacilities} Suspended</Tag>
              <Tag color="default">{kpis.inactiveFacilities} Inactive</Tag>
            </Space>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card style={{ borderRadius: 8 }} bodyStyle={{ padding: 20 }}>
            <Statistic
              title={
                <Space>
                  <UserOutlined style={{ color: '#722ed1' }} />
                  <span>Active Customers</span>
                </Space>
              }
              value={kpis.totalActiveCustomers}
              valueStyle={{ color: '#1f1f1f', fontWeight: 600 }}
            />
            <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
              Filter: customer.status === 'active'
            </Text>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card style={{ borderRadius: 8 }} bodyStyle={{ padding: 20 }}>
            <Statistic
              title={
                <Space>
                  <CalendarOutlined style={{ color: '#fa8c16' }} />
                  <span>30-Day Bookings</span>
                </Space>
              }
              value={kpis.bookings30Days}
              valueStyle={{ color: '#1f1f1f', fontWeight: 600 }}
            />
            <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
              Total All-Time: {kpis.totalBookings.toLocaleString()}
            </Text>
          </Card>
        </Col>
      </Row>

      {/* Row 2: Booking Rule Adoption (Spec Priority) + Source Breakdown */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={15}>
          <Card
            title={
              <Space>
                <CheckCircleOutlined style={{ color: '#1677ff' }} />
                <span>Booking-Rule Adoption Metric</span>
                <Tooltip title="Tracks how many active facilities have enabled each rule key across the platform">
                  <InfoCircleOutlined style={{ color: '#bfbfbf' }} />
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
              size="middle"
            />
          </Card>
        </Col>

        <Col xs={24} lg={9}>
          <Card
            title={
              <Space>
                <GlobalOutlined style={{ color: '#13c2c2' }} />
                <span>Booking Channel Distribution</span>
              </Space>
            }
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text>
                    <GlobalOutlined style={{ marginRight: 6, color: '#1677ff' }} /> Web Widget
                  </Text>
                  <Text strong>
                    {sourceBreakdown.web} ({kpis.totalBookings > 0 ? Math.round((sourceBreakdown.web / kpis.totalBookings) * 100) : 0}%)
                  </Text>
                </div>
                <Progress percent={kpis.totalBookings > 0 ? Math.round((sourceBreakdown.web / kpis.totalBookings) * 100) : 0} showInfo={false} strokeColor="#1677ff" />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text>
                    <MobileOutlined style={{ marginRight: 6, color: '#722ed1' }} /> Customer Portal
                  </Text>
                  <Text strong>
                    {sourceBreakdown.portal} ({kpis.totalBookings > 0 ? Math.round((sourceBreakdown.portal / kpis.totalBookings) * 100) : 0}%)
                  </Text>
                </div>
                <Progress percent={kpis.totalBookings > 0 ? Math.round((sourceBreakdown.portal / kpis.totalBookings) * 100) : 0} showInfo={false} strokeColor="#722ed1" />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text>
                    <RobotOutlined style={{ marginRight: 6, color: '#fa8c16' }} /> WhatsApp/AI Bot
                  </Text>
                  <Text strong>
                    {sourceBreakdown.bot} ({kpis.totalBookings > 0 ? Math.round((sourceBreakdown.bot / kpis.totalBookings) * 100) : 0}%)
                  </Text>
                </div>
                <Progress percent={kpis.totalBookings > 0 ? Math.round((sourceBreakdown.bot / kpis.totalBookings) * 100) : 0} showInfo={false} strokeColor="#fa8c16" />
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Row 3: Revenue Trend Chart + Discount Adoption */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={15}>
          <Card
            title={
              <Space>
                <DollarOutlined style={{ color: '#52c41a' }} />
                <span>Month-over-Month Platform Revenue (Last 6 Months)</span>
              </Space>
            }
          >
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, height: 200, paddingTop: 20 }}>
              {revenueTrend.map((item) => {
                const heightPct = Math.round((item.revenue / maxMonthlyRevenue) * 100);
                return (
                  <div
                    key={item.month}
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      height: '100%',
                      justifyContent: 'flex-end',
                    }}
                  >
                    <Tooltip title={`PKR ${item.revenue.toLocaleString()} (${item.bookings} bookings)`}>
                      <div
                        style={{
                          width: '100%',
                          maxWidth: 40,
                          height: `${Math.max(heightPct, 8)}%`,
                          background: 'linear-gradient(180deg, #52c41a 0%, #278003 100%)',
                          borderRadius: '4px 4px 0 0',
                          transition: 'all 0.3s',
                        }}
                      />
                    </Tooltip>
                    <Text type="secondary" style={{ fontSize: 11, marginTop: 8 }}>
                      {item.month}
                    </Text>
                  </div>
                );
              })}
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={9}>
          <Card
            title={
              <Space>
                <TagOutlined style={{ color: '#eb2f96' }} />
                <span>Discount Type Adoption</span>
              </Space>
            }
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {discountAdoption.map((disc) => (
                <div
                  key={disc.type}
                  style={{
                    padding: 12,
                    background: '#fafafa',
                    borderRadius: 6,
                    border: '1px solid #f0f0f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <Text strong>{discountTypeNames[disc.type] || disc.type}</Text>
                    <div>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {disc.activeCount} active rules across platform
                      </Text>
                    </div>
                  </div>
                  <Tag color="purple">{disc.totalTimesUsed} Uses</Tag>
                </div>
              ))}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};
