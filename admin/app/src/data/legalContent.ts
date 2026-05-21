export type LegalPageKey = 'terms' | 'privacy' | 'about';

export type LegalPageContent = {
  title: string;
  subtitle: string;
  lastUpdated: string;
  sections: {
    title: string;
    body: string[];
  }[];
};

export const legalPages: Record<LegalPageKey, LegalPageContent> = {
  terms: {
    title: 'Terms & Conditions',
    subtitle:
      'By using HamroBus, you agree to these terms governing bookings, payments, driver conduct, and platform use.',
    lastUpdated: 'Last updated: May 2026',
    sections: [
      {
        title: '1. Acceptance of Terms',
        body: [
          'By registering or using the HamroBus passenger app, driver app, or admin dashboard, you agree to be bound by these Terms and Conditions. If you do not agree, you must not use the platform.',
          'HamroBus is operated by Laganeshwor Mahadev Pvt. Ltd. and is designed for use within Nepal. These terms are governed by applicable Nepalese law, including the Privacy Act 2075 and the Electronic Transactions Act 2063.',
        ],
      },
      {
        title: '2. User Accounts and Responsibilities',
        body: [
          'All users — passengers, drivers, and administrators — must register with accurate personal information including name, phone number, and email. You are responsible for maintaining the confidentiality of your login credentials and for all activity under your account.',
          'Passengers must not create fake or duplicate bookings, share account access with others, provide false pickup or contact details, or attempt to bypass the fare or booking system.',
          'Drivers must keep their profile information current, including license details, assigned vehicle, route, and duty status. Drivers must not misrepresent their location, abandon assigned trips without reporting, or operate under impairment.',
          'Administrators are responsible for the accuracy of fleet, route, schedule, and driver data entered into the dashboard. Admin accounts must not be shared or accessed by unauthorized personnel.',
        ],
      },
      {
        title: '3. Seat Bookings and Cancellations',
        body: [
          'A seat booking is confirmed only when the system issues a booking token or confirmation screen. Until that point, seat availability is not guaranteed. Seat capacity is determined by the total registered capacity of each bus minus already reserved seats.',
          'Booking details — including route, departure time, and seat number — are subject to change due to operational requirements, route adjustments, traffic conditions, or safety needs. HamroBus will attempt to notify affected passengers via push notification.',
          'Cancellation and refund eligibility depends on the timing of cancellation, the route operator\'s policy, and the payment method used. Repeated no-shows or fraudulent booking patterns may result in temporary or permanent suspension of booking privileges.',
        ],
      },
      {
        title: '4. Driver Conduct and Obligations',
        body: [
          'Drivers must follow all applicable traffic laws, adhere to their assigned route and schedule, and operate only the vehicle assigned to them by the administrator.',
          'Drivers must use the HamroBus driver app to share live location during active trips. Location sharing must not be paused except during designated breaks. Drivers must use the SOS button to report accidents, breakdowns, or emergencies immediately.',
          'Drivers must not demand payments beyond the displayed fare, share passenger data outside the platform, continue operating when fatigued or unwell, or accept passengers beyond the registered bus capacity.',
          'Drivers are responsible for logging passenger count accurately, particularly for passengers who board without a digital reservation.',
        ],
      },
      {
        title: '5. Real-Time Tracking and GPS',
        body: [
          'HamroBus uses drivers\' smartphones as GPS sources to provide live bus location data to passengers and administrators. Tracking is active only during trips and is used exclusively for operational and safety purposes.',
          'GPS accuracy depends on device quality, network connectivity, and environmental conditions. HamroBus does not guarantee the precision of arrival time estimates (ETA) and these should be treated as guidance rather than guaranteed times.',
          'Passengers consent to their approximate pickup location being used to assist driver coordination. This data is not stored beyond the duration of the trip.',
        ],
      },
      {
        title: '6. Payments and Fares',
        body: [
          'Fares displayed in the app are based on route and operator pricing at the time of booking. HamroBus reserves the right to update fare information as operator pricing changes.',
          'Payment transactions are processed through integrated payment providers. HamroBus stores booking amounts, transaction references, and payment status but does not store sensitive card credentials.',
          'In the event of a failed payment where a booking was confirmed, users must contact support with the booking ID and payment reference. Unauthorized chargebacks or payment disputes may result in account suspension pending investigation.',
        ],
      },
      {
        title: '7. Crowd Indicators and Capacity',
        body: [
          'The crowd-level indicator shown in the passenger app reflects the number of unreserved seats remaining based on the bus\'s registered capacity. It does not account for passengers who board without booking.',
          'HamroBus does not guarantee that a bus will have available standing or unreserved seats. The indicator is informational and should not be solely relied upon for journey planning.',
        ],
      },
      {
        title: '8. Reviews, Feedback, and Ratings',
        body: [
          'Only passengers who have completed a verified journey may submit feedback or ratings for a trip or driver. Reviews must be honest, relevant, and must not contain offensive, discriminatory, or personally identifying content.',
          'HamroBus reserves the right to remove reviews that violate these standards. Administrators are responsible for reviewing flagged feedback fairly and must not take action against drivers based on a single or unverified review.',
          'Submitting false, malicious, or targeted reviews may result in account suspension.',
        ],
      },
      {
        title: '9. Service Availability and Liability',
        body: [
          'HamroBus aims to provide continuous service but does not guarantee uninterrupted access. The platform may be unavailable due to maintenance, server issues, or network disruptions.',
          'HamroBus is a coordination and information platform. It is not a transport operator and is not liable for delays, accidents, theft, injury, or loss occurring during a journey. Road travel carries inherent risks outside the control of the platform.',
          'HamroBus is not liable for losses arising from GPS inaccuracies, missed buses due to app errors, or service changes made by private bus operators.',
        ],
      },
      {
        title: '10. Account Suspension and Termination',
        body: [
          'HamroBus may suspend or permanently terminate accounts involved in fraud, document falsification, payment abuse, harassment, repeated policy violations, or any activity that compromises the safety and integrity of the platform.',
          'Users may request account deletion by contacting support. Upon deletion, personal data will be handled in accordance with the Privacy Policy and applicable data retention obligations.',
        ],
      },
      {
        title: '11. Contact',
        body: [
          'For support, disputes, or questions regarding these terms, contact us at support@hamrobus.com or call +977-9800000000. Please include your booking ID, route, date of travel, and any relevant screenshots when raising an issue.',
        ],
      },
    ],
  },

  privacy: {
    title: 'Privacy Policy',
    subtitle:
      'This policy explains what data HamroBus collects from passengers, drivers, and admins — and how it is used, protected, and retained.',
    lastUpdated: 'Last updated: May 2026',
    sections: [
      {
        title: '1. Who We Are',
        body: [
          'HamroBus is a digital public bus tracking and management system operated by Laganeshwor Mahadev Pvt. Ltd., based in Lalitpur, Nepal. We operate a passenger mobile app, a driver mobile app, and an admin web dashboard.',
          'This Privacy Policy applies to all users of these platforms. By registering or using any part of HamroBus, you consent to the data practices described below, in accordance with Nepal\'s Privacy Act 2075 (2018) and the Electronic Transactions Act 2063 (2006).',
        ],
      },
      {
        title: '2. Data We Collect',
        body: [
          'From passengers, we collect: full name, phone number, email address, profile photo (optional), account credentials, booking history, trip records, feedback and ratings submitted, and push notification preferences.',
          'From drivers, we collect: full name, phone number, email address, driver\'s license number and document image, assigned route and vehicle details, duty status, real-time GPS location during active trips, trip logs, and SOS incident reports.',
          'From administrators, we collect: account credentials, role and permission settings, and activity logs related to dashboard actions such as route creation, driver assignment, and announcement dispatch.',
          'We also collect technical data such as device type, operating system, app version, and session activity to support app functionality and diagnose errors.',
        ],
      },
      {
        title: '3. How We Use Your Data',
        body: [
          'Passenger data is used to: manage account creation and login, confirm and display seat bookings, send service alerts and delay notifications, display crowd-level indicators, process feedback, and provide customer support.',
          'Driver data is used to: display live bus location on the passenger map, coordinate trip start and end, verify schedule compliance, manage route assignments, process SOS alerts, and evaluate performance through admin analytics.',
          'Location data from driver devices is used exclusively during active trips to power real-time tracking. It is not used for personal surveillance and is not retained beyond the trip session in identifiable form.',
          'Aggregated and anonymized data may be used to improve route planning, analyze service performance, and generate operational reports within the admin dashboard.',
        ],
      },
      {
        title: '4. Data Sharing',
        body: [
          'We do not sell your personal data to third parties or use it for advertising purposes.',
          'Relevant data may be shared with: bus operators and administrators for operational coordination; payment processors to complete and verify transactions; cloud infrastructure providers that host our backend services; push notification services (e.g. Firebase Cloud Messaging) to deliver alerts; and law enforcement or regulatory authorities when required by Nepalese law.',
          'Passengers do not have access to any personally identifying driver information beyond the driver\'s first name and vehicle number during an active trip. Drivers do not have access to passenger personal details beyond what is necessary for trip coordination.',
        ],
      },
      {
        title: '5. Location Data',
        body: [
          'Driver GPS location is collected continuously while a trip is active. Drivers may pause location sharing during designated breaks using the app\'s pause function. Location sharing stops automatically when a trip is ended.',
          'Passenger location is only accessed when a user opts in to features such as "nearby stops" or live map tracking. This data is used in real time and is not stored on our servers.',
          'We do not build personal movement profiles from location data and do not share location data with advertisers.',
        ],
      },
      {
        title: '6. Data Security',
        body: [
          'We use industry-standard security practices to protect your data, including encrypted data transmission between the app and our servers, hashed storage of account credentials, role-based access control to limit data access by user type, and regular security reviews of our backend systems.',
          'Users are responsible for keeping their login credentials private and for reporting suspicious account activity to support@hamrobus.com promptly.',
          'While we take reasonable precautions, no system is completely secure. In the event of a data breach affecting your personal information, we will notify affected users in accordance with applicable Nepalese law.',
        ],
      },
      {
        title: '7. Data Retention',
        body: [
          'Account and profile data is retained for as long as your account is active. Booking records and trip logs are retained for a minimum of 12 months to support dispute resolution, legal compliance, and service auditing.',
          'Driver license documents and verification records are retained for the duration of the driver\'s engagement with the platform and for a period thereafter as required by law.',
          'Upon account deletion request, personal data is removed from active systems within 30 days, except where retention is required for legal, financial, or safety obligations.',
        ],
      },
      {
        title: '8. Your Rights',
        body: [
          'Under Nepal\'s Privacy Act 2075, you have the right to access the personal data we hold about you, request corrections to inaccurate information, request deletion of your account and associated data (subject to retention obligations), and withdraw consent for optional data uses such as location-based features.',
          'To exercise these rights, contact privacy@hamrobus.com with your registered email or phone number for identity verification.',
        ],
      },
      {
        title: '9. Children\'s Privacy',
        body: [
          'HamroBus is not directed at children under the age of 13. We do not knowingly collect personal data from children. If you believe a child has registered on the platform, please contact us at support@hamrobus.com so we can remove the account.',
        ],
      },
      {
        title: '10. Privacy Contact',
        body: [
          'For any privacy-related questions, data access requests, or concerns, please contact: privacy@hamrobus.com or support@hamrobus.com. Include your full name and registered contact details for verification.',
        ],
      },
    ],
  },

  about: {
    title: 'About HamroBus',
    subtitle:
      'A smart, affordable public bus tracking and management system built for Kathmandu and developing cities across Nepal.',
    lastUpdated: 'Platform overview: May 2026',
    sections: [
      {
        title: 'Why HamroBus Exists',
        body: [
          'Public transportation in Kathmandu has long been plagued by unpredictable schedules, no real-time information, poor driver-operator communication, and limited digital infrastructure — particularly for the roughly 1,560 privately operated buses that serve the city daily.',
          'HamroBus was built to solve these problems. Rather than relying on expensive IoT hardware, it uses drivers\' existing smartphones as GPS transmitters and a cloud-based backend to deliver real-time tracking, seat booking, and fleet management — at a fraction of the cost of traditional systems.',
        ],
      },
      {
        title: 'The Passenger App',
        body: [
          'The HamroBus passenger app gives commuters the information they need to travel with confidence. Passengers can view live bus locations on an interactive map, check estimated arrival times, browse available routes and stops, and receive push notifications for delays, detours, or service changes.',
          'The app also supports advance seat reservations, generating a booking token that the driver can verify on boarding. Crowd-level indicators show how full each bus is in real time, based on remaining unreserved seats. After completing a journey, passengers can submit feedback and ratings to help improve service quality.',
        ],
      },
      {
        title: 'The Driver App',
        body: [
          'The driver app is designed to be simple and practical for use on the road. After logging in, drivers automatically begin sharing their live location, powering the map that passengers and administrators see.',
          'Drivers can start and end trips, view their assigned schedule and route, log passenger counts, pause location sharing during breaks, and access their trip history. An in-app SOS button allows drivers to instantly report accidents, breakdowns, or emergencies to the control center.',
          'Schedule reminders and real-time announcements from administrators help drivers stay on time and informed without needing to contact the office directly.',
        ],
      },
      {
        title: 'The Admin Dashboard',
        body: [
          'The admin dashboard is the operational backbone of HamroBus. Transport operators and administrators use it to manage the full fleet — adding and assigning buses and drivers, building and editing routes, setting schedules, and monitoring live trip progress.',
          'The dashboard provides performance analytics based on driver ratings, schedule adherence, and trip history. Administrators can send announcements directly to drivers or passengers, manage SOS incidents in real time, review passenger feedback, and maintain FAQ content for the app.',
          'Centralized tools reduce reliance on phone calls and manual coordination, helping operators respond faster to delays, emergencies, and service changes.',
        ],
      },
      {
        title: 'Our Approach',
        body: [
          'HamroBus is built on the principle that better public transport doesn\'t have to be expensive. By using smartphones instead of dedicated GPS hardware and cloud infrastructure instead of on-premise servers, the system is affordable, scalable, and maintainable for local bus operators.',
          'The platform is developed with Nepalese legal frameworks in mind, including compliance with the Privacy Act 2075 and the Electronic Transactions Act 2063, and is designed with data minimization, role-based access control, and secure communication as core principles — not afterthoughts.',
        ],
      },
      {
        title: 'Technology Stack',
        body: [
          'HamroBus is built using React Native (passenger and driver apps), Express.js (backend API), MongoDB (database), and Leaflet/OpenStreetMap (maps). Version control is managed through GitHub, and project tracking is done via Jira using a Kanban methodology.',
          'The system is deployed on cloud infrastructure and uses Firebase Cloud Messaging for push notifications. All data transmission between client apps and the server uses encrypted channels.',
        ],
      },
      {
        title: 'Contact Us',
        body: [
          'For support, route onboarding inquiries, operator partnerships, or general questions, reach us at support@hamrobus.com or call +977-9800000000.',
          'HamroBus is developed and maintained by Laganeshwor Mahadev Pvt. Ltd., Bhainsepati, Lalitpur, Nepal.',
        ],
      },
    ],
  },
};