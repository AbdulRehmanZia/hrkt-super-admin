import React, { useState } from 'react';
import { Layout, Menu, Typography, Avatar, Drawer, Button, Dropdown } from 'antd';
import {
  DashboardOutlined,
  BankOutlined,
  DollarOutlined,
  LogoutOutlined,
  UserOutlined,
  MenuOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const { Header, Content, Sider } = Layout;
const { Text, Title } = Typography;

export const MainLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const mainNavItems = [
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
      key: '/invoices',
      icon: <DollarOutlined />,
      label: 'Billing & Invoices',
    },
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    setDrawerOpen(false);
    navigate(key);
  };

  const handleLogout = () => {
    setDrawerOpen(false);
    logout();
    navigate('/login', { replace: true });
  };

  const userMenuItems = [
    {
      key: 'user_info',
      label: (
        <div style={{ padding: '4px 8px' }}>
          <Text strong style={{ display: 'block' }}>{user?.name}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{user?.email}</Text>
        </div>
      ),
      disabled: true,
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined style={{ color: '#EF4444' }} />,
      label: <span style={{ color: '#EF4444', fontWeight: 600 }}>Logout</span>,
      onClick: handleLogout,
    },
  ];

  const navContent = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between', background: '#111827' }}>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* Premium Logo Header */}
        <div
          style={{
            height: 64,
            padding: '0 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed && !isMobile ? 'center' : 'flex-start',
            borderBottom: '1px solid #1F2937',
            marginBottom: 12,
          }}
        >
          <img
            src="/hrkt green-01.svg"
            alt="HRKT Logo"
            style={{ height: 34, maxWidth: '100%', objectFit: 'contain' }}
          />
        </div>

        {/* Main Navigation Menu */}
        <Menu
          theme="dark"
          selectedKeys={[location.pathname]}
          mode="inline"
          className="hrkt-sidebar-menu"
          items={mainNavItems}
          onClick={handleMenuClick}
          style={{ background: '#111827', borderRight: 0 }}
        />
      </div>

      {/* Fixed Bottom Logout Section */}
      <div
        style={{
          padding: 14,
          borderTop: '1px solid #1F2937',
          background: '#111827',
          position: 'sticky',
          bottom: 0,
          zIndex: 10,
        }}
      >
        <Button
          type="text"
          danger
          icon={<LogoutOutlined />}
          onClick={handleLogout}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed && !isMobile ? 'center' : 'flex-start',
            gap: 10,
            color: '#EF4444',
            fontWeight: 500,
            borderRadius: 8,
          }}
        >
          {(!collapsed || isMobile) && <span>Logout</span>}
        </Button>
      </div>
    </div>
  );

  return (
    <Layout style={{ minHeight: '100vh', background: '#F3F6F8' }}>
      {/* Fixed Desktop Sidebar (#111827 Dark Charcoal) */}
      {!isMobile && (
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          breakpoint="md"
          collapsedWidth={80}
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            bottom: 0,
            height: '100vh',
            zIndex: 1000,
            background: '#111827',
            borderRight: '1px solid #1F2937',
          }}
          onBreakpoint={(broken) => {
            setIsMobile(broken);
            setCollapsed(broken);
          }}
        >
          {navContent}
        </Sider>
      )}

      {/* Mobile Navigation Drawer */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        placement="left"
        width={240}
        styles={{ body: { padding: 0, background: '#111827' } }}
        headerStyle={{ display: 'none' }}
      >
        {navContent}
      </Drawer>

      <Layout style={{ marginLeft: isMobile ? 0 : (collapsed ? 80 : 200), transition: 'margin-left 0.2s ease', background: '#F3F6F8' }}>
        {/* Modern 64px Header */}
        <Header
          style={{
            height: 64,
            lineHeight: '64px',
            padding: '0 24px',
            background: '#FFFFFF',
            borderBottom: '1px solid #E5E7EB',
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 100,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {isMobile && (
              <Button
                type="text"
                icon={<MenuOutlined style={{ fontSize: 18 }} />}
                onClick={() => setDrawerOpen(true)}
              />
            )}
            <div>
              <Title level={4} style={{ margin: 0, fontSize: 18, color: '#111827', fontWeight: 600 }}>
                Super Admin Panel
              </Title>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', lineHeight: 1 }}>
                Welcome back, Super Admin
              </Text>
            </div>
          </div>

          {/* Unclipped Top Right User Dropdown Menu */}
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" arrow>
            <Avatar
              icon={<UserOutlined />}
              style={{ backgroundColor: '#00C27A', cursor: 'pointer' }}
              size="large"
            />
          </Dropdown>
        </Header>

        <Content style={{ margin: isMobile ? '16px 12px' : '24px 28px', background: 'transparent' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};
