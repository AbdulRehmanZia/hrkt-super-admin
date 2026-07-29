import React, { useState } from 'react';
import { Layout, Menu, Typography, Avatar, Space } from 'antd';
import {
  DashboardOutlined,
  BankOutlined,
  LogoutOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const { Header, Content, Sider } = Layout;
const { Title, Text } = Typography;

export const MainLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const menuItems = [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
    },
    {
      key: '/facilities',
      icon: <BankOutlined />,
      label: 'Facilities',
    },
    {
      key: '__logout__',
      icon: <LogoutOutlined />,
      label: 'Logout',
    },
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    if (key === '__logout__') {
      logout();
      navigate('/login', { replace: true });
    } else {
      navigate(key);
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed}>
        <div
          style={{
            height: 32,
            margin: 16,
            background: 'rgba(255, 255, 255, 0.2)',
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Title level={5} style={{ color: '#fff', margin: 0 }}>
            {collapsed ? 'HRKT' : 'HRKT Admin'}
          </Title>
        </div>
        <Menu
          theme="dark"
          selectedKeys={[location.pathname]}
          mode="inline"
          items={menuItems}
          onClick={handleMenuClick}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            padding: '0 24px',
            background: '#fff',
            boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
          }}
        >
          <Space>
            <Avatar icon={<UserOutlined />} />
            {!collapsed && <Text strong>{user?.name}</Text>}
          </Space>
        </Header>
        <Content style={{ margin: '24px 16px', padding: 24, background: '#fff', borderRadius: 8 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};
