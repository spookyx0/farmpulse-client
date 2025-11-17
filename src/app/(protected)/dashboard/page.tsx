"use client";

import { useAuth } from '../../contexts/AuthContext'; // FIX: Relative path
import { useSocket } from '../../contexts/SocketContext'; // FIX: Relative path
import api from '../../services/api'; // FIX: Relative path
import { useEffect, useState } from 'react';

// FIX: Define types for our data
interface Branch {
  name: string;
}
interface Staff {
  username: string;
}
interface Sale {
  id: number;
  branch: Branch;
  total_amount: number;
  staff: Staff;
}
interface Delivery {
  id: number;
  branch: Branch;
  status: 'PENDING' | 'IN_TRANSIT' | 'DELIVERED';
}

// A simple dashboard showing recent events
export default function DashboardPage() {
  const { user } = useAuth();
  const socket = useSocket();
  const [recentSales, setRecentSales] = useState<Sale[]>([]); // FIX: Use Sale type
  const [recentDeliveries, setRecentDeliveries] = useState<Delivery[]>([]); // FIX: Use Delivery type

  // Fetch initial data
  useEffect(() => {
    if (user?.role === 'OWNER') {
      // Fetch all deliveries for owner
      api
        .get('/deliveries/owner')
        .then((res) => setRecentDeliveries(res.data.slice(0, 5))) // Get 5 most recent
        .catch(console.error);

      // TODO: We don't have an "all sales" endpoint,
      // but we will get new ones from the socket.
    }
  }, [user]);

  // Set up socket listeners
  useEffect(() => {
    if (!socket || user?.role !== 'OWNER') return;

    // Listen for new sales from any staff
    socket.on('newSale', (saleData: Sale) => { // FIX: Use Sale type
      console.log('Socket event: newSale', saleData);
      setRecentSales((prevSales) => [saleData, ...prevSales].slice(0, 5));
    });

    // Listen for deliveries marked as "delivered"
    socket.on('deliveryUpdated', (deliveryData: Delivery) => { // FIX: Use Delivery type
      console.log('Socket event: deliveryUpdated', deliveryData);
      // Find and update the delivery in our list
      setRecentDeliveries((prevDeliveries) =>
        prevDeliveries.map((d) => (d.id === deliveryData.id ? deliveryData : d)),
      );
    });

    // Clean up listeners
    return () => {
      socket.off('newSale');
      socket.off('deliveryUpdated');
    };
  }, [socket, user]);

  // Conditionally render dashboard based on role
  if (user?.role === 'OWNER') {
    return (
      <div className="space-y-8">
        <h1 className="text-4xl font-bold">Owner Dashboard</h1>

        {/* TODO: Add stats cards for reports */}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="p-6 bg-white rounded-lg shadow">
            <h2 className="text-2xl font-semibold">Recent Sales (Real-time)</h2>
            <ul className="mt-4 space-y-2">
              {recentSales.length > 0 ? (
                recentSales.map((sale) => (
                  <li key={sale.id} className="p-2 border-b">
                    {sale.branch.name} - ${sale.total_amount} (by{' '}
                    {sale.staff.username})
                  </li>
                ))
              ) : (
                <p className="text-gray-500">Waiting for new sales...</p>
              )}
            </ul>
          </div>

          <div className="p-6 bg-white rounded-lg shadow">
            <h2 className="text-2xl font-semibold">Recent Deliveries</h2>
            <ul className="mt-4 space-y-2">
              {recentDeliveries.map((del) => (
                <li key={del.id} className="p-2 border-b">
                  To: {del.branch.name} -{' '}
                  <span
                    className={`font-bold ${
                      del.status === 'DELIVERED'
                        ? 'text-green-600'
                        : 'text-yellow-600'
                    }`}
                  >
                    {del.status}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // You would add "else if" blocks for other roles here
  if (user?.role === 'STAFF') {
    return (
      <h1 className="text-4xl font-bold">
        Staff Dashboard (Branch: {user.branchId})
      </h1>
    );
  }

  if (user?.role === 'FREEZER_VAN') {
    return <h1 className="text-4xl font-bold">Freezer Van Dashboard</h1>;
  }

  if (user?.role === 'LIVE_CHICKEN') {
    return <h1 className="text-4xl font-bold">Live Chicken Dashboard</h1>;
  }

  return null; // Should be covered by layout
}