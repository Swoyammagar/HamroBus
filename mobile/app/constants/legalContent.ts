export type LegalSection = {
  title: string;
  body: string[];
};

export type LegalPageContent = {
  title: string;
  subtitle: string;
  lastUpdated: string;
  sections: LegalSection[];
};

export const legalPages = {
  terms: {
    title: 'Terms & Conditions',
    subtitle: 'Rules for passengers and drivers using Hamro Bus services responsibly and safely.',
    lastUpdated: 'Last updated: May 2026',
    sections: [
      {
        title: '1. Acceptance of Terms',
        body: [
          'By creating an account or using Hamro Bus as a passenger or driver, you agree to follow these Terms & Conditions, our Privacy Policy, and any safety notices shown inside the app.',
          'Hamro Bus may update these terms to reflect service, legal, or safety changes. Continued use of the app after an update means you accept the latest version.',
        ],
      },
      {
        title: '2. Account Responsibilities',
        body: [
          'Passengers must provide accurate name, contact, and pickup information and keep their profile up to date. Drivers must keep their license details, vehicle information, assigned route, and availability status truthful and current.',
          'Your account is personal to you. You must not share login credentials, allow others to use your account, or attempt to access another user\'s account.',
        ],
      },
      {
        title: '3. Seat Bookings and Tickets',
        body: [
          'A booking is confirmed only when the app shows a successful booking confirmation or ticket. Until that point, your seat is not guaranteed.',
          'Please arrive at your selected pickup stop on time and keep your booking token or ticket visible for the driver to verify on boarding.',
          'Seat availability, route timing, and stop details may change due to traffic, delays, or route adjustments. Hamro Bus will attempt to notify you via the app when changes affect your trip.',
        ],
      },
      {
        title: '4. Cancellations and No-Shows',
        body: [
          'Cancellation eligibility and any applicable refunds depend on how close to departure you cancel, the route, and the payment method used.',
          'Repeated fake bookings, late cancellations, or no-shows without notice may restrict your ability to book seats on the platform.',
        ],
      },
      {
        title: '5. Passenger Conduct',
        body: [
          'Passengers must not harass drivers or fellow passengers, attempt to board a bus without a valid booking or ticket, provide false pickup or contact details, or attempt to travel beyond the booked destination without rebooking.',
          'Any abusive, threatening, or unsafe behavior toward drivers or other passengers may result in immediate account suspension.',
        ],
      },
      {
        title: '6. Driver Conduct',
        body: [
          'Drivers must follow all traffic laws, operate only their assigned vehicle, keep to their assigned route and schedule, and treat passengers respectfully at all times.',
          'Drivers must not demand unauthorized cash payments, share passenger booking details outside the app, operate while fatigued or impaired, or abandon an active trip without reporting the issue through the app.',
          'Drivers are responsible for logging passenger counts accurately, including passengers who board without a digital booking.',
        ],
      },
      {
        title: '7. Fares and Payments',
        body: [
          'Fares displayed in the app are based on route pricing at the time of booking. You are responsible for reviewing fare details before confirming.',
          'Payments are processed through authorized payment providers. Hamro Bus stores booking amounts, transaction references, and payment status but does not store card or banking credentials.',
          'If a payment fails but a booking was confirmed, contact support immediately with your booking ID and payment reference.',
        ],
      },
      {
        title: '8. GPS and Live Tracking',
        body: [
          'Live bus tracking uses drivers\' smartphones as GPS sources. This powers the real-time map in the passenger app. Drivers share location only during active trips and may pause sharing during designated breaks.',
          'GPS accuracy depends on device quality, network signal, and environmental conditions. Estimated arrival times (ETA) shown in the app are guidance only and are not guaranteed.',
          'Passenger location is only accessed when you use features such as nearby stop discovery. This data is used in real time and is not stored.',
        ],
      },
      {
        title: '9. Crowd Indicators',
        body: [
          'The crowd-level indicator shows remaining unreserved seats based on the bus\'s registered capacity. It does not account for passengers who board without booking and should be used as guidance only.',
        ],
      },
      {
        title: '10. Reviews and Feedback',
        body: [
          'Only passengers who have completed a verified journey may submit a rating or review for that trip. Reviews must be honest and relevant and must not contain offensive or personally identifying content.',
          'Submitting false or malicious reviews may result in account suspension. Hamro Bus reserves the right to remove reviews that violate these standards.',
        ],
      },
      {
        title: '11. Safety and Disclaimer',
        body: [
          'Hamro Bus supports safer, more transparent bus travel but cannot control road conditions, driver behavior, third-party conduct, weather, or mechanical issues that may affect your journey.',
          'The SOS feature and in-app support are assistance tools. In an emergency, always contact local emergency services directly.',
        ],
      },
      {
        title: '12. Account Suspension',
        body: [
          'Hamro Bus may suspend or permanently close accounts involved in fraud, fake bookings, payment abuse, harassment, document falsification, or other violations of these terms.',
          'You may request account deletion by contacting support. Personal data will be handled per our Privacy Policy after deletion.',
        ],
      },
      {
        title: '13. Contact',
        body: [
          'For booking, payment, safety, or account issues, contact support@hamrobus.com or call +977-9800000000. Include your registered phone number, trip date, route, booking ID, and screenshots when available.',
        ],
      },
    ],
  },

  privacy: {
    title: 'Privacy Policy',
    subtitle: 'How Hamro Bus collects, uses, protects, and shares your data.',
    lastUpdated: 'Last updated: May 2026',
    sections: [
      {
        title: '1. Who We Are',
        body: [
          'Hamro Bus is a digital public bus tracking and booking platform operated by Laganeshwor Mahadev Pvt. Ltd., Lalitpur, Nepal.',
          'This Privacy Policy applies to all passengers and drivers using the Hamro Bus mobile app. By registering or using the app, you consent to the data practices described here, in accordance with Nepal\'s Privacy Act 2075 and the Electronic Transactions Act 2063.',
        ],
      },
      {
        title: '2. Data We Collect — Passengers',
        body: [
          'We collect your full name, phone number, email address, optional profile photo, account credentials, and notification preferences when you register.',
          'We also collect booking history, trip records, selected routes and stops, payment status and references, feedback and ratings you submit, and support requests you raise.',
        ],
      },
      {
        title: '3. Data We Collect — Drivers',
        body: [
          'We collect your full name, phone number, email address, driver\'s license number and document image, assigned vehicle and route details, duty status, and trip activity records.',
          'We collect real-time GPS location from your device during active trips to power the live tracking map. Location sharing starts when you begin a trip and stops when the trip ends or is paused.',
        ],
      },
      {
        title: '4. How We Use Your Data',
        body: [
          'Passenger data is used to manage your account, confirm and display seat bookings, send trip alerts and delay notifications, show crowd indicators, process feedback, and provide customer support.',
          'Driver data is used to display live bus location on the passenger map, coordinate trip start and end, verify schedule adherence, process SOS alerts, and support trip history review.',
          'We may analyze anonymized and aggregated usage data to improve route planning and app performance. This analysis does not identify individual users.',
        ],
      },
      {
        title: '5. Location Data',
        body: [
          'Driver GPS location is collected only while a trip is active. Drivers may pause location sharing during breaks using the in-app pause control. Location sharing ends automatically when a trip is closed.',
          'Passenger location is only used when you actively use location-based features like nearby stop search. It is processed in real time and is not stored on our servers.',
          'We do not build personal movement profiles or share location data with advertisers.',
        ],
      },
      {
        title: '6. Payments',
        body: [
          'Payment transactions are handled through authorized third-party payment providers. Hamro Bus stores your booking amount, transaction reference, and payment status.',
          'We do not store full card numbers, banking credentials, or wallet PINs inside the Hamro Bus app.',
        ],
      },
      {
        title: '7. Sharing Your Data',
        body: [
          'We do not sell your personal data. We do not use your data for advertising.',
          'Your data may be shared only as needed with: payment processors to complete transactions; cloud infrastructure providers that host our backend; notification services such as Firebase Cloud Messaging to deliver alerts; and law enforcement or regulators when required by Nepalese law.',
          'Passengers can see a driver\'s first name and vehicle number during an active trip. Drivers can see passenger booking tokens for verification. Neither party has access to the other\'s full personal details.',
        ],
      },
      {
        title: '8. Data Security',
        body: [
          'We protect your data using encrypted data transmission between the app and our servers, hashed storage of account passwords, and role-based access controls that limit what each user type can see.',
          'You are responsible for keeping your login credentials private and reporting any suspicious account activity to support@hamrobus.com promptly.',
        ],
      },
      {
        title: '9. Data Retention',
        body: [
          'Account and profile data is kept for as long as your account is active. Booking records and trip logs are retained for at least 12 months to support dispute resolution and legal compliance.',
          'If you request account deletion, personal data will be removed from active systems within 30 days, except data we are legally required to retain for financial, safety, or legal reasons.',
        ],
      },
      {
        title: '10. Your Rights',
        body: [
          'Under Nepal\'s Privacy Act 2075, you have the right to access the personal data we hold about you, request corrections, withdraw consent for optional features such as location access, and request account deletion.',
          'To exercise these rights, contact privacy@hamrobus.com with your registered phone number or email for verification.',
        ],
      },
      {
        title: '11. Contact',
        body: [
          'For privacy questions or data requests, contact privacy@hamrobus.com or support@hamrobus.com. Include your registered contact details so we can verify and respond to your request.',
        ],
      },
    ],
  },

  about: {
    title: 'About Hamro Bus',
    subtitle: 'Smarter bus travel for passengers and drivers across Nepal.',
    lastUpdated: 'Platform overview: May 2026',
    sections: [
      {
        title: 'Why Hamro Bus',
        body: [
          'Getting around Kathmandu by bus has always meant uncertainty — no way to know when the bus is coming, which route to take, or whether a seat will be available. Hamro Bus was built to change that.',
          'By using drivers\' existing smartphones as GPS sources and a lightweight cloud backend, we deliver real-time tracking, seat booking, and trip alerts without requiring expensive hardware — making it practical for the private bus operators who run most of the city\'s routes.',
        ],
      },
      {
        title: 'For Passengers',
        body: [
          'The Hamro Bus passenger app lets you see exactly where your bus is on a live map, check estimated arrival times, browse available routes and stops, and book a seat in advance from your phone.',
          'Once you\'ve booked, you receive a digital token that the driver scans at boarding. Crowd-level indicators let you pick a less busy bus when options are available. After your trip, you can rate the journey and leave feedback to help improve the service.',
          'Push notifications keep you informed of delays, detours, or cancellations so you\'re never left waiting without a reason.',
        ],
      },
      {
        title: 'For Drivers',
        body: [
          'The Hamro Bus driver app is designed to be simple and practical on the road. Log in, start your trip, and your location is automatically shared — no complex setup required.',
          'You can view your schedule and assigned route, log passenger counts, pause location sharing during breaks, and access your trip history. If something goes wrong, the SOS button sends an immediate alert so help can be coordinated quickly.',
          'Announcements and route updates from the operations team come through the app directly, reducing the need for phone calls during your shift.',
        ],
      },
      {
        title: 'Our Goals',
        body: [
          'Hamro Bus aims to make public bus travel in Nepal more predictable, transparent, and passenger-friendly — starting with Kathmandu, where over 1,500 privately operated buses serve the city daily with little to no digital support.',
          'We believe better information leads to better journeys. Our long-term goal is to support local transport operators in offering more reliable, accountable, and connected bus services across Nepal.',
        ],
      },
      {
        title: 'Contact Us',
        body: [
          'For support, feedback, or route-related questions, reach us at support@hamrobus.com or call +977-9800000000.',
          'Hamro Bus is developed and maintained by Laganeshwor Mahadev Pvt. Ltd., Bhainsepati, Lalitpur, Nepal.',
        ],
      },
    ],
  },
} satisfies Record<'terms' | 'privacy' | 'about', LegalPageContent>;