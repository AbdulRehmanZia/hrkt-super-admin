import React from 'react';
import { Typography, Card, Button, Result } from 'antd';
import { ArrowLeftOutlined, LoadingOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title } = Typography;

export const FacilityDetailPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div>
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/facilities')}
        style={{ marginBottom: 16 }}
      >
        Back to Facilities
      </Button>

      <Title level={2}>Facility Detail</Title>

      <Card>
        <Result
          icon={<LoadingOutlined style={{ fontSize: 48, color: '#1677ff' }} />}
          title="Detail view coming soon"
          subTitle="Full facility analytics, booking history, customers, and controls will be wired up in Step 8."
          extra={
            <Button type="primary" onClick={() => navigate('/facilities')}>
              Back to List
            </Button>
          }
        />
      </Card>
    </div>
  );
};
