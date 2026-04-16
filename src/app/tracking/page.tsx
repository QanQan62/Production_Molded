import TrackingApp from '@/components/TrackingApp';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tracking Pro | Hệ thống quản lý đơn hàng',
  description: 'Ứng dụng theo dõi tiến độ và vị trí đơn hàng trong thời gian thực.',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0',
};

export default function TrackingPage() {
  return <TrackingApp />;
}
