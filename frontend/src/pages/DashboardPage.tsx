import React from 'react';
import { Typography, Card, Row, Col, Statistic } from 'antd';
import { BankOutlined, UserOutlined, FileTextOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

export const DashboardPage: React.FC = () => {
  return (
    <div>
      <Title level={2}>Super Admin Dashboard</Title>
      <Paragraph type="secondary">
        Overview of all registered facilities and system-wide stats.
      </Paragraph>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Total Facilities"
              value={0}
              prefix={<BankOutlined />}
            />
            {/* TODO: Connect to backend aggregation pipeline */}
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Total Users"
              value={0}
              prefix={<UserOutlined />}
            />
            {/* TODO: Connect to backend aggregation pipeline */}
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Active Tenants"
              value={0}
              prefix={<FileTextOutlined />}
            />
            {/* TODO: Connect to backend aggregation pipeline */}
          </Card>
        </Col>
      </Row>
    </div>
  );
};
