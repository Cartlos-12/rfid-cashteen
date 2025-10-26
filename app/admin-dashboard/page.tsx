'use client';

import DashboardContent from './dashboardcontent';

export default function DashboardHome() {
  return (
    <div className="container-fluid">
      {/* Main content: charts and stats */}
      <DashboardContent />
    </div>
  );
}
