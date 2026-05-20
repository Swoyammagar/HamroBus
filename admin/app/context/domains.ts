import { useAdmin } from './AdminContext';

export type {
  DriverRecord,
  ActionResult as DriverActionResult,
  AdminReviewItem,
  AdminReviewSummary,
  DriverLeaderboardRow
} from '../src/hooks/useAdminDrivers';

export type {
  BusRecord,
  ActionResult as BusActionResult,
} from '../src/hooks/useAdminBuses';

export type {
  DayOfWeek,
  RouteStop,
  StopArrivalRecord,
  ScheduleRecord,
  RouteRecord,
  ActionResult as RouteActionResult,
} from '../src/hooks/useAdminRoutes';

export type {
  NotificationAudience,
  NotificationRecord,
  NotificationType,
  NotificationSeverity,
  ActionResult as NotificationActionResult,
} from '../src/hooks/useAdminNotifications';

export type { FAQRecord, FAQRole, FAQPagination, FAQListResponse, FAQFilters, ActionResult as FAQActionResult } from '../src/hooks/useAdminFAQs';

export type { PassengerSummary, ReviewItem, BookingHistoryItem, PassengerDetail } from '../src/hooks/useAdminPassengers';

export const useDriver = () => {
  const { driver } = useAdmin();
  return driver;
};

export const useBus = () => {
  const { bus } = useAdmin();
  return bus;
};

export const useRoute = () => {
  const { route } = useAdmin();
  return route;
};

export const useNotification = () => {
  const { notification } = useAdmin();
  return notification;
};

export const useAdminFAQs = () => {
  const { faq } = useAdmin();
  return faq;
}

export const useAdminPassengers = () => {
  const { passenger } = useAdmin();
  return passenger;
}