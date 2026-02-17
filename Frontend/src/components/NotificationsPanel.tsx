import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import type { AgentNotification } from '../types';

const TYPE_ICONS: Record<string, string> = {
  new_candidate: '👤',
  new_position: '💼',
  missing_info: '⚠️',
  error: '❌',
};

const TYPE_COLORS: Record<string, string> = {
  new_candidate: 'bg-green-50 border-green-200',
  new_position: 'bg-blue-50 border-blue-200',
  missing_info: 'bg-yellow-50 border-yellow-200',
  error: 'bg-red-50 border-red-200',
};

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export default function NotificationsPanel() {
  const [notifications, setNotifications] = useState<AgentNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);

  const fetchNotifications = async () => {
    try {
      const data = await api.getNotifications('pending');
      // Only show new_candidate and new_position notifications
      const filtered = (data as AgentNotification[]).filter(
        (n) => n.type === 'new_candidate' || n.type === 'new_position'
      );
      setNotifications(filtered);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkReviewed = async (id: number) => {
    try {
      await api.updateNotification(id, 'reviewed');
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      // Notify Layout to update badge count
      window.dispatchEvent(new CustomEvent('notifications-changed'));
    } catch (err) {
      console.error('Failed to mark notification as reviewed:', err);
    }
  };

  if (loading) return null;

  return (
    <div className="mb-6">
      <div
        className="flex items-center justify-between cursor-pointer p-3 bg-purple-50 border border-purple-200 rounded-t-lg"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <span className="text-purple-600 font-medium">Agent Notifications</span>
          {notifications.length > 0 && (
            <span className="bg-purple-600 text-white text-xs px-2 py-0.5 rounded-full">
              {notifications.length}
            </span>
          )}
        </div>
        {notifications.length > 0 && (
          <svg
            className={`w-5 h-5 text-purple-600 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="border border-t-0 border-purple-200 rounded-b-lg p-4 bg-gray-50 text-center text-sm text-gray-500">
          No pending notifications
        </div>
      ) : expanded && (
        <div className="border border-t-0 border-purple-200 rounded-b-lg divide-y divide-gray-100">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 ${TYPE_COLORS[notification.type] || 'bg-gray-50'}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="text-xl">{TYPE_ICONS[notification.type] || '📋'}</span>
                  <div>
                    <p className="text-sm text-gray-800">{notification.summary}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatTimeAgo(notification.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {notification.candidateId && (
                    <Link
                      to="/candidates"
                      className="text-xs px-3 py-1.5 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                    >
                      View Candidate
                    </Link>
                  )}
                  {notification.positionId && (
                    <Link
                      to="/positions"
                      className="text-xs px-3 py-1.5 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                    >
                      View Position
                    </Link>
                  )}
                  <button
                    onClick={() => handleMarkReviewed(notification.id)}
                    className="text-xs px-3 py-1.5 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors"
                  >
                    Mark Done
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
