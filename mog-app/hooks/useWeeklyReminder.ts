import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { Platform } from 'react-native';

const REMINDER_ID = 'weekly-scan-reminder';

async function scheduleWeeklyReminder() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('weekly-reminder', {
      name: 'Weekly Scan Reminder',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return;

  // Don't create a duplicate if already scheduled
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  if (scheduled.some(n => n.identifier === REMINDER_ID)) return;

  // Every Monday at 10:00 AM
  await Notifications.scheduleNotificationAsync({
    identifier: REMINDER_ID,
    content: {
      title: "Weekly scan time",
      body: "Upload a photo to track your progress and update your scores.",
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: 2, // 1 = Sunday, 2 = Monday
      hour: 10,
      minute: 0,
    },
  });
}

export function useWeeklyReminder() {
  useEffect(() => {
    scheduleWeeklyReminder();
  }, []);
}
