import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { apiService } from "../services/api";

const NotificationContext = createContext();

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within NotificationProvider");
  }
  return context;
}

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState({
    posts: 0,
    complaints: 0,
    clubs: 0,
    elections: 0,
  });
  const [lastSeen, setLastSeen] = useState(() => {
    const saved = localStorage.getItem("lastSeenNotifications");
    return saved ? JSON.parse(saved) : {
      posts: Date.now(),
      complaints: Date.now(),
      clubs: Date.now(),
      elections: Date.now(),
    };
  });

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 60000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchNotifications = async () => {
    if (!user) return;

    try {
      const [postsData, complaintsData, clubsData, electionsData] = await Promise.all([
        apiService.getPosts().catch(() => ({ posts: [] })),
        apiService.getComplaints().catch(() => []),
        apiService.getClubs().catch(() => []),
        apiService.getElections().catch(() => ({ elections: [] })),
      ]);

      const posts = Array.isArray(postsData) ? postsData : (postsData.posts || []);
      const complaints = Array.isArray(complaintsData) ? complaintsData : [];
      const clubs = Array.isArray(clubsData) ? clubsData : [];
      const elections = Array.isArray(electionsData) ? electionsData : (electionsData.elections || []);

      const newPostsCount = posts.filter(p =>
        new Date(p.createdAt || p.date).getTime() > lastSeen.posts
      ).length;

      const newComplaintsCount = complaints.filter(c =>
        new Date(c.createdAt || c.submittedAt).getTime() > lastSeen.complaints
      ).length;

      const newClubsCount = clubs.filter(c =>
        new Date(c.createdAt).getTime() > lastSeen.clubs
      ).length;

      const newElectionsCount = elections.filter(e =>
        new Date(e.createdAt).getTime() > lastSeen.elections
      ).length;

      setNotifications({
        posts: newPostsCount,
        complaints: newComplaintsCount,
        clubs: newClubsCount,
        elections: newElectionsCount,
      });
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  };

  const markAsSeen = (type) => {
    const newLastSeen = {
      ...lastSeen,
      [type]: Date.now(),
    };
    setLastSeen(newLastSeen);
    localStorage.setItem("lastSeenNotifications", JSON.stringify(newLastSeen));

    setNotifications(prev => ({
      ...prev,
      [type]: 0,
    }));
  };

  const value = {
    notifications,
    markAsSeen,
    refreshNotifications: fetchNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}
